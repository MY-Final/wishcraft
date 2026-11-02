import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { categoryLabel, getOrganization, getOrgName } from '../../data';
import type { Model } from '../../data';
import Provenance from '../../components/common/Provenance';
import { hostname } from '../../lib/format';
import { narrative } from '../../lib/narrative-store';
import { PRIORITY_IDS } from './content';

const PRIORITY = new Set(PRIORITY_IDS);

/** displayDate 是唯一日期来源：精度为月时不补日。 */
function dateSegments(model: Model): string {
  return model.displayDate.split('.').join(' / ');
}

function weightsLabel(value: boolean | null): string {
  if (value === true) return '开放权重';
  if (value === false) return '闭源';
  return '未公开';
}

interface ArchiveWallProps {
  releases: Model[];
  /** 第一幕不在视口内时，把可交互部分从 Tab 顺序与命中测试里摘掉 */
  active: boolean;
}

export default function ArchiveWall({ releases, active }: ArchiveWallProps) {
  const [org, setOrg] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const orgs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of releases) {
      counts.set(model.organization, (counts.get(model.organization) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => {
        const diff = b[1] - a[1];
        if (diff !== 0) return diff;
        const nameA = getOrganization(a[0])?.name ?? a[0];
        const nameB = getOrganization(b[0])?.name ?? b[0];
        return nameA.localeCompare(nameB);
      })
      .map(([id, count]) => ({ id, count, label: getOrganization(id)?.name ?? id }));
  }, [releases]);

  const rows = useMemo(
    () => (org === 'all' ? releases : releases.filter((model) => model.organization === org)),
    [releases, org],
  );

  const selected = selectedId ? releases.find((model) => model.id === selectedId) : undefined;
  const hasPartial = rows.some((model) => model.verificationStatus !== 'verified');

  /** 档案墙的可移动距离 = 内容高度 − 窗口高度；只用 CSS 变量驱动，不参与渲染。 */
  useEffect(() => {
    const list = listRef.current;
    const viewport = windowRef.current;
    if (!list || !viewport) return;
    const sync = () => {
      const travel = Math.max(0, list.scrollHeight - viewport.clientHeight);
      viewport.style.setProperty('--travel', `${travel}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(list);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setFrozen(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) closeRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  const openModel = (model: Model) => {
    setSelectedId(model.id);
    setFrozen(narrative.get().chapterProgress);
  };

  const closeDossier = () => {
    setSelectedId(null);
    setFrozen(null);
  };

  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <div className="ch07__wall" inert={!active}>
      <div className="ch07__wall-head">
        <p className="ch07__wall-title">
          <span className="ch07__wall-label u-mono">2026 RELEASES</span>
          <span className="ch07__wall-count u-mono">{rows.length} ENTRIES</span>
        </p>
        <div className="ch07__filters" role="group" aria-label="按机构筛选">
          <button
            type="button"
            className={`ch07__filter u-mono${org === 'all' ? ' is-active' : ''}`}
            aria-pressed={org === 'all'}
            onClick={() => {
              setOrg('all');
              closeDossier();
            }}
          >
            ALL<span>{releases.length}</span>
          </button>
          {orgs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ch07__filter u-mono${org === item.id ? ' is-active' : ''}`}
              aria-pressed={org === item.id}
              onClick={() => {
                setOrg(item.id);
                closeDossier();
              }}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="ch07__ledger-window"
        ref={windowRef}
        style={{ '--freeze': frozen ?? undefined } as CSSProperties}
      >
        <div className="ch07__ledger-clip">
          <div className="ch07__ledger" ref={listRef}>
            {rows.map((model) => (
              <button
                key={model.id}
                type="button"
                className={`ch07__row${PRIORITY.has(model.id) ? ' is-priority' : ''}${
                  selectedId === model.id ? ' is-open' : ''
                }`}
                aria-expanded={selectedId === model.id}
                onClick={() => openModel(model)}
              >
                <span className="ch07__row-date u-mono">{dateSegments(model)}</span>
                <span className="ch07__row-name">
                  {PRIORITY.has(model.id) && <i className="ch07__row-mark" aria-hidden="true" />}
                  {model.name}
                  {model.verificationStatus !== 'verified' && (
                    <sup className="ch07__row-star" aria-hidden="true">
                      *
                    </sup>
                  )}
                </span>
                <span className="ch07__row-org u-mono">{getOrganization(model.organization)?.name ?? model.organization}</span>
                <span className="ch07__row-adv">{model.keyAdvancement}</span>
                <span className="ch07__row-open u-mono" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
        </div>
        <span className="ch07__ledger-rail" aria-hidden="true" />
      </div>

      <p className="ch07__wall-foot u-mono">
        <span className="ch07__wall-foot-left">
          <span>SELECT AN ENTRY TO OPEN ITS RECORD</span>
          {first && last && (
            <span className="ch07__wall-foot-range">
              {first.displayDate} — {last.displayDate}
            </span>
          )}
        </span>
        {hasPartial && <span>* 部分核实 · PARTIALLY VERIFIED</span>}
      </p>

      {selected && (
        <aside key={selected.id} className="ch07__dossier" aria-label={`模型档案：${selected.name}`}>
          <div className="ch07__dossier-head">
            <span className="ch07__dossier-id u-mono">ARCHIVE / {selected.id}</span>
            <button type="button" className="ch07__dossier-close u-mono" ref={closeRef} onClick={closeDossier}>
              CLOSE<span aria-hidden="true"> ✕</span>
            </button>
          </div>

          <p className="ch07__dossier-date u-mono">{selected.displayDate}</p>
          <h3 className="ch07__dossier-name">{selected.name}</h3>
          <p className="ch07__dossier-org u-mono">
            {getOrgName(selected.organization)} · {selected.family} {selected.generation}
          </p>

          <dl className="ch07__dossier-specs u-mono">
            <div>
              <dt>类别</dt>
              <dd>{categoryLabel(selected.category)}</dd>
            </div>
            <div>
              <dt>权重</dt>
              <dd>{weightsLabel(selected.openWeights)}</dd>
            </div>
            {selected.contextWindow && (
              <div>
                <dt>上下文</dt>
                <dd>{selected.contextWindow}</dd>
              </div>
            )}
            {selected.parameters && (
              <div>
                <dt>参数</dt>
                <dd>{selected.parameters}</dd>
              </div>
            )}
          </dl>

          <section className="ch07__dossier-block">
            <h4 className="ch07__dossier-label u-mono">SUMMARY / 摘要</h4>
            <p className="ch07__dossier-text u-cn">{selected.summary}</p>
          </section>
          <section className="ch07__dossier-block">
            <h4 className="ch07__dossier-label u-mono">SIGNIFICANCE / 意义</h4>
            <p className="ch07__dossier-text u-cn">{selected.significance}</p>
          </section>

          <ul className="ch07__dossier-tags u-mono">
            {selected.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>

          <div className="ch07__dossier-sources">
            <h4 className="ch07__dossier-label u-mono">SOURCES / 来源</h4>
            <ul>
              {selected.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <span className="ch07__dossier-kind u-mono">{source.kind}</span>
                    <span>{source.label}</span>
                    <span className="ch07__dossier-host u-mono">
                      {hostname(source.url)} ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <Provenance
            source={selected.sources[0]}
            status={selected.verificationStatus}
            date={selected.displayDate}
          />
        </aside>
      )}
    </div>
  );
}
