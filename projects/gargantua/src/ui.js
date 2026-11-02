/**
 * GARGANTUA — HUD and controls.
 *
 * One module owns the whole instrument layer: the masthead telemetry, the
 * parameter spine generated from PARAM_DEFS, the view / quality / debug dock,
 * the camera readout, the action row, the shortcut reference and the fatal
 * error card.
 *
 * The public contract is exactly what main.js expects:
 *   createUI({ store, canvas }) → { showError, hideError, setReady,
 *   updateStats, updateCamera, updateQuality, updateDebug, syncFromState,
 *   setView, destroy }
 *
 * All rendering is progressive: the canvas keeps rendering while the HUD is
 * hidden, and every shortcut works without touching a pointer.
 */
import {
  PARAM_DEFS,
  QUALITY_LEVELS,
  DEBUG_VIEWS,
  VIEW_PRESETS,
  VIEW_BY_ID,
  SHORTCUTS,
} from './state.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const READOUT_FIELDS = [
  ['camera', 'Camera'],
  ['preset', 'Preset'],
  ['radius', 'Radius'],
  ['polar', 'Polar'],
  ['azimuth', 'Azimuth'],
  ['time', 'Time'],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function formatNumber(definition, value) {
  const digits = Number.isFinite(definition.digits) ? definition.digits : 2;
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '—';
}

function fillPercent(definition, value) {
  const span = definition.max - definition.min;
  if (!(span > 0)) return 0;
  return clamp(((Number(value) - definition.min) / span) * 100, 0, 100);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isEditableTarget(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.isContentEditable) return true;
  const tag = node.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = String(node.type || 'text').toLowerCase();
  return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file'].includes(type);
}

