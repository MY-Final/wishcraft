import { useEffect, useRef, useState } from 'react';
import TopNav from './components/TopNav';
import { initScrollDirector, refreshScrollDirector, scrollToChapter } from './lib/scroll-director';
import AboutView from './views/AboutView';
import ArchiveView from './views/ArchiveView';
import NarrativeView from './views/NarrativeView';

export interface Route {
  view: 'narrative' | 'archive' | 'about';
  params: string[];
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'archive') return { view: 'archive', params: parts.slice(1) };
  if (parts[0] === 'about') return { view: 'about', params: [] };
  if (parts[0] === 'chapter') return { view: 'narrative', params: parts.slice(1) };
  return { view: 'narrative', params: [] };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const narrativeScroll = useRef(0);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => initScrollDirector(), []);

  useEffect(() => {
    if (route.view !== 'narrative') return;
    const remember = () => {
      narrativeScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [route.view]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => refreshScrollDirector());

    if (route.view === 'narrative') {
      const chapter = Number(route.params[0]);
      if (Number.isFinite(chapter) && chapter >= 0 && chapter <= 8) {
        const timer = window.setTimeout(() => scrollToChapter(chapter, 0.04), 200);
        return () => {
          window.cancelAnimationFrame(frame);
          window.clearTimeout(timer);
        };
      }
      const target = narrativeScroll.current;
      const timer = window.setTimeout(() => {
        window.scrollTo({ top: target, behavior: 'auto' });
        refreshScrollDirector();
      }, 0);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timer);
      };
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  return (
    <div className="app-shell">
      <TopNav route={route} />
      {route.view === 'archive' ? (
        <ArchiveView initialModelId={route.params[0]} initialTab={route.params[1]} />
      ) : route.view === 'about' ? (
        <AboutView />
      ) : (
        <NarrativeView targetChapter={route.params[0] ? Number(route.params[0]) : undefined} />
      )}
    </div>
  );
}
