import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArchiveEvents } from '../archive/ArchiveEvents';
import { ArchiveFilters } from '../archive/ArchiveFilters';
import { ArchiveHeader } from '../archive/ArchiveHeader';
import { ArchiveSearch } from '../archive/ArchiveSearch';
import { ArchiveTable } from '../archive/ArchiveTable';
import { ArchiveTabs } from '../archive/ArchiveTabs';
import { ArchiveTimeline } from '../archive/ArchiveTimeline';
import { EmptyState } from '../archive/EmptyState';
import { EventDialog } from '../archive/EventDialog';
import { ModelDialog } from '../archive/ModelDialog';
import type { ArchiveTab } from '../archive/types';
import { useArchiveDeepLink } from '../archive/useArchiveDeepLink';
import { useArchiveState } from '../archive/useArchiveState';
import {
  ARCHIVE_CUTOFF,
  chapters,
  events,
  getEvent,
  getModel,
  models,
  organizations,
} from '../data';
import './ArchiveView.css';

interface ArchiveViewProps {
  initialModelId?: string;
  initialTab?: string;
}

interface InitialRoute {
  tab: ArchiveTab;
  modelId: string | null;
  notice: string | null;
}

const TABS: ArchiveTab[] = ['database', 'timeline', 'events'];

function isTab(value: string | undefined): value is ArchiveTab {
  return value !== undefined && TABS.includes(value as ArchiveTab);
}

/**
 * props.initialModelId 既可能是模型 id（#/archive/<id>），也可能是导航入口的 tab 关键字
 * （TopNav 的 #/archive/timeline）。两者都要支持。
 */
function resolveInitialRoute(initialModelId?: string, initialTab?: string): InitialRoute {
  const tabFromProp = isTab(initialTab) ? initialTab : undefined;
  if (!initialModelId) {
    return { tab: tabFromProp ?? 'database', modelId: null, notice: null };
  }
  if (isTab(initialModelId)) {
    return { tab: initialModelId, modelId: null, notice: null };
  }
  if (getModel(initialModelId)) {
    return { tab: tabFromProp ?? 'database', modelId: initialModelId, notice: null };
  }
  return {
    tab: tabFromProp ?? 'database',
    modelId: null,
    notice: `DEEP LINK NOT FOUND · ${initialModelId}`,
  };
}