export function createUI({ store, canvas }) {
  const doc = document;
  const root = doc.documentElement;
  const listeners = [];

  const el = {
    hud: doc.querySelector('#hud'),
    panel: doc.querySelector('#panel'),
    panelToggle: doc.querySelector('#panel-toggle'),
    params: doc.querySelector('#params'),
    presets: doc.querySelector('#view-buttons'),
    quality: doc.querySelector('#quality-buttons'),
    debug: doc.querySelector('#debug-buttons'),
    debugLabel: doc.querySelector('#debug-label'),
    telemetry: doc.querySelector('#telemetry'),
    cameraReadout: doc.querySelector('#camera-readout'),
    error: doc.querySelector('#error'),
    errorTitle: doc.querySelector('#error-title'),
    errorMessage: doc.querySelector('#error-message'),
    errorDetail: doc.querySelector('#error-detail'),
    errorAction: doc.querySelector('#error-action'),
    errorClose: doc.querySelector('#error-close'),
    help: doc.querySelector('#help'),
    helpList: doc.querySelector('#help-list'),
    helpClose: doc.querySelector('#help-close'),
    audioButton: doc.querySelector('#audio-button'),
    shotButton: doc.querySelector('#shot-button'),
    helpButton: doc.querySelector('#help-button'),
    resetButton: doc.querySelector('#reset-button'),
    hint: doc.querySelector('#hint'),
  };

  function on(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    listeners.push([target, type, handler, options]);
  }

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function setAttr(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  /**
   * Write "12.34" plus an optional unit. The Schwarzschild unit is drawn with
   * a real <sub> so it never falls back to a comma-like glyph.
   */
  function writeMeasure(node, text, unit) {
    if (!node) return;
    node.textContent = text;
    if (!unit) return;
    node.append(' ');
    if (unit === 'rₛ') {
      node.append('r');
      const sub = doc.createElement('sub');
      sub.textContent = 's';
      node.append(sub);
      return;
    }
    node.append(unit);
  }

  // ── shortcuts reference ─────────────────────────────────────────────
  if (el.helpList) {
    for (const [keys, description] of SHORTCUTS) {
      const row = doc.createElement('div');
      row.className = 'help__row';
      const key = doc.createElement('span');
      key.className = 'help__keys';
      key.textContent = keys;
      const desc = doc.createElement('span');
      desc.className = 'help__desc';
      desc.textContent = description;
      row.append(key, desc);
      el.helpList.append(row);
    }
  }

  // ── parameter spine, generated from the single source of truth ──────
  const inputs = new Map();
  const groupCounts = new Map();

  if (el.params) {
    for (const definition of PARAM_DEFS) {
      let group = groupCounts.get(definition.group);
      if (!group) {
        const section = doc.createElement('section');
        section.className = 'param-group';
        section.dataset.group = definition.group;
        const heading = doc.createElement('h3');
        heading.className = 'param-group__title';
        const name = doc.createElement('span');
        name.textContent = definition.group;
        const count = doc.createElement('span');
        count.className = 'param-group__count';
        heading.append(name, count);
        section.append(heading);
        el.params.append(section);
        group = { section, count };
        groupCounts.set(definition.group, group);
      }

      const row = doc.createElement('label');
      row.className = 'param';
      row.htmlFor = `param-${definition.id}`;

      const head = doc.createElement('span');
      head.className = 'param__head';
      const name = doc.createElement('span');
      name.className = 'param__name';
      name.textContent = definition.label;
      const output = doc.createElement('output');
      output.className = 'param__value';
      output.setAttribute('for', `param-${definition.id}`);
      writeMeasure(output, formatNumber(definition, definition.def), definition.unit);
      head.append(name, output);

      const input = doc.createElement('input');
      input.type = 'range';
      input.id = `param-${definition.id}`;
      input.min = String(definition.min);
      input.max = String(definition.max);
      input.step = String(definition.step);
      input.value = String(definition.def);
      input.dataset.param = definition.id;
      input.setAttribute('aria-label', definition.label);
      input.style.setProperty('--fill', `${fillPercent(definition, definition.def)}%`);

      on(input, 'input', () => {
        store.setParam(definition.id, Number(input.value));
      });

      row.append(head, input);
      group.section.append(row);
      inputs.set(definition.id, { input, output, definition });
    }

    for (const [name, group] of groupCounts) {
      const count = PARAM_DEFS.filter((definition) => definition.group === name).length;
      group.count.textContent = pad2(count);
    }
  }

  function renderParam(id, value) {
    const entry = inputs.get(id);
    if (!entry) return;
    entry.input.value = String(value);
    entry.input.style.setProperty('--fill', `${fillPercent(entry.definition, value)}%`);
    writeMeasure(entry.output, formatNumber(entry.definition, value), entry.definition.unit);
  }

  // ── dock: view presets / quality tiers / debug keys ─────────────────
  const presetButtons = [];
  const qualityButtons = [];
  const debugButtons = [];

  function buildButton({ parent, className, text, title, dataset }) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    if (title) button.title = title;
    for (const [key, value] of Object.entries(dataset)) button.dataset[key] = value;
    parent.append(button);
    return button;
  }

  if (el.presets) {
    for (const preset of VIEW_PRESETS) {
      const button = buildButton({
        parent: el.presets,
        className: '',
        text: preset.label,
        title: `${preset.note} · ${preset.radius} rₛ · ${preset.polar}° polar`,
        dataset: { view: preset.id },
      });
      button.setAttribute('aria-pressed', 'false');
      on(button, 'click', () => triggerView(preset.id));
      presetButtons.push(button);
    }
  }

  if (el.quality) {
    for (const level of QUALITY_LEVELS) {
      const button = buildButton({
        parent: el.quality,
        className: '',
        text: level.label,
        title: level.note,
        dataset: { quality: level.id },
      });
      button.setAttribute('aria-pressed', 'false');
      on(button, 'click', () => store.setQuality(level.id));
      qualityButtons.push(button);
    }
  }

  if (el.debug) {
    for (const view of DEBUG_VIEWS) {
      const button = buildButton({
        parent: el.debug,
        className: '',
        text: view.key,
        title: `${view.id} · ${view.label} — ${view.hint}`,
        dataset: { debug: String(view.id) },
      });
      button.setAttribute('aria-label', `${view.id}: ${view.label}`);
      button.setAttribute('aria-pressed', 'false');
      on(button, 'click', () => store.setDebug(view.id));
      debugButtons.push(button);
    }
  }

  // ── bottom camera readout ───────────────────────────────────────────
  const readout = {};
  if (el.cameraReadout) {
    for (const [key, label] of READOUT_FIELDS) {
      const cell = doc.createElement('div');
      const term = doc.createElement('dt');
      term.textContent = label;
      const value = doc.createElement('dd');
      value.dataset.readout = key;
      value.textContent = '—';
      cell.append(term, value);
      el.cameraReadout.append(cell);
      readout[key] = value;
    }
  }

  // ── state → DOM ─────────────────────────────────────────────────────
  function applyHud(visible) {
    root.dataset.hud = visible ? 'visible' : 'hidden';
  }

  function applyPanel(open) {
    root.dataset.panel = open ? 'open' : 'closed';
    setAttr(el.panelToggle, 'aria-expanded', String(open));
  }

  function setHud(visible) {
    applyHud(visible);
    store.setHud(visible);
  }

  function setPanel(open) {
    applyPanel(open);
    store.setPanel(open);
  }

  function setView(id) {
    const preset = VIEW_BY_ID[id];
    if (!preset) return;
    for (const button of presetButtons) {
      const active = button.dataset.view === id;
      button.classList.toggle('is-active', active);
      setAttr(button, 'aria-pressed', String(active));
    }
    setText(readout.camera, 'MANUAL');
    setText(readout.preset, preset.label);
  }

  /** Route through the public API so the camera rig, store and HUD agree. */
  function triggerView(id) {
    const api = window.__GARGANTUA__;
    if (api && typeof api.setView === 'function') {
      api.setView(id);
      return;
    }
    setView(id);
    store.setCameraPreset(id);
  }

  function applyQuality(id) {
    root.dataset.quality = id;
    for (const button of qualityButtons) {
      const active = button.dataset.quality === id;
      button.classList.toggle('is-active', active);
      setAttr(button, 'aria-pressed', String(active));
    }
    const level = QUALITY_LEVELS.find((entry) => entry.id === id);
    if (level) setText(metrics.get('quality'), level.label);
  }

  function applyDebug(id) {
    root.dataset.debug = String(id);
    for (const button of debugButtons) {
      const active = Number(button.dataset.debug) === id;
      button.classList.toggle('is-active', active);
      setAttr(button, 'aria-pressed', String(active));
    }
    const view = DEBUG_VIEWS[id];
    if (el.debugLabel) {
      const index = el.debugLabel.querySelector('.dock__debug-index');
      const name = el.debugLabel.querySelector('.dock__debug-name');
      const hint = el.debugLabel.querySelector('.dock__debug-hint');
      setText(index, view ? String(view.id) : String(id));
      setText(name, view?.label ?? '');
      setText(hint, view?.hint ?? '');
    }
  }

  function applyAudio(enabled) {
    root.dataset.audio = enabled ? 'on' : 'off';
    el.audioButton?.classList.toggle('is-active', enabled);
    setAttr(el.audioButton, 'aria-pressed', String(enabled));
  }

  function applyMotion(running) {
    setText(readout.time, running ? 'LIVE' : 'HOLD');
  }

  function syncCameraFromState(camera) {
    if (!camera) return;
    setText(readout.camera, camera.mode === 'cinematic' ? 'CINEMATIC' : 'MANUAL');
    const preset = VIEW_BY_ID[camera.preset];
    setText(readout.preset, preset ? preset.label : String(camera.preset || '—').toUpperCase());
  }

  function syncFromState(state) {
    for (const [id, entry] of inputs) renderParam(id, state.params[id] ?? entry.definition.def);
    applyQuality(state.quality);
    applyDebug(state.debug);
    applyHud(state.hud);
    applyPanel(state.panel);
    applyAudio(state.audio);
    applyMotion(state.motion);
    syncCameraFromState(state.camera);
    for (const button of presetButtons) {
      const active = button.dataset.view === state.camera?.preset;
      button.classList.toggle('is-active', active);
      setAttr(button, 'aria-pressed', String(active));
    }
    writeMeasure(readout.radius, Number(state.camera?.radius ?? 0).toFixed(2), 'rₛ');
    setText(readout.polar, `${Number(state.camera?.polar ?? 0).toFixed(1)}°`);
    setText(readout.azimuth, `${Number(state.camera?.azimuth ?? 0).toFixed(1)}°`);
    updateScrollCue();
  }  // ── live telemetry (≈5 Hz from main.js) ─────────────────────────────
  const metrics = new Map();
  if (el.telemetry) {
    for (const row of el.telemetry.querySelectorAll('[data-metric]')) {
      const value = row.querySelector('dd');
      if (value) metrics.set(row.dataset.metric, value);
    }
  }

  function updateStats(stats) {
    if (!stats) return;
    // main.js reports fps/frameMs only once a measurement window has closed.
    const measured = Number(stats.fps) > 0 && Number(stats.frameMs) > 0;
    setText(metrics.get('fps'), measured ? String(Math.round(stats.fps)) : '—');
    setText(metrics.get('frame'), measured ? `${Number(stats.frameMs).toFixed(1)} ms` : '—');
    setText(metrics.get('quality'), String(stats.quality || store.state.quality).toUpperCase());
    setText(metrics.get('render'), `${Number(stats.width) || 0} × ${Number(stats.height) || 0}`);
    setText(metrics.get('steps'), String(Number(stats.maxSteps) || 0));
    setText(metrics.get('disk'), (Number(stats.crossingsBudget) || 0).toFixed(1));
    setText(metrics.get('dpr'), `${(Number(stats.dpr) || 1).toFixed(2)}×`);
  }

  function updateCamera(snapshot) {
    if (!snapshot) return;
    setText(readout.camera, snapshot.mode === 'cinematic' ? 'CINEMATIC' : 'MANUAL');
    const preset = VIEW_BY_ID[snapshot.preset];
    setText(readout.preset, preset ? preset.label : String(snapshot.preset || '—').toUpperCase());
    writeMeasure(readout.radius, (Number(snapshot.radius) || 0).toFixed(2), 'rₛ');
    setText(readout.polar, `${(Number(snapshot.polar) || 0).toFixed(1)}°`);
    setText(readout.azimuth, `${(Number(snapshot.azimuth) || 0).toFixed(1)}°`);
  }

  function updateQuality(id) {
    applyQuality(id);
  }

  function updateDebug(id) {
    applyDebug(id);
  }

  // ── scroll affordance: 21 sliders can exceed a 900px-tall panel ──────
  let scrollObserver = null;

  function updateScrollCue() {
    if (!el.panel || !el.params) return;
    const overflow = el.params.scrollHeight - el.params.clientHeight;
    if (overflow <= 2) {
      el.panel.dataset.scroll = 'none';
      return;
    }
    el.panel.dataset.scroll = el.params.scrollTop >= overflow - 2 ? 'end' : 'more';
  }

  on(el.params, 'scroll', updateScrollCue, { passive: true });
  if (el.params && typeof ResizeObserver === 'function') {
    scrollObserver = new ResizeObserver(updateScrollCue);
    scrollObserver.observe(el.params);
  }

  // ── overlays ────────────────────────────────────────────────────────
  let errorAction = null;
  let errorReturnFocus = null;
  let helpReturnFocus = null;

  function isOpen(node) {
    return Boolean(node && !node.hidden);
  }

  function trapTab(container, event) {
    const nodes = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null,
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function showError(options = {}) {
    const { title = 'ERROR', message = '', detail = '', actionLabel = '', onAction = null } = options;
    errorAction = typeof onAction === 'function' ? onAction : null;
    if (!el.error) return;
    if (!isOpen(el.error)) {
      errorReturnFocus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    }
    setText(el.errorTitle, title);
    setText(el.errorMessage, message);
    el.errorDetail.textContent = detail || '';
    el.errorDetail.hidden = !detail;
    el.errorAction.hidden = !errorAction;
    setText(el.errorAction, actionLabel || 'Retry');
    el.error.hidden = false;
    root.dataset.errorVisible = 'true';
    (errorAction ? el.errorAction : el.errorClose)?.focus({ preventScroll: true });
  }

  function hideError() {
    errorAction = null;
    if (el.error) el.error.hidden = true;
    delete root.dataset.errorVisible;
    const target = errorReturnFocus;
    errorReturnFocus = null;
    if (target && target.isConnected) target.focus?.({ preventScroll: true });
  }

  function openHelp() {
    if (!el.help) return;
    helpReturnFocus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    el.help.hidden = false;
    setAttr(el.helpButton, 'aria-expanded', 'true');
    el.helpClose?.focus({ preventScroll: true });
  }

  function closeHelp() {
    if (!el.help) return;
    el.help.hidden = true;
    setAttr(el.helpButton, 'aria-expanded', 'false');
    const target = helpReturnFocus;
    helpReturnFocus = null;
    if (target && target.isConnected) {
      target.focus?.({ preventScroll: true });
    } else {
      el.helpButton?.focus({ preventScroll: true });
    }
  }

  function toggleHelp() {
    if (isOpen(el.help)) closeHelp();
    else openHelp();
  }

  on(el.helpButton, 'click', toggleHelp);
  on(el.helpClose, 'click', closeHelp);
  on(el.help, 'click', (event) => {
    if (event.target === el.help) closeHelp();
  });
  on(el.errorClose, 'click', hideError);
  on(el.errorAction, 'click', () => {
    const action = errorAction;
    if (typeof action === 'function') action();
  });

  // ── panel / actions ─────────────────────────────────────────────────
  on(el.panelToggle, 'click', () => setPanel(!(root.dataset.panel === 'open')));
  on(el.resetButton, 'click', () => store.resetParams());

  let flashTimer = 0;

  function toggleAudio() {
    const next = !store.state.audio;
    const api = window.__GARGANTUA__;
    try {
      if (api && typeof api.setAudio === 'function') api.setAudio(next);
      else store.setAudio(next);
    } catch {
      store.setAudio(next);
    }
  }

  on(el.audioButton, 'click', toggleAudio);

  function savePng() {
    const api = window.__GARGANTUA__;
    if (!api || typeof api.screenshot !== 'function') return;
    let data;
    try {
      data = api.screenshot();
    } catch {
      return;
    }
    if (typeof data !== 'string' || !data.startsWith('data:image/')) return;
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+$/, '');
    const link = doc.createElement('a');
    link.href = data;
    link.download = `gargantua-${stamp}.png`;
    link.rel = 'noopener';
    doc.body.append(link);
    link.click();
    link.remove();
    if (el.shotButton) {
      el.shotButton.classList.add('is-flash');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => el.shotButton?.classList.remove('is-flash'), 700);
    }
  }

  on(el.shotButton, 'click', savePng);

  // ── first-load hint ─────────────────────────────────────────────────
  let hintTimer = 0;
  let hintHideTimer = 0;
  let hintFaded = false;

  function fadeHint() {
    if (!el.hint || hintFaded) return;
    hintFaded = true;
    clearTimeout(hintTimer);
    el.hint.classList.add('is-faded');
    clearTimeout(hintHideTimer);
    hintHideTimer = setTimeout(() => {
      if (el.hint) el.hint.hidden = true;
    }, 1300);
  }

  function scheduleHint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(fadeHint, 9000);
  }

  on(window, 'pointerdown', () => fadeHint(), { passive: true });
  on(window, 'keydown', () => fadeHint());

  // ── keyboard shortcuts ──────────────────────────────────────────────
  function overlayOpen() {
    return isOpen(el.error) || isOpen(el.help);
  }

  function onKeydown(event) {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key;

    if (key === 'Escape' || key === 'Esc') {
      if (isOpen(el.error)) {
        event.preventDefault();
        hideError();
      } else if (isOpen(el.help)) {
        event.preventDefault();
        closeHelp();
      }
      return;
    }

    if (overlayOpen()) {
      if (key === 'Tab' && isOpen(el.help)) trapTab(el.help, event);
      else if (key === 'Tab' && isOpen(el.error)) trapTab(el.error, event);
      return;
    }

    if (isEditableTarget(event.target)) return;

    const api = window.__GARGANTUA__;

    if (event.shiftKey && /^[1-4]$/.test(key)) {
      const preset = VIEW_PRESETS[Number(key) - 1];
      if (preset) {
        event.preventDefault();
        triggerView(preset.id);
      }
      return;
    }

    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      store.setDebug(Number(key));
      return;
    }

    if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      store.setMotion(!store.state.motion);
      return;
    }

    switch (key.toLowerCase()) {
      case 'c': {
        event.preventDefault();
        const next = store.state.camera.mode === 'cinematic' ? 'manual' : 'cinematic';
        if (api && typeof api.setCameraMode === 'function') api.setCameraMode(next);
        else store.setCameraMode(next);
        break;
      }
      case 'h':
        event.preventDefault();
        setHud(!(root.dataset.hud === 'visible'));
        break;
      case 'm':
        event.preventDefault();
        toggleAudio();
        break;
      case 'p':
        event.preventDefault();
        savePng();
        break;
      case 'r':
        event.preventDefault();
        store.resetParams();
        break;
      case '?':
        event.preventDefault();
        toggleHelp();
        break;
      default:
        break;
    }
  }

  on(doc, 'keydown', onKeydown);

  // ── ready state ─────────────────────────────────────────────────────
  let readySignalled = false;

  function setReady(value) {
    const ready = Boolean(value);
    root.dataset.ready = ready ? 'true' : 'false';
    if (ready && !readySignalled) {
      readySignalled = true;
      scheduleHint();
    }
  }

  // ── store wiring ────────────────────────────────────────────────────
  const unsubscribe = store.subscribe((change) => {
    switch (change.type) {
      case 'param':
        renderParam(change.id, store.state.params[change.id]);
        break;
      case 'params':
      case 'reset':
      case 'reset-all':
        syncFromState(store.state);
        break;
      case 'quality':
        applyQuality(store.state.quality);
        break;
      case 'debug':
        applyDebug(store.state.debug);
        break;
      case 'hud':
        applyHud(store.state.hud);
        break;
      case 'panel':
        applyPanel(store.state.panel);
        break;
      case 'audio':
        applyAudio(store.state.audio);
        break;
      case 'motion':
        applyMotion(store.state.motion);
        break;
      case 'camera':
        syncCameraFromState(store.state.camera);
        break;
      default:
        break;
    }
  });

  // Canvas is part of the HUD surface: a click on the scene dismisses the hint.
  on(canvas, 'pointerdown', () => fadeHint(), { passive: true });

  syncFromState(store.state);

  // Phones and small tablets start with the parameter sheet folded so the
  // black hole owns first paint. An explicit ?panel=1 from deep-link tooling
  // still wins; the toggle bar stays visible above the dock either way.
  const narrowViewport =
    typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
  if (narrowViewport && store.config?.panel === undefined && store.state.panel) {
    store.setPanel(false);
  }

  return {
    showError,
    hideError,
    setReady,
    updateStats,
    updateCamera,
    updateQuality,
    updateDebug,
    syncFromState,
    setView,
    destroy() {
      unsubscribe();
      scrollObserver?.disconnect();
      clearTimeout(hintTimer);
      clearTimeout(hintHideTimer);
      clearTimeout(flashTimer);
      for (const [target, type, handler, options] of listeners) {
        target.removeEventListener(type, handler, options);
      }
      listeners.length = 0;
    },
  };
}
