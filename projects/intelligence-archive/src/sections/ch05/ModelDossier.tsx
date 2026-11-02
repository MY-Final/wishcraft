import Provenance from '../../components/common/Provenance';
import { categoryLabel, getOrgName, modelEdges, type Model } from '../../data';

interface ModelDossierProps {
  model: Model;
  onSelect: (id: string) => void;
}

export default function ModelDossier({ model, onSelect }: ModelDossierProps) {
  const { predecessors, successors } = modelEdges(model);

  return (
    <aside className="ch05__dossier" aria-live="polite" aria-label={`档案：${model.name}`}>
      <div className="ch05__dossier-head">
        <span className="u-meta">ARCHIVE RECORD</span>
        <span className="ch05__dossier-date u-mono">{model.displayDate}</span>
      </div>

      <h3 className="ch05__dossier-name">{model.name}</h3>

      <dl className="ch05__dossier-meta">
        <div>
          <dt className="u-meta">机构</dt>
          <dd>{getOrgName(model.organization)}</dd>
        </div>
        <div>
          <dt className="u-meta">家族</dt>
          <dd>{model.family}</dd>
        </div>
        <div>
          <dt className="u-meta">类别</dt>
          <dd>{categoryLabel(model.category)}</dd>
        </div>
        <div>
          <dt className="u-meta">权重</dt>
          <dd>{model.openWeights === true ? '开放' : model.openWeights === false ? '未公开' : '未知'}</dd>
        </div>
      </dl>

      <p className="ch05__dossier-adv">{model.keyAdvancement}</p>
      <p className="ch05__dossier-summary">{model.summary}</p>

      <Provenance
        source={model.sources[0]}
        status={model.verificationStatus}
        date={model.displayDate}
      />

      <div className="ch05__dossier-edges">
        <span className="ch05__dossier-edge-group">
          <span className="u-meta">前代</span>
          {predecessors.length === 0 && <span className="ch05__dossier-none">—</span>}
          {predecessors.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ch05__edge-link"
              onClick={() => onSelect(item.id)}
              title={`${item.name} · ${item.displayDate}`}
            >
              {item.name}
            </button>
          ))}
        </span>
        <span className="ch05__dossier-edge-group ch05__dossier-edge-group--next">
          <span className="u-meta">后续</span>
          {successors.length === 0 && <span className="ch05__dossier-none">—</span>}
          {successors
            .filter((item) => item.announcementDate <= '2024-12-31')
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className="ch05__edge-link"
                onClick={() => onSelect(item.id)}
                title={`${item.name} · ${item.displayDate}`}
              >
                {item.name}
              </button>
            ))}
        </span>
      </div>
    </aside>
  );
}
