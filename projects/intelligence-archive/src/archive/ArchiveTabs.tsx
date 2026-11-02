import { useRef, type KeyboardEvent } from 'react';
import type { ArchiveTab } from './types';
import './ArchiveTabs.css';

interface ArchiveTabsProps {
  tab: ArchiveTab;
  onChange: (tab: ArchiveTab) => void;
  modelCount: number;
  eventCount: number;
}

const TABS: Array<{ value: ArchiveTab; label: string; note: string }> = [
  { value: 'database', label: 'DATABASE', note: '列表 · 表格' },
  { value: 'timeline', label: 'TIMELINE', note: '按年份' },
  { value: 'events', label: 'EVENTS', note: '事件档案' },
];

const PANEL_ID = 'archive-panel';

export function ArchiveTabs({ tab, onChange, modelCount, eventCount }: ArchiveTabsProps) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let next = index;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onChange(TABS[next].value);
  };

  return (
    <div className="arch-tabs" role="tablist" aria-label="档案浏览模式">
      {TABS.map((item, index) => {
        const selected = tab === item.value;
        const count = item.value === 'events' ? eventCount : modelCount;
        return (
          <button
            key={item.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`archive-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={PANEL_ID}
            tabIndex={selected ? 0 : -1}
            className={`arch-tab${selected ? ' is-active' : ''}`}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className="arch-tab__label">{item.label}</span>
            <span className="arch-tab__note u-meta">{item.note}</span>
            <span className="arch-tab__count u-mono">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
