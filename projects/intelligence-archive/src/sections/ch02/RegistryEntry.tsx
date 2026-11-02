import type { HistoryEvent } from '../../data';
import Provenance from '../../components/common/Provenance';

const CATEGORY: Record<string, string> = {
  theory: '理论',
  breakthrough: '突破',
  system: '系统',
  organization: '机构',
  policy: '政策',
  science: '科学',
  product: '产品',
  hardware: '硬件',
};

interface RegistryEntryProps {
  event: HistoryEvent;
  primary: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * 编年史条目：年份在左槽，标题即按钮（可打开详情面板），摘要与出处在右。
 * 只有一级节点给「意义」，二级节点保留事实摘要，避免整栏变成同一密度的列表。
 */
export default function RegistryEntry({ event, primary, selected, onSelect }: RegistryEntryProps) {
  return (
    <article
      className={`ch02__entry${primary ? ' ch02__entry--primary' : ''}${
        selected ? ' is-selected' : ''
      }`}
    >
      <p className="ch02__entry-meta u-mono">
        <span className="ch02__entry-date">{event.displayDate}</span>
        <span className="ch02__entry-cat">{CATEGORY[event.category] ?? event.category}</span>
      </p>

      <div className="ch02__entry-body">
        <h3 className="ch02__entry-heading">
          <button
            type="button"
            className="ch02__entry-title u-cn"
            onClick={() => onSelect(event.id)}
            aria-expanded={selected}
            aria-controls="ch02-detail"
          >
            {event.title}
            <span className="ch02__entry-mark u-mono" aria-hidden="true">
              ↗
            </span>
          </button>
        </h3>

        <p className="ch02__entry-text u-cn">{event.summary}</p>

        {primary && (
          <p className="ch02__entry-why u-cn">
            <span className="ch02__entry-why-tag u-meta">意义</span>
            {event.significance}
          </p>
        )}

        <Provenance
          source={event.sources[0]}
          status={event.verificationStatus}
          date={event.displayDate}
        />
      </div>
    </article>
  );
}
