/**
 * OWNER: three —— 仅开发环境使用。
 * `?threePreview=network|constellation` 单独检视章节内嵌 3D 舞台。
 * 生产构建中 NarrativeCanvas 通过 import.meta.env.DEV 关闭此分支。
 *
 * 预览数据全部为合成占位（前缀 DEMO），不代表任何历史事实。
 */
import { useMemo } from 'react';
import type { HistoryEvent, Model } from '../../data';
import ConstellationStage from '../ConstellationStage';
import NetworkStage from '../NetworkStage';
import './dev-preview.css';

type PreviewKind = 'network' | 'constellation';

const DEMO_ORGS = ['demo-org-a', 'demo-org-b', 'demo-org-c', 'demo-org-d', 'demo-org-e'];

function buildDemoEvents(count = 26): HistoryEvent[] {
  return Array.from({ length: count }, (_, index) => {
    const year = 1980 + Math.round((index / (count - 1)) * 31);
    const month = String((index % 12) + 1).padStart(2, '0');
    return {
      id: `demo-event-${index + 1}`,
      date: `${year}-${month}`,
      displayDate: `${year}.${month}`,
      datePrecision: 'month',
      dateType: 'paper',
      title: `DEMO NODE ${String(index + 1).padStart(2, '0')}`,
      category: 'breakthrough',
      summary: 'Preview data — not a historical claim.',
      significance: 'Preview data.',
      organizations: [DEMO_ORGS[index % DEMO_ORGS.length]],
      chapter: 2,
      sources: [],
      verificationStatus: 'unverified',
    };
  });
}

function buildDemoModels(count = 28): Model[] {
  return Array.from({ length: count }, (_, index) => {
    const monthOffset = Math.round((index / (count - 1)) * 23);
    const year = 2023 + Math.floor(monthOffset / 12);
    const month = String((monthOffset % 12) + 1).padStart(2, '0');
    return {
      id: `demo-model-${index + 1}`,
      name: `DEMO-M${String(index + 1).padStart(2, '0')}`,
      organization: DEMO_ORGS[index % DEMO_ORGS.length],
      countryOrRegion: 'DEMO',
      family: 'DEMO FAMILY',
      generation: '1',
      announcementDate: `${year}-${month}`,
      availabilityDate: null,
      displayDate: `${year}.${month}`,
      datePrecision: 'month',
      dateType: 'announcement',
      category: 'language',
      tags: ['demo'],
      openWeights: null,
      architecture: 'DEMO',
      parameters: null,
      contextWindow: null,
      capabilities: [],
      summary: 'Preview data — not a historical claim.',
      keyAdvancement: 'Preview data.',
      significance: 'Preview data.',
      predecessors: [],
      successors: [],
      sources: [],
      verificationStatus: 'unverified',
    };
  });
}

interface StagePreviewProps {
  kind: PreviewKind;
}

export default function StagePreview({ kind }: StagePreviewProps) {
  const events = useMemo(() => buildDemoEvents(), []);
  const models = useMemo(() => buildDemoModels(), []);

  return (
    <div className="dev-preview">
      <header className="dev-preview__bar">
        <span className="dev-preview__title">DEV PREVIEW — {kind.toUpperCase()}</span>
        <span className="dev-preview__note">SYNTHETIC DATA · NOT PRODUCTION</span>
      </header>
      <div className="dev-preview__stage">
        {kind === 'network' ? (
          <NetworkStage
            events={events}
            onSelectEvent={(id) => {
              console.info('[three-preview] event selected', id);
            }}
          />
        ) : (
          <ConstellationStage
            models={models}
            onSelectModel={(id) => {
              console.info('[three-preview] model selected', id);
            }}
          />
        )}
      </div>
    </div>
  );
}
