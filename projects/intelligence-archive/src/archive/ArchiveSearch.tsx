import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { SearchHit } from '../data/types';
import './ArchiveSearch.css';

interface ArchiveSearchProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchHit[];
  onSelectModel: (id: string) => void;
  onSelectEvent: (id: string) => void;
}

const SUGGESTION_HINT =
  '试试 GPT、Claude、DeepSeek、Qwen、GLM、Gemini、Kimi、MiniMax，或机构中文名（如 智谱、月之暗面）与具体型号（如 GPT-4o）。';

export function ArchiveSearch({
  value,
  onChange,
  suggestions,
  onSelectModel,
  onSelectEvent,
}: ArchiveSearchProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const hasQuery = value.trim().length > 0;
  const visible = hasQuery && open;
  const activeHit = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
  const activeDescendant = visible && activeHit ? `${listId}-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    if (!hasQuery) setOpen(false);
  }, [hasQuery]);

  useEffect(() => {
    if (!visible || activeIndex < 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, visible]);

  const select = (hit: SearchHit) => {
    setOpen(false);
    setActiveIndex(-1);
    if (hit.kind === 'model') onSelectModel(hit.id);
    else onSelectEvent(hit.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((previous) => {
        if (event.key === 'ArrowDown') return previous >= suggestions.length - 1 ? 0 : previous + 1;
        return previous <= 0 ? suggestions.length - 1 : previous - 1;
      });
      return;
    }
    if (event.key === 'Enter') {
      if (!visible || !suggestions.length) return;
      event.preventDefault();
      select(activeHit ?? suggestions[0]);
      return;
    }
    if (event.key === 'Escape') {
      if (visible) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      } else if (value) {
        event.preventDefault();
        onChange('');
      }
    }
  };

  return (
    <div className="arch-search">
      <div className="arch-search__row">
        <div className="arch-search__field">
          <label className="sr-only" htmlFor={inputId}>
            搜索模型、机构、家族或历史事件
          </label>
          <input
            id={inputId}
            ref={inputRef}
            className="arch-search__input"
            type="text"
            role="combobox"
            aria-expanded={visible}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            aria-describedby={`${inputId}-hint`}
            autoComplete="off"
            spellCheck={false}
            placeholder="SEARCH · 输入模型名、机构或型号"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (hasQuery) setOpen(true);
            }}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
          />
          {value ? (
            <button
              type="button"
              className="arch-search__clear"
              aria-label="清除搜索"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange('');
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              <span aria-hidden="true">✕</span>
            </button>
          ) : null}
        </div>

        <p id={`${inputId}-hint`} className="arch-search__hint u-meta">
          ↑↓ 选择 · ENTER 打开 · ESC 关闭
        </p>
      </div>

      {visible ? (
        <div className="arch-search__panel">
          {suggestions.length ? (
            <ul
              id={listId}
              ref={listRef}
              className="arch-search__list"
              role="listbox"
              aria-label="搜索结果"
            >
              {suggestions.map((hit, index) => (
                <li
                  key={`${hit.kind}-${hit.id}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-index={index}
                  className={`arch-search__option${index === activeIndex ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(hit)}
                >
                  <span className="arch-search__kind u-meta">
                    {hit.kind === 'model' ? 'MODEL' : 'EVENT'}
                  </span>
                  <span className="arch-search__name">{hit.title}</span>
                  <span className="arch-search__sub u-mono">{hit.subtitle}</span>
                  <span className="arch-search__date u-mono">{hit.displayDate}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="arch-search__empty" role="status">
              <p className="arch-search__empty-title">没有匹配「{value.trim()}」的记录。</p>
              <p className="arch-search__empty-body u-caption u-cn">{SUGGESTION_HINT}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
