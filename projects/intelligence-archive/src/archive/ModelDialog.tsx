import { useId } from 'react';
import { categoryLabel, getOrganization } from '../data';
import type { Model } from '../data/types';
import { DetailField, ProseBlock, SourceList, TagGroup, VerificationBadge } from './DetailBits';
import { DialogShell } from './DialogShell';
import { orgName } from './data-utils';
import { countryName, datePrecisionLabel, dateTypeLabel } from './labels';
import { dedupeLabels } from './logic';
import { RelationGraph } from './RelationGraph';

interface ModelDialogProps {
  model: Model;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function weightsLabel(openWeights: boolean | null): string {
  if (openWeights === true) return '开放权重';
  if (openWeights === false) return '闭源 / 未开放权重';
  return '未记录';
}

export function ModelDialog({ model, onClose, onNavigate }: ModelDialogProps) {
  const titleId = useId();
  const organization = getOrganization(model.organization);
  const displayName = orgName(model.organization);
  const availability = model.availabilityDate
    ? model.availabilityDate.replaceAll('-', '.')
    : '未记录';
  const tags = dedupeLabels(model.tags);
  const capabilities = dedupeLabels(model.capabilities, tags);

  return (
    <DialogShell
      kicker="MODEL RECORD / 模型档案"
      titleId={titleId}
      onClose={onClose}
      resetKey={model.id}
    >
      <header className="arch-detail__head">
        <p className="arch-detail__kicker u-meta">
          {dateTypeLabel[model.dateType]} · {datePrecisionLabel[model.datePrecision]} ·{' '}
          {model.verificationStatus === 'verified' ? 'VERIFIED' : 'PARTIALLY VERIFIED'}
        </p>
        <h2 id={titleId} className="arch-detail__title">
          {model.name}
        </h2>
        <p className="arch-detail__sub u-mono">
          {displayName} · {countryName(model.countryOrRegion)} · {model.family} {model.generation}{' '}
          · {categoryLabel(model.category)}
        </p>
        <div className="arch-detail__badge-row">
          <VerificationBadge status={model.verificationStatus} />
          <span className="arch-detail__id u-mono">{model.id}</span>
        </div>
      </header>

      <dl className="arch-fields">
        <DetailField label="官方日期" mono>
          <span className="arch-detail__date">{model.displayDate}</span>
          <span className="arch-detail__note">
            {dateTypeLabel[model.dateType]} · {datePrecisionLabel[model.datePrecision]}
          </span>
        </DetailField>
        <DetailField label="首次可用" mono>
          {availability}
        </DetailField>
        <DetailField label="机构">
          {displayName}
          {organization && organization.name !== displayName ? (
            <span className="arch-detail__note">
              {organization.name}
              {organization.founded ? ` · EST. ${organization.founded}` : ''}
            </span>
          ) : null}
        </DetailField>
        <DetailField label="国家 / 地区">
          {countryName(model.countryOrRegion)}
          <span className="arch-detail__note u-mono">{model.countryOrRegion}</span>
        </DetailField>
        <DetailField label="家族 / 代际">
          {model.family}
          <span className="arch-detail__note">GEN {model.generation}</span>
        </DetailField>
        <DetailField label="类别">{categoryLabel(model.category)}</DetailField>
        <DetailField label="架构">{model.architecture}</DetailField>
        {model.parameters ? (
          <DetailField label="参数量" mono>
            {model.parameters}
          </DetailField>
        ) : null}
        {model.contextWindow ? (
          <DetailField label="上下文" mono>
            {model.contextWindow}
          </DetailField>
        ) : null}
        <DetailField label="权重">{weightsLabel(model.openWeights)}</DetailField>
        <DetailField label="核实状态">
          <VerificationBadge status={model.verificationStatus} />
        </DetailField>
      </dl>

      <div className="arch-detail__chips">
        <TagGroup label="TAGS / 标签" items={tags} />
        <TagGroup label="CAPABILITIES / 能力" items={capabilities} />
      </div>

      <div className="arch-detail__prose">
        <ProseBlock label="SUMMARY / 摘要" text={model.summary} />
        {model.keyAdvancement ? (
          <ProseBlock label="KEY ADVANCEMENT / 关键进展" text={model.keyAdvancement} />
        ) : null}
        {model.significance ? (
          <ProseBlock label="SIGNIFICANCE / 历史意义" text={model.significance} />
        ) : null}
      </div>

      <section className="arch-detail__section">
        <h3 className="arch-detail__section-title u-meta">RELATIONS / 关系图谱</h3>
        <RelationGraph model={model} onNavigate={onNavigate} />
      </section>

      <section className="arch-detail__section">
        <h3 className="arch-detail__section-title u-meta">SOURCES / 来源</h3>
        <SourceList sources={model.sources} />
      </section>

      {model.notes ? (
        <section className="arch-detail__section">
          <h3 className="arch-detail__section-title u-meta">NOTES / 备注</h3>
          <p className="arch-detail__notes u-caption u-cn">{model.notes}</p>
        </section>
      ) : null}

      <p className="arch-detail__foot u-meta">
        ARCHIVE ID {model.id} · 记录以官方来源为准
      </p>
    </DialogShell>
  );
}
