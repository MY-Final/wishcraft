import Provenance from '../../components/common/Provenance';
import { pad2 } from '../../lib/format';
import { trackNodes } from './ch04-data';
import { vars } from './vars';
import './Track.css';

const TOTAL = trackNodes.length;

export default function ModelTrack() {
  return (
    <div className="track" style={vars({ '--n': TOTAL })}>
      <div className="track__strip">
        {trackNodes.map((node, index) => (
          <article
            className={`track__node${node.kind === 'event' ? ' track__node--event' : ''}`}
            key={node.id}
          >
            <header className="track__node-head">
              <span className="track__node-no u-mono">{pad2(index + 1)}</span>
              <span className="track__node-date u-mono">{node.date}</span>
            </header>

            <div className="track__node-body">
              <p className="track__node-kind u-mono">{node.kindLabel}</p>
              <h3 className="track__node-name u-cn">{node.name}</h3>
              <p className="track__node-sub u-mono">{node.subtitle}</p>
              <p className="track__node-org u-meta">{node.org}</p>
              <p className="track__node-text u-cn">{node.body}</p>
            </div>

            <div className="track__node-source">
              <Provenance source={node.source} status={node.status} date={node.date} />
            </div>
          </article>
        ))}
      </div>

      <div className="track__progress">
        <div className="track__progress-line">
          <span className="track__progress-fill" />
        </div>
        <div className="track__progress-meta">
          <span className="u-mono">{pad2(1)}</span>
          <span className="u-mono">SCROLL — MODELS BECOME PRODUCTS</span>
          <span className="u-mono">{pad2(TOTAL)}</span>
        </div>
      </div>
    </div>
  );
}
