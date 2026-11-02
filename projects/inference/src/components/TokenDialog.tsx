import { CONCEPT_NOTE, CONCEPT_VECTORS, EMBEDDING_DIMENSIONS } from '../data/embedding';
import { journeyStore } from '../lib/journey-store';
import ModalDialog from './ModalDialog';

interface TokenDialogProps {
  tokenIndex: number | null;
}

export default function TokenDialog({ tokenIndex }: TokenDialogProps) {
  const token = tokenIndex === null ? undefined : CONCEPT_VECTORS[tokenIndex];
  if (!token) return null;

  return (
    <ModalDialog
      open
      onClose={() => journeyStore.closeOverlay()}
      labelledBy="token-inspector-title"
      variant="drawer"
    >
      <div className="drawer token-inspector">
        <p className="drawer__eyebrow mono">EMBEDDING / CONCEPT SLICE</p>
        <div className="token-inspector__token">
          <span>{token.text}</span>
          <small className="mono">TOKEN #{token.tokenId}</small>
        </div>
        <h2 className="drawer__title" id="token-inspector-title">
          向量切片
        </h2>
        <p className="drawer__en">A CONCEPTUAL 3D PROJECTION</p>
        <p className="drawer__role">
          Token 序列中的第 {token.tokenIndex + 1} 个位置。真实 Embedding 有 {EMBEDDING_DIMENSIONS} 维，这里展示 12
          个概念值，并把整体折叠成一个三维点。
        </p>

        <div className="vector-figure" aria-label="概念向量切片图">
          <div className="vector-figure__axis" aria-hidden="true" />
          <div className="vector-bars">
            {token.slice.map((value, index) => (
              <div className="vector-bars__item" key={index}>
                <span
                  className={`vector-bars__fill ${value >= 0 ? 'is-positive' : 'is-negative'}`}
                  style={{ height: `${Math.max(3, Math.abs(value) * 46)}%` }}
                />
                <i className="vector-bars__zero" aria-hidden="true" />
                <b className="mono">{value.toFixed(2)}</b>
                <em className="mono">d{String(index).padStart(2, '0')}</em>
              </div>
            ))}
          </div>
        </div>

        <dl className="drawer__meta">
          <div>
            <dt>POSITION</dt>
            <dd>{String(token.tokenIndex).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>REAL DIM</dt>
            <dd>{EMBEDDING_DIMENSIONS}</dd>
          </div>
          <div>
            <dt>PROJECTION</dt>
            <dd>
              [{token.position.map((value) => value.toFixed(2)).join(', ')}]
            </dd>
          </div>
        </dl>

        <p className="drawer__unsigned">{CONCEPT_NOTE} 这些数字不是模型权重，也不是一个真实 Embedding 的前 12 维。</p>

        <button className="drawer__secondary drawer__back" type="button" onClick={() => journeyStore.closeOverlay()}>
          返回向量空间
        </button>
      </div>
    </ModalDialog>
  );
}
