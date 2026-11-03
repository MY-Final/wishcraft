/**
 * AQUA PURE — DOM instrumentation.
 *
 * Keeps every piece of UI text and every control state in one place; the
 * renderer only reports phase and water level. No framework, no build step.
 */

const PHASE_COPY = {
  sealed: {
    title: '满瓶 · 未开封',
    sub: 'SEALED · 100% FULL',
    openState: 'SEALED',
    pourState: 'LOCKED',
    openDisabled: false,
    pourDisabled: true,
    pourLabel: '倾斜倒水',
    openBusy: false,
  },
  opening: {
    title: '正在拧开瓶盖',
    sub: 'BREAKING TAMPER RING',
    openState: 'OPENING',
    pourState: 'WAIT',
    openDisabled: true,
    pourDisabled: true,
    pourLabel: '倾斜倒水',
    openBusy: true,
  },
  open: {
    title: '已开封 · 满瓶',
    sub: 'UNSEALED · READY TO POUR',
    openState: 'OPEN',
    pourState: 'READY',
    openDisabled: true,
    pourDisabled: false,
    pourLabel: '倾斜倒水',
    openBusy: false,
  },
  pouring: {
    title: '正在倒水',
    sub: 'POURING · SURFACE STAYS LEVEL',
    openState: 'OPEN',
    pourState: 'POURING',
    openDisabled: true,
    pourDisabled: false,
    pourLabel: '停止倒水',
    openBusy: false,
  },
  returning: {
    title: '正在扶正瓶身',
    sub: 'RETURNING TO UPRIGHT',
    openState: 'OPEN',
    pourState: 'RETURN',
    openDisabled: true,
    pourDisabled: true,
    pourLabel: '倾斜倒水',
    openBusy: false,
  },
  empty: {
    title: '空瓶 · 已倒尽',
    sub: 'EMPTY · 0 ML',
    openState: 'OPEN',
    pourState: 'EMPTY',
    openDisabled: true,
    pourDisabled: true,
    pourLabel: '倾斜倒水',
    openBusy: false,
  },
};

