import { useMemo } from 'react';
import { chapters } from '../data';
import type { HistoryEvent } from '../data/types';
import { orgName } from './data-utils';
import { chapterLabel, eventCategoryLabel } from './labels';
import { VerificationBadge } from './DetailBits';
import './ArchiveEvents.css';

interface ArchiveEventsProps {
  events: HistoryEvent[];
  onOpen: (id: string) => void;
}

export function ArchiveEvents({ events, onOpen }: ArchiveEventsProps) {
  const groups = useMemo(() => {
    const map = new Map<number, HistoryEvent[]>();
    for (const event of events) {
      const list = map.get(event.chapter) ?? [];
      list.push(event);
      map.set(event.chapter, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, list]) => ({
        chapter,
        list,
        meta: chapters.find((item) => item.index === chapter),
      }));
  }, [events]);

  return (
    <section className="arch-events" aria-label="历史事件档案">
      {groups.map((group) => (
        <div className="arch-events__group" key={group.chapter}>
          <header className="arch-events__head">
            <p className="u-meta">
              {chapterLabel(group.chapter)} · {group.list.length} EVENTS
            </p>
            <h3 className="arch-events__title u-cn">
              {group.meta ? group.meta.titleZh : '章节未标注'}
              {group.meta ? (
                <span className="arch-events__range u-mono">{group.meta.rangeLabel}</span>
              ) : null}
            </h3>
          </header>
          <ul className="arch-events__list">
            {group.list.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="arch-event-row"
                  onClick={() => onOpen(event.id)}
                  aria-label={`查看事件 ${event.title} 详情`}
                >
                  <span className="arch-event-row__date u-mono">{event.displayDate}</span>
                  <span className="arch-event-row__body">
                    <span className="arch-event-row__head">
                      <span className="arch-event-row__title u-cn">{event.title}</span>
                      <VerificationBadge status={event.verificationStatus} />
                    </span>
                    {event.titleEn ? (
                      <span className="arch-event-row__en u-mono">{event.titleEn}</span>
                    ) : null}
                    <span className="arch-event-row__meta u-mono">
                      {eventCategoryLabel[event.category]} ·{' '}
                      {event.organizations.length
                        ? event.organizations.map((id) => orgName(id)).join(' / ')
                        : '机构未记录'}
                      {event.people?.length ? ` · ${event.people.slice(0, 3).join(' / ')}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
