import { useMemo } from 'react';
import { categoryLabel } from '../data';
import type { Model } from '../data/types';
import { orgName } from './data-utils';
import { dateParts, groupModelsByYear } from './logic';
import { countryName } from './labels';
import { VerificationBadge } from './DetailBits';
import './ArchiveTimeline.css';

interface ArchiveTimelineProps {
  models: Model[];
  onOpen: (id: string) => void;
}

function TimelineRow({ model, onOpen }: { model: Model; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className="arch-tl-row"
      onClick={() => onOpen(model.id)}
      aria-label={`查看 ${model.name} 档案详情`}
    >
      <span className="arch-tl-row__date u-mono">{model.displayDate}</span>
      <span className="arch-tl-row__body">
        <span className="arch-tl-row__head">
          <span className="arch-tl-row__name">{model.name}</span>
          <VerificationBadge status={model.verificationStatus} />
        </span>
        <span className="arch-tl-row__meta u-mono">
          {orgName(model.organization)} · {model.family} {model.generation} ·{' '}
          {categoryLabel(model.category)}
        </span>
        <span className="arch-tl-row__advance u-cn">{model.keyAdvancement}</span>
      </span>
    </button>
  );
}

/** 2026 年档案行：日期 / 名称 / 机构 / 关键进展。 */
function ArchiveRow2026({ model, onOpen }: { model: Model; onOpen: (id: string) => void }) {
  const { year, month, day } = dateParts(model.displayDate);
  return (
    <button
      type="button"
      className="arch-row-2026"
      onClick={() => onOpen(model.id)}
      aria-label={`查看 ${model.name} 档案详情`}
    >
      <span className="arch-row-2026__date">
        <span className="arch-row-2026__year u-year">{year}</span>
        {month ? (
          <span className="arch-row-2026__rest u-mono">
            <span className="arch-row-2026__slash">/</span> {month}
            {day ? (
              <>
                {' '}
                <span className="arch-row-2026__slash">/</span> {day}
              </>
            ) : null}
          </span>
        ) : null}
      </span>
      <span className="arch-row-2026__body">
        <span className="arch-row-2026__head">
          <span className="arch-row-2026__name">{model.name}</span>
          <VerificationBadge status={model.verificationStatus} />
        </span>
        <span className="arch-row-2026__meta u-mono">
          {orgName(model.organization)} · {countryName(model.countryOrRegion)} · {model.family}{' '}
          {model.generation} · {categoryLabel(model.category)}
        </span>
        <span className="arch-row-2026__advance u-cn">{model.keyAdvancement}</span>
      </span>
    </button>
  );
}

export function ArchiveTimeline({ models, onOpen }: ArchiveTimelineProps) {
  const groups = useMemo(() => groupModelsByYear(models), [models]);

  return (
    <section className="arch-timeline" aria-label="按年份分组的模型时间轴">
      {groups.map((group) => (
        <div className="arch-timeline__year" key={group.year}>
          <div className="arch-timeline__marker">
            <span className="arch-timeline__year-num u-year">{group.year}</span>
            <span className="arch-timeline__year-count u-meta">{group.models.length} RECORDS</span>
          </div>
          <ol className="arch-timeline__list">
            {group.models.map((model) => (
              <li key={model.id} className="arch-timeline__item">
                {group.year === '2026' ? (
                  <ArchiveRow2026 model={model} onOpen={onOpen} />
                ) : (
                  <TimelineRow model={model} onOpen={onOpen} />
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