export function createUI(handlers = {}) {
  const root = document.documentElement;
  const el = {
    statusTitle: document.querySelector('#status-title'),
    statusSub: document.querySelector('#status-sub'),
    statusValue: document.querySelector('#status-value'),
    gaugeFill: document.querySelector('#gauge-fill'),
    btnOpen: document.querySelector('#btn-open'),
    btnPour: document.querySelector('#btn-pour'),
    btnReset: document.querySelector('#btn-reset'),
    btnSettings: document.querySelector('#btn-settings'),
    openState: document.querySelector('#open-state'),
    pourState: document.querySelector('#pour-state'),
    pourLabel: document.querySelector('#pour-label'),
    resetState: document.querySelector('#reset-state'),
    params: document.querySelector('#params'),
    paramsClose: document.querySelector('#params-close'),
    exposure: document.querySelector('#exposure'),
    exposureValue: document.querySelector('#exposure-value'),
    environment: document.querySelector('#environment'),
    envValue: document.querySelector('#env-value'),
    fill: document.querySelector('#fill'),
    fillValue: document.querySelector('#fill-value'),
    autorotate: document.querySelector('#autorotate'),
    toast: document.querySelector('#toast'),
    loader: document.querySelector('#loader'),
    loaderBar: document.querySelector('#loader-bar'),
    error: document.querySelector('#error'),
  };

  let toastTimer = 0;
  let lastRoundedFill = -1;
  let phase = 'sealed';

  el.btnOpen.addEventListener('click', () => handlers.openCap?.());
  el.btnPour.addEventListener('click', () => handlers.togglePour?.());
  el.btnReset.addEventListener('click', () => handlers.reset?.());

  el.btnSettings.addEventListener('click', () => {
    const open = el.params.hidden;
    el.params.hidden = !open;
    el.btnSettings.setAttribute('aria-expanded', String(open));
  });
  el.paramsClose.addEventListener('click', () => {
    el.params.hidden = true;
    el.btnSettings.setAttribute('aria-expanded', 'false');
  });

  el.exposure.addEventListener('input', () => {
    const value = Number(el.exposure.value);
    el.exposureValue.textContent = value.toFixed(2);
    handlers.exposure?.(value);
  });
  el.environment.addEventListener('input', () => {
    const value = Number(el.environment.value);
    el.envValue.textContent = value.toFixed(2);
    handlers.environment?.(value);
  });
  el.fill.addEventListener('input', () => {
    const value = Number(el.fill.value);
    el.fillValue.textContent = `${value}%`;
    handlers.fill?.(value / 100);
  });
  el.autorotate.addEventListener('change', () => {
    handlers.autoRotate?.(el.autorotate.checked);
  });

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'o' || event.key === 'O') handlers.openCap?.();
    if (event.key === 'p' || event.key === 'P') handlers.togglePour?.();
    if (event.key === 'r' || event.key === 'R') handlers.reset?.();
    if (event.key === 'Escape') {
      el.params.hidden = true;
      el.btnSettings.setAttribute('aria-expanded', 'false');
    }
  });

  function setPhase(next, { fill = 1 } = {}) {
    phase = next;
    const copy = PHASE_COPY[next] ?? PHASE_COPY.sealed;
    root.dataset.phase = next;
    el.statusTitle.textContent = copy.title;
    el.statusSub.textContent = copy.sub;
    el.btnOpen.disabled = copy.openDisabled;
    el.btnPour.disabled = copy.pourDisabled;
    el.btnOpen.classList.toggle('is-busy', copy.openBusy);
    el.openState.textContent = copy.openState;
    el.pourState.textContent = copy.pourState;
    el.pourLabel.textContent = copy.pourLabel;
    el.btnPour.classList.toggle('is-busy', next === 'pouring');
    el.btnReset.classList.remove('is-busy');
    el.resetState.textContent = 'READY';
    el.fill.value = String(Math.round(fill * 100));
    el.fillValue.textContent = `${Math.round(fill * 100)}%`;
  }

  function setWater(fill, ml) {
    const pct = Math.round(Math.max(0, Math.min(1, fill)) * 100);
    if (pct !== lastRoundedFill) {
      lastRoundedFill = pct;
      el.gaugeFill.style.width = `${pct}%`;
      el.gaugeFill.classList.toggle('is-low', pct < 18);
      el.fill.value = String(pct);
      el.fillValue.textContent = `${pct}%`;
    }
    const mlLabel = pct >= 99 ? '500 ML' : `${Math.round(ml)} ML`;
    if (el.statusValue.textContent !== mlLabel) el.statusValue.textContent = mlLabel;
    if (phase === 'pouring') {
      el.statusSub.textContent = `POURING · ${pct}% REMAINING`;
    } else if (phase === 'empty') {
      el.statusSub.textContent = 'EMPTY · 0 ML';
    }
  }

  function toast(message, duration = 2400) {
    window.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => el.toast.classList.remove('is-visible'), duration);
  }

  function setLoading(progress) {
    el.loaderBar.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
  }

  function ready() {
    root.dataset.ready = 'true';
    setLoading(1);
  }

  function showError() {
    el.loader.hidden = true;
    el.error.hidden = false;
    root.dataset.ready = 'true';
  }

  function setAutoRotate(value) {
    el.autorotate.checked = value;
  }

  function setExposureDisplay(value) {
    el.exposure.value = String(value);
    el.exposureValue.textContent = Number(value).toFixed(2);
  }

  function setEnvironmentDisplay(value) {
    el.environment.value = String(value);
    el.envValue.textContent = Number(value).toFixed(2);
  }

  return {
    setPhase,
    setWater,
    toast,
    setLoading,
    ready,
    showError,
    setAutoRotate,
    setExposureDisplay,
    setEnvironmentDisplay,
    getSettingsOpen: () => !el.params.hidden,
    getAutoRotate: () => el.autorotate.checked,
    phase: () => phase,
  };
}
