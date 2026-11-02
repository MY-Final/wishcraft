import type { CSSProperties } from 'react';
import type { HistoryEvent } from '../../data';
import Provenance from '../../components/common/Provenance';

export type CssVars = CSSProperties & Record<string, string | number>;

export interface Beat {
  primary: HistoryEvent;
  secondary: HistoryEvent[];
  /** 由数据摘要改写的一行机制提示，仅作排版装饰，不引入新事实。 */
  mechanism: string;
  year: string;
}

const CATEGORY: Record<string, { zh: string; en: string }> = {
  theory: { zh: '理论', en: 'THEORY' },
  breakthrough: { zh: '突破', en: 'BREAKTHROUGH' },
  system: { zh: '系统', en: 'SYSTEM' },
  organization: { zh: '机构', en: 'ORGANIZATION' },
  policy: { zh: '政策', en: 'POLICY' },
  science: { zh: '科学', en: 'SCIENCE' },
  product: { zh: '产品', en: 'PRODUCT' },
  hardware: { zh: '硬件', en: 'HARDWARE' },
};

export function categoryOf(category: string): { zh: string; en: string } {
  return CATEGORY[category] ?? { zh: category, en: category };
}

interface WallLabelProps {
  beat: Beat;
  index: number;
  total: number;
}

/**
 * 博物馆墙标：大年份在左栏（见 Chapter01 的年份轴），这里只排标题、摘要、意义与出处。
 * 不使用卡片：只用发丝线、留白与等宽元数据分层。
 */
export default function WallLabel({ beat, index, total }: WallLabelProps) {
  const { primary, secondary } = beat;
  const category = categoryOf(primary.category);
  const headlineId = `ch01-label-${primary.id}`;

  return (
    <article
      className="ch01__label"
      style={{ '--i': index } as CssVars}
      aria-labelledby={headlineId}
    >
      <span className="ch01__label-year" aria-hidden="true">
        {beat.year}
      </span>

      <p className="ch01__label-meta u-mono">
        <span>{category.zh} · {category.en}</span>
        <span className="ch01__label-sep" aria-hidden="true" />
        <span>{primary.displayDate}</span>
        <span className="ch01__label-count" aria-hidden="true">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </p>

      <h3 className="ch01__label-title u-cn" id={headlineId}>
        {primary.title}
      </h3>
      {primary.titleEn && <p className="ch01__label-en u-mono">{primary.titleEn}</p>}

      <p className="ch01__label-summary u-cn">{primary.summary}</p>

      <div className="ch01__label-why">
        <p className="ch01__label-why-tag u-meta">
          为什么重要
          <span className="ch01__label-why-en">WHY IT MATTERS</span>
        </p>
        <p className="ch01__label-why-text u-cn">{primary.significance}</p>
      </div>

      <Provenance
        source={primary.sources[0]}
        status={primary.verificationStatus}
        date={primary.displayDate}
      />

      {secondary.length > 0 && (
        <div className="ch01__subs">
          <p className="ch01__subs-tag u-meta">同期档案 · ALSO FILED</p>
          {secondary.map((event) => (
            <div className="ch01__sub" key={event.id}>
              <span className="ch01__sub-year u-mono">{event.displayDate}</span>
              <div className="ch01__sub-body">
                <p className="ch01__sub-title u-cn">{event.title}</p>
                <p className="ch01__sub-text u-cn">{event.significance}</p>
                <Provenance
                  source={event.sources[0]}
                  status={event.verificationStatus}
                  date={event.displayDate}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
