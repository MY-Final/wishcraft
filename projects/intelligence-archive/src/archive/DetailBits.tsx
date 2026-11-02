import type { ReactNode } from 'react';
import type { Source, VerificationStatus } from '../data/types';
import { hostname, verificationLabel } from '../lib/format';
import { sourceKindLabel } from './labels';
import './DetailBits.css';

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className="arch-badge" data-status={status}>
      {verificationLabel[status]}
    </span>
  );
}

export function DetailField({
  label,
  children,
  mono = false,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`arch-field${wide ? ' arch-field--wide' : ''}`}>
      <dt className="u-meta">{label}</dt>
      <dd className={mono ? 'u-mono' : undefined}>{children}</dd>
    </div>
  );
}

export function TagGroup({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="arch-tag-group">
      <p className="arch-tag-group__label u-meta">{label}</p>
      <ul className="arch-tags" aria-label={label}>
        {items.map((item) => (
          <li key={item} className="arch-tag u-mono">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) {
    return <p className="arch-note u-caption">未记录公开来源。</p>;
  }
  return (
    <ul className="arch-sources">
      {sources.map((source) => (
        <li key={`${source.url}-${source.label}`}>
          <a
            className="arch-source"
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${source.label}（在新标签页打开）`}
          >
            <span className="arch-source__label">{source.label}</span>
            <span className="arch-source__meta u-mono">
              {sourceKindLabel[source.kind]} · {hostname(source.url)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ProseBlock({ label, text }: { label: string; text: string }) {
  return (
    <section className="arch-prose">
      <h3 className="arch-prose__label u-meta">{label}</h3>
      <p className="arch-prose__text u-cn">{text}</p>
    </section>
  );
}
