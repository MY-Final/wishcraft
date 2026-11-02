const REPO = 'https://github.com/MY-Final/wishcraft';

const state = {
  works: [],
  index: 0,
  lastFocus: null,
  previewSrc: '',
};

const el = {
  list: document.querySelector('#work-list'),
  count: document.querySelector('#work-count'),
  stats: document.querySelector('#hero-stats'),
  preview: document.querySelector('#preview'),
  previewImg: document.querySelector('#preview-img'),
  previewFallback: document.querySelector('#preview-fallback'),
  previewIndex: document.querySelector('#preview-index'),
  previewLabel: document.querySelector('#preview-label'),
  detail: document.querySelector('#detail'),
  detailScroll: document.querySelector('#detail-scroll'),
  detailKicker: document.querySelector('#detail-kicker'),
  detailMeta: document.querySelector('#detail-meta'),
  detailTitle: document.querySelector('#detail-title'),
  detailZh: document.querySelector('#detail-zh'),
  detailTagline: document.querySelector('#detail-tagline'),
  detailImg: document.querySelector('#detail-img'),
  detailFallback: document.querySelector('#detail-fallback'),
  detailCaption: document.querySelector('#detail-caption'),
  detailDesc: document.querySelector('#detail-desc'),
  detailFacts: document.querySelector('#detail-facts'),
  detailEnter: document.querySelector('#detail-enter'),
  detailNewtab: document.querySelector('#detail-newtab'),
  detailSource: document.querySelector('#detail-source'),
  detailClose: document.querySelector('#detail-close'),
  error: document.querySelector('#error'),
  footerYear: document.querySelector('#footer-year'),
};

const pad = (value) => String(value).padStart(2, '0');

function normalizePreview(preview) {
  if (!preview) return './';
  return preview.startsWith('./') ? preview : `./${preview}`;
}

function setImage(img, fallback, src, label) {
  if (!src) {
    img.removeAttribute('src');
    img.classList.remove('is-loaded');
    fallback.textContent = label;
    return;
  }
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  img.classList.remove('is-loaded');
  fallback.textContent = label;
  const loader = new Image();
  loader.onload = () => {
    img.src = src;
    requestAnimationFrame(() => img.classList.add('is-loaded'));
  };
  loader.onerror = () => {
    img.removeAttribute('src');
    fallback.textContent = label;
  };
  loader.src = src;
}

function updatePreview(index, work) {
  if (!el.preview) return;
  state.index = index;
  el.previewIndex.textContent = `${pad(index + 1)} / ${pad(state.works.length)}`;
  el.previewLabel.textContent = work ? work.id.replaceAll('-', ' ') : '—';
  setImage(el.previewImg, el.previewFallback, work?.cover || '', work?.title || '');
}

function renderWorks(works) {
  const fragment = document.createDocumentFragment();

  works.forEach((work, index) => {
    const item = document.createElement('div');
    item.className = 'work-row';
    item.style.setProperty('--d', `${index * 55}ms`);

    const link = document.createElement('a');
    link.className = 'work-row__link';
    link.href = `#/work/${work.id}`;
    link.dataset.index = String(index);
    link.setAttribute(
      'aria-label',
      `${work.title}，${work.titleZh}，${work.year}，${work.kindZh || work.kind}`,
    );

    const num = document.createElement('span');
    num.className = 'work-row__num mono';
    num.textContent = pad(index + 1);

    const main = document.createElement('span');
    main.className = 'work-row__main';

    const title = document.createElement('span');
    title.className = 'work-row__title';
    title.textContent = work.title;
    const arrow = document.createElement('span');
    arrow.className = 'work-row__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    title.appendChild(arrow);

    const zh = document.createElement('span');
    zh.className = 'work-row__zh';
    zh.textContent = `${work.titleZh}${work.tagline ? ` — ${work.tagline}` : ''}`;

    main.append(title, zh);

    const meta = document.createElement('span');
    meta.className = 'work-row__meta mono';

    const line = document.createElement('span');
    line.textContent = `${work.year} · ${work.kind}`;
    const status = document.createElement('span');
    status.className = 'work-row__status';
    status.textContent = work.status || 'COMPLETE';

    meta.append(line, status);
    link.append(num, main, meta);

    link.addEventListener('mouseenter', () => updatePreview(index, work));
    link.addEventListener('focus', () => updatePreview(index, work));

    item.appendChild(link);
    fragment.appendChild(item);
  });

  el.list.replaceChildren(fragment);
  el.count.textContent = `${pad(works.length)} WORKS`;
  updatePreview(0, works[0]);

  const countStat = el.stats?.querySelector('dd');
  if (countStat) countStat.textContent = pad(works.length);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -4% 0px' },
  );
  el.list.querySelectorAll('.work-row__link').forEach((link) => observer.observe(link));
}

