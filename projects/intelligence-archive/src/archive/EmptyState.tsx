import './EmptyState.css';

interface EmptyStateProps {
  kicker: string;
  title: string;
  body: string;
  hints?: string[];
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ kicker, title, body, hints, action }: EmptyStateProps) {
  return (
    <div className="arch-empty" role="status">
      <p className="arch-empty__kicker u-meta">{kicker}</p>
      <p className="arch-empty__title">{title}</p>
      <p className="arch-empty__body u-cn">{body}</p>
      {hints?.length ? (
        <ul className="arch-empty__hints">
          {hints.map((hint) => (
            <li key={hint} className="u-caption">
              {hint}
            </li>
          ))}
        </ul>
      ) : null}
      {action ? (
        <button type="button" className="arch-empty__action" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
