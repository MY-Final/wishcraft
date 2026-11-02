/**
 * GARGANTUA — optional ambient music.
 *
 * The soundtrack is a single pre-mastered, seamlessly looping ambient bed
 * (synthesised in-repo by tools/make-audio.py — no third-party samples).
 *
 * Playback is intentionally conservative:
 *
 *   • Nothing exists until playback is actually wanted, and playback never
 *     starts before a real user gesture has been observed.
 *   • The store flag is the single source of truth: main.js forwards
 *     `setEnabled()` on boot, on the M shortcut and on HUD clicks.
 *   • On first use the OGG is fetched once and played from an object URL. A
 *     seekable source lets the browser know the real 40 s duration and makes
 *     the loop sample-accurate even on static servers without HTTP Range
 *     support; if that fetch fails, the element falls back to the plain URL.
 *   • Starting/stopping is eased (±1.2 s), looping is native, and the master
 *     volume stays restrained (0.3).
 *   • A blocked autoplay attempt, a missing file or an unsupported codec is a
 *     silent no-op: no unhandled rejection, no console.error, no UI error.
 */
const DEFAULT_SRC = './assets/audio/gargantua-ambient.ogg';
const TARGET_VOLUME = 0.3;
const FADE_SECONDS = 1.2;
/** Abort a stalled asset fetch and fall back to letting the element stream it. */
const SOURCE_TIMEOUT_MS = 8000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createAudio({ store, src = DEFAULT_SRC } = {}) {
  let element = null;
  let objectUrl = null;
  let enabled = Boolean(store?.state?.audio);
  let gestureReceived = false;
  let failed = false;
  let disposed = false;

  let sourceState = 'idle'; // idle | loading | ready | failed
  let loadPromise = null;
  let loadController = null;
  let pendingPlay = false;

  let fadeFrame = 0;
  let fadeTarget = 0;
  let fadeValue = 0;
  let lastFadeAt = 0;
  let pauseTimer = 0;

  function mediaElement() {
    return element && !disposed ? element : null;
  }

  function applyVolume() {
    const media = mediaElement();
    if (!media) return;
    try {
      media.volume = clamp(fadeValue, 0, 1) * TARGET_VOLUME;
    } catch {
      /* volume can be locked by the UA; treat as a no-op */
    }
  }

  function pauseNow() {
    const media = mediaElement();
    if (!media) return;
    try {
      media.pause();
    } catch {
      /* no-op */
    }
  }

  function clearPauseTimer() {
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = 0;
    }
  }

  function stopFade() {
    if (fadeFrame) {
      cancelAnimationFrame(fadeFrame);
      fadeFrame = 0;
    }
    lastFadeAt = 0;
  }

  function stepFade(now) {
    fadeFrame = 0;
    if (disposed || !element) return;
    const previous = lastFadeAt || now;
    lastFadeAt = now;
    const dt = clamp((now - previous) / 1000, 0, 0.1);
    const increment = dt / FADE_SECONDS;

    if (fadeValue < fadeTarget) fadeValue = Math.min(fadeTarget, fadeValue + increment);
    else if (fadeValue > fadeTarget) fadeValue = Math.max(fadeTarget, fadeValue - increment);
    applyVolume();

    if (fadeValue !== fadeTarget) {
      fadeFrame = requestAnimationFrame(stepFade);
    } else {
      lastFadeAt = 0;
      if (fadeTarget === 0) pauseNow();
    }
  }

  function startFade(target) {
    const next = clamp(target, 0, 1);
    if (!element || disposed) return;
    fadeTarget = next;
    if (fadeFrame) return;
    lastFadeAt = 0;
    fadeFrame = requestAnimationFrame(stepFade);
  }

  function schedulePause() {
    clearPauseTimer();
    // Safety net for throttled tabs where rAF may not run during a fade-out.
    pauseTimer = setTimeout(() => {
      pauseTimer = 0;
      if (!enabled) pauseNow();
    }, FADE_SECONDS * 1000 + 200);
  }

  function onMediaError() {
    failed = true;
    stopFade();
    clearPauseTimer();
    pauseNow();
  }

  function ensureElement() {
    if (element) return element;
    if (disposed || failed) return null;
    try {
      const media = document.createElement('audio');
      media.dataset.gargantuaAudio = 'ambient';
      media.dataset.gargantuaSource = src;
      media.src = objectUrl ?? src;
      media.loop = true;
      media.preload = 'auto';
      media.volume = 0;
      media.hidden = true;
      media.setAttribute('aria-hidden', 'true');
      media.addEventListener('error', onMediaError);
      (document.body ?? document.documentElement).appendChild(media);
      element = media;
    } catch {
      failed = true;
      element = null;
    }
    return element;
  }

  /**
   * Fetch the bed once and expose it as an object URL. A fully buffered,
   * seekable media resource lets every browser report the true duration and
   * seek to the loop point, which matters on servers without Range support.
   * Failure is silent: playback then falls back to the plain URL.
   */
  function loadSource() {
    if (sourceState === 'ready' || sourceState === 'failed') return Promise.resolve();
    if (loadPromise) return loadPromise;
    sourceState = 'loading';

    try {
      loadController = typeof AbortController === 'function' ? new AbortController() : null;
    } catch {
      loadController = null;
    }
    const timer = loadController
      ? setTimeout(() => {
          try {
            loadController.abort();
          } catch {
            /* no-op */
          }
        }, SOURCE_TIMEOUT_MS)
      : 0;

    loadPromise = (async () => {
      try {
        if (typeof fetch !== 'function' || typeof URL?.createObjectURL !== 'function') {
          throw new Error('object URLs unavailable');
        }
        const response = await fetch(src, {
          signal: loadController?.signal,
          cache: 'force-cache',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.size) throw new Error('empty media');
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        sourceState = 'ready';
      } catch {
        sourceState = disposed ? 'idle' : 'failed';
      } finally {
        if (timer) clearTimeout(timer);
        loadController = null;
      }
    })();

    return loadPromise;
  }

  function playElement() {
    const media = ensureElement();
    if (!media) return;
    if (!media.paused && !media.ended) {
      startFade(1);
      return;
    }
    let promise;
    try {
      promise = media.play();
    } catch {
      // Some UAs throw synchronously when the source is not playable.
      failed = true;
      return;
    }
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    startFade(1);
  }

  function maybePlay() {
    pendingPlay = false;
    if (disposed || !enabled || failed || !gestureReceived) return;
    playElement();
  }

  function tryPlay() {
    if (disposed || !enabled || failed || !gestureReceived) return;
    pendingPlay = true;
    if (sourceState === 'ready' || sourceState === 'failed') {
      maybePlay();
      return;
    }
    if (sourceState === 'idle') loadSource().then(maybePlay, maybePlay);
  }

  function onUserGesture() {
    gestureReceived = true;
    if (enabled) tryPlay();
  }

  function setEnabled(value) {
    if (disposed) return;
    enabled = Boolean(value);

    if (enabled) {
      clearPauseTimer();
      if (gestureReceived) tryPlay();
    } else {
      pendingPlay = false;
      if (!element) return;
      startFade(0);
      schedulePause();
    }
  }

  // A gesture is required by every modern browser; retry on each gesture so a
  // previously blocked play() call (NotAllowedError) can recover.
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onUserGesture, { passive: true });
    window.addEventListener('keydown', onUserGesture);
    window.addEventListener('touchstart', onUserGesture, { passive: true });
  }

  return {
    setEnabled,
    get enabled() {
      return enabled;
    },
    get element() {
      return element;
    },
    get sourceUrl() {
      return src;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pendingPlay = false;
      clearPauseTimer();
      stopFade();
      try {
        loadController?.abort();
      } catch {
        /* no-op */
      }
      loadController = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', onUserGesture);
        window.removeEventListener('keydown', onUserGesture);
        window.removeEventListener('touchstart', onUserGesture);
      }
      const media = element;
      element = null;
      if (media) {
        try {
          media.removeEventListener('error', onMediaError);
          media.pause();
          media.removeAttribute('src');
          media.remove();
        } catch {
          /* no-op */
        }
      }
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* no-op */
        }
        objectUrl = null;
      }
    },
  };
}