export default function ArchiveView({ initialModelId, initialTab }: ArchiveViewProps) {
  const initial = useMemo(
    () => resolveInitialRoute(initialModelId, initialTab),
    [initialModelId, initialTab],
  );
  const state = useArchiveState();
  const [tab, setTab] = useState<ArchiveTab>(initial.tab);
  const [modelId, setModelId] = useState<string | null>(initial.modelId);
  const [eventId, setEventId] = useState<string | null>(null);

  useArchiveDeepLink(modelId);

  // 站内导航（例如点击 TopNav 的 TIMELINE / ARCHIVE）只改变 hash，不会重建组件，这里同步一次。
  useEffect(() => {
    if (isTab(initialModelId)) setTab(initialModelId);
    else if (initialModelId && getModel(initialModelId)) setModelId(initialModelId);
    else if (isTab(initialTab)) setTab(initialTab);
    else setTab('database');
  }, [initialModelId, initialTab]);

  const model = modelId ? getModel(modelId) : undefined;
  const event = eventId ? getEvent(eventId) : undefined;

  const openModel = useCallback((id: string) => {
    setEventId(null);
    setModelId(id);
  }, []);
  const openEvent = useCallback((id: string) => {
    setModelId(null);
    setEventId(id);
  }, []);
  const openEventFromSearch = useCallback((id: string) => {
    setTab('events');
    openEvent(id);
  }, [openEvent]);
  const closeOverlay = useCallback(() => {
    setModelId(null);
    setEventId(null);
  }, []);

  // 档案区间以策展覆盖范围为准（事件自 1950 起），模型起点单独标注。
  const rangeLabel = useMemo(() => {
    const startYear = chapters[1]?.startYear ?? 1950;
    return `${startYear} — ${ARCHIVE_CUTOFF.slice(0, 4)}`;
  }, []);
  const modelsFrom = models.length ? models[0].announcementDate.slice(0, 4) : null;

  const hasQuery = state.filters.query.trim().length > 0;
  const archiveEmpty = models.length === 0 && events.length === 0;
  const noModelResults = state.visibleModels.length === 0;

  return (
    <main className="archive-view">
      <ArchiveHeader
        modelCount={models.length}
        eventCount={events.length}
        organizationCount={organizations.length}
        rangeLabel={rangeLabel}
        cutoff={ARCHIVE_CUTOFF}
        modelsFrom={modelsFrom}
        notice={initial.notice}
      />

      <div className="arch-sticky u-container">
        <ArchiveTabs
          tab={tab}
          onChange={setTab}
          modelCount={models.length}
          eventCount={events.length}
        />
        <div className="arch-sticky__toolbar">
          <ArchiveSearch
            value={state.filters.query}
            onChange={(value) => state.setFilter('query', value)}
            suggestions={state.suggestions}
            onSelectModel={openModel}
            onSelectEvent={openEventFromSearch}
          />
        </div>
      </div>

      <div className="arch-filterbar u-container">
        {tab === 'events' ? (
          <p className="arch-toolbar__count u-meta">
            {state.visibleEvents.length} EVENTS
            {hasQuery ? ' · 已搜索' : ''}
          </p>
        ) : (
          <ArchiveFilters
            filters={state.filters}
            setFilter={state.setFilter}
            facets={state.facets}
            statusOptions={state.statusOptions}
            sort={state.sort}
            setSort={state.setSort}
            resultCount={state.visibleModels.length}
            totalCount={models.length}
            activeCount={state.activeFilterCount}
            onClear={state.clearFilters}
          />
        )}
      </div>

      <section
        className="arch-results u-container"
        id="archive-panel"
        role="tabpanel"
        aria-labelledby={`archive-tab-${tab}`}
      >
        {tab === 'events' ? (
          state.visibleEvents.length ? (
            <ArchiveEvents events={state.visibleEvents} onOpen={openEvent} />
          ) : (
            <EmptyState
              kicker={archiveEmpty ? 'EVENTS EMPTY' : 'NO MATCH'}
              title={
                archiveEmpty
                  ? '事件档案正在编目'
                  : hasQuery
                    ? `没有匹配「${state.filters.query.trim()}」的事件`
                    : '没有可显示的事件'
              }
              body={
                archiveEmpty
                  ? '历史事件仍在核实与整合中。核实完成后，事件会按章节编入此处：达特茅斯会议、两次寒冬、AlphaGo、Transformer、生成式 AI 监管……'
                  : '搜索同时匹配事件标题、机构、人物与摘要。也可以清除条件后浏览全部事件。'
              }
              hints={
                hasQuery
                  ? ['试试机构中文名（如 智谱、月之暗面）或人物名（如 Geoffrey Hinton）。']
                  : undefined
              }
              action={hasQuery ? { label: '清除搜索', onClick: state.clearFilters } : undefined}
            />
          )
        ) : noModelResults ? (
          <EmptyState
            kicker={archiveEmpty ? 'ARCHIVE EMPTY' : 'NO MATCH'}
            title={
              archiveEmpty
                ? '档案正在编目'
                : hasQuery
                  ? `没有匹配「${state.filters.query.trim()}」的模型`
                  : '当前筛选条件下没有模型'
            }
            body={
              archiveEmpty
                ? '研究数据仍在核实与整合中。核实完成后，模型与事件记录会按真实发布日期编入此处；档案不会用推测内容填充空位。'
                : '档案只陈列有公开来源的记录。搜索会同时匹配模型名、机构、家族、类别、标签与摘要，也可以放宽某一个筛选条件。'
            }
            hints={
              archiveEmpty
                ? ['数据截止 2026.11.02。']
                : [
                    '试试 GPT、Claude、DeepSeek、Qwen、GLM、Gemini、Kimi、MiniMax。',
                    '支持机构中文名，例如 智谱、月之暗面、深度求索、通义千问。',
                  ]
            }
            action={
              hasQuery || state.activeFilterCount > 0
                ? { label: '清除筛选', onClick: state.clearFilters }
                : undefined
            }
          />
        ) : tab === 'database' ? (
          <ArchiveTable models={state.visibleModels} onOpen={openModel} />
        ) : (
          <ArchiveTimeline models={state.visibleModels} onOpen={openModel} />
        )}
      </section>

      <footer className="arch-footer u-container">
        <p className="u-meta">
          {models.length} MODELS · {events.length} EVENTS · CUTOFF{' '}
          {ARCHIVE_CUTOFF.replaceAll('-', '.')}
        </p>
        <a className="u-link u-meta" href="#/about">
          数据说明 / METHOD
        </a>
      </footer>

      {model ? <ModelDialog model={model} onClose={closeOverlay} onNavigate={openModel} /> : null}
      {event ? (
        <EventDialog event={event} onClose={closeOverlay} onOpenModel={openModel} />
      ) : null}
    </main>
  );
}
