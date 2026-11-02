import { chapters } from '../data/chapters';
import { useNarrative } from '../lib/narrative-store';
import { scrollToChapter } from '../lib/scroll-director';
import './YearRail.css';

const railChapters = chapters.filter((chapter) => chapter.index >= 1);

export default function YearRail() {
  const chapter = useNarrative((state) => state.chapter);
  const year = useNarrative((state) => state.year);
  const pageProgress = useNarrative((state) => state.pageProgress);
  const reducedMotion = useNarrative((state) => state.reducedMotion);

  return (
    <aside
      className={`year-rail${chapters[chapter]?.tone === 'void' ? ' year-rail--void' : ''}`}
      aria-label="年份导航"
    >
      <div className="year-rail__year u-year" aria-live="polite" aria-atomic="true">
        {year}
      </div>
      <div className="year-rail__track">
        <span className="year-rail__fill" style={{ transform: `scaleY(${pageProgress})` }} />
        {railChapters.map((item) => {
          const isActive = chapter === item.index;
          const isPast = chapter > item.index;
          return (
            <button
              key={item.index}
              type="button"
              className={`year-rail__tick${isActive ? ' is-active' : ''}${isPast ? ' is-past' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`跳转到 ${item.rangeLabel}，${item.titleZh}`}
              onClick={() => scrollToChapter(item.index, reducedMotion ? 0 : 0.04)}
            >
              <span className="year-rail__label u-mono">
                {item.index === 8 ? 'END' : item.rangeLabel.split(' — ')[0]}
              </span>
              <span className="year-rail__dash" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="year-rail__chapter u-meta">
        {chapter === 0 ? 'PROLOGUE' : chapters[chapter]?.kicker.replace('CHAPTER ', 'CH. ')}
      </p>
    </aside>
  );
}
