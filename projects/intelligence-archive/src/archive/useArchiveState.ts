import { useCallback, useMemo, useState } from 'react';
import { archiveFacets, events, models, searchArchive } from '../data';
import type { HistoryEvent, Model, SearchHit } from '../data/types';
import { orgText, verificationFacets } from './data-utils';
import { applyModelFilters, countActiveFilters, eventMatchesQuery, sortModelsByDate } from './logic';
import {
  EMPTY_MODEL_FILTERS,
  type ModelFilterKey,
  type ModelFilterState,
  type SortOrder,
} from './types';

export interface ArchiveState {
  filters: ModelFilterState;
  setFilter: (key: ModelFilterKey, value: string) => void;
  clearFilters: () => void;
  sort: SortOrder;
  setSort: (order: SortOrder) => void;
  visibleModels: Model[];
  visibleEvents: HistoryEvent[];
  suggestions: SearchHit[];
  facets: ReturnType<typeof archiveFacets>;
  statusOptions: ReturnType<typeof verificationFacets>;
  activeFilterCount: number;
}

export function useArchiveState(): ArchiveState {
  const [filters, setFilters] = useState<ModelFilterState>(EMPTY_MODEL_FILTERS);
  const [sort, setSort] = useState<SortOrder>('asc');

  const setFilter = useCallback((key: ModelFilterKey, value: string) => {
    setFilters((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_MODEL_FILTERS), []);

  const facets = useMemo(() => archiveFacets(), []);
  const statusOptions = useMemo(() => verificationFacets(), []);

  const visibleModels = useMemo(
    () => sortModelsByDate(applyModelFilters(models, filters, orgText), sort),
    [filters, sort],
  );

  const visibleEvents = useMemo(
    () => events.filter((event) => eventMatchesQuery(event, filters.query, orgText)),
    [filters.query],
  );

  const suggestions = useMemo(
    () => (filters.query.trim() ? searchArchive(filters.query, 8) : []),
    [filters.query],
  );

  return {
    filters,
    setFilter,
    clearFilters,
    sort,
    setSort,
    visibleModels,
    visibleEvents,
    suggestions,
    facets,
    statusOptions,
    activeFilterCount: countActiveFilters(filters),
  };
}
