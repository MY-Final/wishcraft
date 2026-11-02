import { useId } from 'react';
import { chapters, getModel } from '../data';
import type { HistoryEvent, Model } from '../data/types';
import { DetailField, ProseBlock, SourceList, VerificationBadge } from './DetailBits';
import { DialogShell } from './DialogShell';
import { orgName } from './data-utils';
import { chapterLabel, datePrecisionLabel, dateTypeLabel, eventCategoryLabel } from './labels';
import './EventDialog.css';

interface EventDialogProps {
  event: HistoryEvent;
  onClose: () => void;
  onOpenModel: (id: string) => void;
}

export function EventDialog({ event, onClose, onOpenModel }: EventDialogProps) {
  const titleId = useId();
  const chapter = chapters.find((item) => item.index === event.chapter);
  const related = (event.relatedModels ?? [])
    .map((id) => getModel(id))
    .filter((item): item is Model => Boolean(item));

  return (
    <DialogShell
      kicker="EVENT RECORD / 事件档案"
      titleId={titleId}
      onClose={onClose}
      variant="event"
      resetKey={event.id}
    >
      <header className="arch-detail__head">
        <p className="arch-detail__kicker u-meta">
          {chapterLabel(event.chapter)} · {eventCategoryLabel[event.category]} ·{' '}
          {dateTypeLabel[event.dateType]} · {datePrecisionLabel[event.datePrecision]}
        </p>
        <h2 id={titleId} className="arch-detail__title u-cn">
          {event.title}
        </h2>
        {event.titleEn ? <p className="arch-detail__sub u-mono">{event.titleEn}</p> : null}
        <div className="arch-detail__badge-row">
          <VerificationBadge status={event.verificationStatus} />
          <span className="arch-detail__id u-mono">{event.id}</span>
        </div>
      </header>

      <dl className="arch-fields">
        <DetailField label="日期" mono>
          <span className="arch-detail__date">{event.displayDate}</span>
          <span className="arch-detail__note">
            {dateTypeLabel[event.dateType]} · {datePrecisionLabel[event.datePrecision]}
          </span>
        </DetailField>
        <DetailField label="章节归属">
          {chapter ? (
            <>
              {chapterLabel(chapter.index)} · {chapter.titleZh}
              <span className="arch-detail__note u-mono">{chapter.rangeLabel}</span>
            </>
          ) : (
            chapterLabel(event.chapter)
          )}
        </DetailField>
        <DetailField label="类别">{eventCategoryLabel[event.category]}</DetailField>
        <DetailField label="机构">
          {event.organizations.length
            ? event.organizations.map((id) => orgName(id)).join(' / ')
            : '未记录'}
        </DetailField>
        <DetailField label="人物">
          {event.people?.length ? event.people.join(' / ') : '未记录'}
        </DetailField>
        <DetailField label="核实状态">
          <VerificationBadge status={event.verificationStatus} />
        </DetailField>
      </dl>

      {related.length ? (
        <section className="arch-detail__section">
          <h3 className="arch-detail__section-title u-meta">RELATED MODELS / 关联模型</h3>
          <ul className="arch-event-related">
            {related.map((model) => (
              <li key={model.id}>
                <button
                  type="button"
                  className="arch-event-related__item"
                  onClick={() => onOpenModel(model.id)}
                >
                  <span>{model.name}</span>
                  <span className="u-mono">{model.displayDate}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="arch-detail__prose">
        <ProseBlock label="SUMMARY / 摘要" text={event.summary} />
        {event.significance ? (
          <ProseBlock label="SIGNIFICANCE / 历史意义" text={event.significance} />
        ) : null}
      </div>

      <section className="arch-detail__section">
        <h3 className="arch-detail__section-title u-meta">SOURCES / 来源</h3>
        <SourceList sources={event.sources} />
      </section>

      {event.notes ? (
        <section className="arch-detail__section">
          <h3 className="arch-detail__section-title u-meta">NOTES / 备注</h3>
          <p className="arch-detail__notes u-caption u-cn">{event.notes}</p>
        </section>
      ) : null}

      <p className="arch-detail__foot u-meta">ARCHIVE ID {event.id} · 记录以官方来源为准</p>
    </DialogShell>
  );
}
