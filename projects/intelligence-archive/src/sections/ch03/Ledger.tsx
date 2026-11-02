import Provenance from '../../components/common/Provenance';
import { chapters } from '../../data';
import { pad2 } from '../../lib/format';
import { ledgerRecords } from './ch03-data';
import { vars } from './vars';
import './Ledger.css';

const meta = chapters[3];
const TOTAL = ledgerRecords.length;
const SPAN = Math.max(TOTAL - 1, 1);

/** 每一板在 --lp 轴上的窗口：中心最亮，进入/退出交界处交叉淡入淡出。 */
function windowVars(index: number) {
  return vars({
    '--i': String(index),
    '--k': String(SPAN),
    '--w': String((index - 0.9) / SPAN),
    '--w2': String((index + 0.75) / SPAN),
  });
}

export default function Ledger() {
  return (
    <div className="ledger">
      <div className="ledger__stream">
        {ledgerRecords.map((record, index) => (
          <article className="ledger__plate" key={record.id} style={windowVars(index)}>
            <div className="ledger__year-col">
              <p className="ledger__no u-mono">
                RECORD {pad2(index + 1)}
                <span aria-hidden="true"> / {pad2(TOTAL)}</span>
              </p>
              <p className="ledger__year u-year">{record.year}</p>
              <p className="ledger__orgs u-meta">{record.orgs}</p>
            </div>

            <div className="ledger__body">
              <p className="ledger__mark u-mono">{record.mark}</p>
              <h3 className="ledger__title u-cn">{record.event.title}</h3>
              {record.event.titleEn && (
                <p className="ledger__title-en u-mono">{record.event.titleEn}</p>
              )}

              <dl className="ledger__facts">
                <dt>SUMMARY</dt>
                <dd className="ledger__summary u-cn">{record.event.summary}</dd>
                <dt>SIGNIFICANCE</dt>
                <dd className="ledger__sig u-cn">{record.event.significance}</dd>
              </dl>

              <div className="ledger__source">
                <Provenance
                  source={record.event.sources[0]}
                  status={record.event.verificationStatus}
                  date={record.event.displayDate}
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="ledger__index">
        <p className="ledger__index-head u-mono">
          {pad2(TOTAL)} RECORDS · {meta.rangeLabel}
        </p>
        <ol className="ledger__index-list" aria-hidden="true">
          {ledgerRecords.map((record, index) => (
            <li className="ledger__index-item" key={record.id} style={windowVars(index)}>
              <span className="ledger__index-no u-mono">{pad2(index + 1)}</span>
              <span className="ledger__index-mark u-mono">{record.mark}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
