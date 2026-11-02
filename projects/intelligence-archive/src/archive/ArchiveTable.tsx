import { categoryLabel } from '../data';
import type { Model } from '../data/types';
import { orgName } from './data-utils';
import { dateParts } from './logic';
import { countryName } from './labels';
import { VerificationBadge } from './DetailBits';
import './ArchiveTable.css';

interface ArchiveTableProps {
  models: Model[];
  onOpen: (id: string) => void;
}

function DateCell({ model }: { model: Model }) {
  const parts = dateParts(model.displayDate);
  if (parts.year !== '2026') {
    return <span className="u-mono">{model.displayDate}</span>;
  }
  return (
    <span className="arch-date-split u-mono">
      <span className="arch-date-split__year">{parts.year}</span>
      {parts.month ? (
        <span className="arch-date-split__rest">
          / {parts.month}
          {parts.day ? ` / ${parts.day}` : ''}
        </span>
      ) : null}
    </span>
  );
}

export function ArchiveTable({ models, onOpen }: ArchiveTableProps) {
  return (
    <>
      <div className="arch-table-wrap">
        <table className="arch-table">
          <caption className="sr-only">
            模型档案列表，包含日期、名称、机构、家族、类别、关键进展与核实状态
          </caption>
          <thead>
            <tr>
              <th scope="col" className="u-meta">
                日期
              </th>
              <th scope="col" className="u-meta">
                名称
              </th>
              <th scope="col" className="u-meta">
                机构
              </th>
              <th scope="col" className="u-meta">
                家族
              </th>
              <th scope="col" className="u-meta">
                类别
              </th>
              <th scope="col" className="u-meta">
                关键进展
              </th>
              <th scope="col" className="u-meta">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr
                key={model.id}
                className={`arch-table__row${model.announcementDate.startsWith('2026') ? ' is-2026' : ''}`}
                onClick={() => onOpen(model.id)}
              >
                <td className="arch-table__date">
                  <DateCell model={model} />
                </td>
                <th scope="row" className="arch-table__name">
                  <button
                    type="button"
                    className="arch-table__open"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(model.id);
                    }}
                  >
                    {model.name}
                  </button>
                  {model.tags.length ? (
                    <span className="arch-table__tags u-mono">{model.tags.slice(0, 2).join(' · ')}</span>
                  ) : null}
                </th>
                <td>
                  <span className="arch-table__org">{orgName(model.organization)}</span>
                  <span className="arch-table__sub u-mono">{countryName(model.countryOrRegion)}</span>
                </td>
                <td>
                  <span>{model.family}</span>
                  <span className="arch-table__sub u-mono">{model.generation}</span>
                </td>
                <td className="arch-table__category">{categoryLabel(model.category)}</td>
                <td className="arch-table__advance">
                  <span className="u-cn">{model.keyAdvancement}</span>
                </td>
                <td className="arch-table__status">
                  <VerificationBadge status={model.verificationStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="arch-cards" aria-label="模型档案列表">
        {models.map((model) => (
          <li key={model.id}>
            <button
              type="button"
              className="arch-card"
              onClick={() => onOpen(model.id)}
              aria-label={`查看 ${model.name} 档案详情`}
            >
              <span className="arch-card__top">
                <span className="arch-card__date u-mono">{model.displayDate}</span>
                <VerificationBadge status={model.verificationStatus} />
              </span>
              <span className="arch-card__name">{model.name}</span>
              <span className="arch-card__meta u-mono">
                {orgName(model.organization)} · {model.family} {model.generation} ·{' '}
                {categoryLabel(model.category)}
              </span>
              <span className="arch-card__advance u-cn">{model.keyAdvancement}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
