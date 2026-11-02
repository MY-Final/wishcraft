import './ArchiveHeader.css';

interface ArchiveHeaderProps {
  modelCount: number;
  eventCount: number;
  organizationCount: number;
  rangeLabel: string;
  cutoff: string;
  modelsFrom: string | null;
  notice?: string | null;
}

export function ArchiveHeader({
  modelCount,
  eventCount,
  organizationCount,
  rangeLabel,
  cutoff,
  modelsFrom,
  notice,
}: ArchiveHeaderProps) {
  const empty = modelCount === 0 && eventCount === 0;

  return (
    <header className="arch-hero u-container">
      <div className="arch-hero__kicker">
        <p className="u-meta">EXPLORE THE ARCHIVE</p>
        <p className="u-meta u-mono">{rangeLabel}</p>
      </div>

      <h1 className="arch-hero__title">
        <span className="arch-hero__title-en">THE MODEL ARCHIVE</span>
        <span className="arch-hero__title-zh u-cn">模型档案</span>
      </h1>

      <div className="arch-hero__intro">
        <div>
          <p className="arch-hero__lede u-cn">
            这里陈列被官方公开过的模型与历史事件。每条记录都标注日期类型、日期精度与核实状态；
            未公开的参数量与上下文长度留空，不做推测。点击任意条目可查看来源、继承关系与同家族版本。
          </p>
          <a className="arch-hero__method u-link u-meta" href="#/about">
            阅读数据说明 / METHOD →
          </a>
        </div>
        <dl className="arch-hero__stats">
          <div>
            <dt className="u-meta">MODELS</dt>
            <dd>
              <span className="arch-hero__stat-value u-mono">{modelCount}</span>
              {modelsFrom ? (
                <span className="arch-hero__stat-note u-mono">MODELS FROM {modelsFrom}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="u-meta">EVENTS</dt>
            <dd>
              <span className="arch-hero__stat-value u-mono">{eventCount}</span>
            </dd>
          </div>
          <div>
            <dt className="u-meta">ORGANIZATIONS</dt>
            <dd>
              <span className="arch-hero__stat-value u-mono">{organizationCount}</span>
            </dd>
          </div>
          <div>
            <dt className="u-meta">CUTOFF</dt>
            <dd>
              <span className="arch-hero__stat-value u-mono">{cutoff.replaceAll('-', '.')}</span>
            </dd>
          </div>
        </dl>
      </div>

      {empty ? (
        <p className="arch-hero__notice u-mono">
          ARCHIVE STATUS · 编目中 · 研究数据核实完成后将在此处编入记录
        </p>
      ) : null}
      {notice ? <p className="arch-hero__notice u-mono">{notice}</p> : null}
    </header>
  );
}
