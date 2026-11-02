import { useEffect, useRef, useState } from 'react';
import type { Route } from '../App';
import { chapters } from '../data/chapters';
import { useNarrative } from '../lib/narrative-store';
import { scrollToTop } from '../lib/scroll-director';
import './TopNav.css';

const links = [
  { key: 'index', label: 'INDEX', href: '#/' },
  { key: 'timeline', label: 'TIMELINE', href: '#/archive/timeline' },
  { key: 'archive', label: 'ARCHIVE', href: '#/archive' },
  { key: 'about', label: 'ABOUT', href: '#/about' },
] as const;

function activeKey(route: Route): string {
  if (route.view === 'archive') return route.params[0] === 'timeline' ? 'timeline' : 'archive';
  if (route.view === 'about') return 'about';
  return 'index';
}

export default function TopNav({ route }: { route: Route }) {
  const chapter = useNarrative((state) => state.chapter);
  const year = useNarrative((state) => state.year);
  const [open, setOpen] = useState(false);
  const active = activeKey(route);
  const voidTone = route.view === 'narrative' && chapters[chapter]?.tone === 'void';
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [route]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    firstLinkRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className={`nav${voidTone ? ' nav--void' : ''}${open ? ' nav--open' : ''}`}>
      <div className="nav__inner">
        <a className="nav__brand" href="#/" aria-label="THE INTELLIGENCE ARCHIVE 首页">
          <span className="nav__brand-en">THE INTELLIGENCE ARCHIVE</span>
          <span className="nav__brand-cn u-cn">智能编年史</span>
        </a>

        <nav className="nav__links" aria-label="主导航">
          {links.map((link) => (
            <a
              key={link.key}
              className={`nav__link${active === link.key ? ' is-active' : ''}`}
              href={link.href}
              aria-current={active === link.key ? 'page' : undefined}
              onClick={(event) => {
                if (link.key === 'index' && route.view === 'narrative') {
                  event.preventDefault();
                  scrollToTop();
                }
              }}
            >
              {link.label}
            </a>
          ))}
          {route.view === 'narrative' && (
            <span className="nav__year u-mono" aria-hidden="true">
              {year}
            </span>
          )}
        </nav>

        <button
          className="nav__menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="nav-overlay"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="nav__menu-label">{open ? 'CLOSE' : 'MENU'}</span>
          <span className="nav__menu-icon" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>

      <div className="nav__overlay" id="nav-overlay" hidden={!open}>
        <nav className="nav__overlay-links" aria-label="移动导航">
          {links.map((link, index) => (
            <a
              key={link.key}
              ref={index === 0 ? firstLinkRef : undefined}
              className={`nav__overlay-link${active === link.key ? ' is-active' : ''}`}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              <span className="nav__overlay-index u-mono">{String(index + 1).padStart(2, '0')}</span>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav__overlay-meta u-meta">
          <span>1950 — 2026</span>
          <span>AN INTERACTIVE RECORD</span>
        </div>
      </div>
    </header>
  );
}
