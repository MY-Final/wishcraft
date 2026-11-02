import type { Source, VerificationStatus } from '../../data/types';
import { hostname } from '../../lib/format';
import './Provenance.css';

interface ProvenanceProps {
  source?: Source;
  status: VerificationStatus;
  date?: string;
  label?: string;
}

const statusText: Record<VerificationStatus, string> = {
  verified: 'VERIFIED',
  'partially-verified': 'PARTIAL',
  unverified: 'UNVERIFIED',
};

/**
 * 全站唯一的「装饰」：可点击的出处行。
 * 格式：VERIFIED · 2026.09.22 · anthropic.com ↗
 */
export default function Provenance({ source, status, date, label }: ProvenanceProps) {
  if (!source) return null;
  return (
    <a
      className={`provenance${status !== 'verified' ? ' is-partial' : ''}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source.label}（${hostname(source.url)}）`}
    >
      <span className="provenance__status u-mono">{statusText[status]}</span>
      {date && <span className="provenance__date u-mono">{date}</span>}
      <span className="provenance__label">{label ?? hostname(source.url)}</span>
      <span className="provenance__arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}