function fillDetail(work, index) {
  const facts = [
    ['YEAR', work.year],
    ['TYPE', work.kind],
    ['STATUS', work.status || 'COMPLETE'],
    ['META', Array.isArray(work.meta) ? work.meta.join(' · ') : '—'],
  ];

  el.detailKicker.textContent = `${pad(index + 1)} / ${pad(state.works.length)} — ${work.year} · ${work.kind}`;
  el.detailMeta.textContent = `${work.id.replaceAll('-', ' ').toUpperCase()} · ${work.status || 'COMPLETE'}`;
  el.detailTitle.textContent = work.title;
  el.detailZh.textContent = work.titleZh || '';
  el.detailTagline.textContent = work.tagline || '';
  el.detailDesc.textContent = work.description || '';
  el.detailCaption.textContent = `${work.title} — ${work.titleZh || ''} · ${work.year}`;
  setImage(el.detailImg, el.detailFallback, work.cover || '', work.title);

  el.detailFacts.replaceChildren();
  for (const [key, value] of facts) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = key;
    const dd = document.createElement('dd');
    dd.textContent = value || '—';
    row.append(dt, dd);
    el.detailFacts.appendChild(row);
  }

  const preview = normalizePreview(work.preview);
  el.detailEnter.href = preview;
  el.detailNewtab.href = preview;
  el.detailSource.href = work.sourcePath ? `${REPO}/tree/main/${work.sourcePath}` : REPO;
}

let detailOpen = false;

function openDetail(work, index) {
  if (!work) return;
  state.lastFocus = document.activeElement;
  fillDetail(work, index);
  el.detail.hidden = false;
  detailOpen = true;
  document.body.classList.add('is-locked');
  el.detailScroll.scrollTop = 0;
  window.requestAnimationFrame(() => el.detailClose.focus({ preventScroll: true }));
  document.querySelectorAll('.topnav a').forEach((link) => link.classList.remove('is-active'));
}

function closeDetail({ updateHash = true } = {}) {
  if (!detailOpen) return;
  detailOpen = false;
  el.detail.hidden = true;
  document.body.classList.remove('is-locked');
  if (updateHash) {
    history.replaceState(null, '', `${location.pathname}${location.search}#/`);
  }
  setActiveNav('index');
  if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
    state.lastFocus.focus({ preventScroll: true });
  }
}

function setActiveNav(key) {
  document.querySelectorAll('.topnav a[data-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.nav === key);
  });
}

function route() {
  const hash = location.hash || '#/';
  const match = hash.match(/^#\/work\/([\w-]+)$/);
  if (match) {
    const index = state.works.findIndex((work) => work.id === match[1]);
    if (index >= 0) {
      openDetail(state.works[index], index);
      return;
    }
  }
  if (detailOpen) closeDetail({ updateHash: false });
  setActiveNav('index');
  if (hash === '#method') {
    setActiveNav('method');
    const target = document.querySelector('#method');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function trapFocus(event) {
  if (!detailOpen || event.key !== 'Tab') return;
  const focusable = el.detail.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

async function boot() {
  el.footerYear.textContent = String(new Date().getFullYear());
  setActiveNav('index');

  try {
    const response = await fetch('./projects.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const works = Array.isArray(data.works) ? data.works.slice() : [];
    works.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    if (!works.length) throw new Error('no works');
    state.works = works;
    renderWorks(works);
    route();
  } catch (error) {
    console.error('[wishcraft] failed to load projects.json', error);
    el.error.hidden = false;
    el.list.innerHTML = '<p class="loading mono">INDEX UNAVAILABLE — SEE BELOW.</p>';
  } finally {
    window.requestAnimationFrame(() => {
      document.body.classList.add('is-ready');
    });
  }

  window.addEventListener('hashchange', route);
  el.detailClose.addEventListener('click', () => closeDetail());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && detailOpen) closeDetail();
    trapFocus(event);
  });
}

boot();
