import { useId, useState } from 'react';
import type { ArchiveFacets } from '../data';
import type { FacetOption } from '../data/types';
import type { ModelFilterKey, ModelFilterState, SortOrder } from './types';
import './ArchiveFilters.css';

interface ArchiveFiltersProps {
  filters: ModelFilterState;
  setFilter: (key: ModelFilterKey, value: string) => void;
  facets: ArchiveFacets;
  statusOptions: FacetOption[];
  sort: SortOrder;
  setSort: (order: SortOrder) => void;
  resultCount: number;
  totalCount: number;
  activeCount: number;
  onClear: () => void;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: FacetOption[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const id = useId();
  return (
    <div className={`arch-filter${value ? ' is-active' : ''}`}>
      <label className="arch-filter__label u-meta" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="arch-filter__select u-mono"
        value={value}
        disabled={options.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">全部</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} · {option.count}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ArchiveFilters({
  filters,
  setFilter,
  facets,
  statusOptions,
  sort,
  setSort,
  resultCount,
  totalCount,
  activeCount,
  onClear,
}: ArchiveFiltersProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const filtered = activeCount > 0;

  return (
    <div className="arch-filters-wrap">
      <div className="arch-filters-wrap__status">
        <p className="arch-count">
          <span className="arch-count__num u-mono">{resultCount}</span>
          <span className="arch-count__label u-meta">
            {filtered ? `/ ${totalCount} 条记录 · 已筛选` : '条记录'}
          </span>
        </p>

        <div className="arch-sort" role="group" aria-label="排序方式">
          <button
            type="button"
            className={`arch-sort__btn${sort === 'asc' ? ' is-active' : ''}`}
            aria-pressed={sort === 'asc'}
            onClick={() => setSort('asc')}
          >
            日期 ↑
          </button>
          <button
            type="button"
            className={`arch-sort__btn${sort === 'desc' ? ' is-active' : ''}`}
            aria-pressed={sort === 'desc'}
            onClick={() => setSort('desc')}
          >
            日期 ↓
          </button>
        </div>

        <button
          type="button"
          className="arch-clear"
          onClick={onClear}
          disabled={!filtered}
          aria-label="清除全部搜索与筛选条件"
        >
          清除筛选
        </button>

        <button
          type="button"
          className="arch-filters__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className="u-meta">FILTERS</span>
          <span className="u-meta">
            {activeCount > 0 ? `${activeCount} ACTIVE` : 'ALL'} {open ? '▲' : '▼'}
          </span>
        </button>
      </div>

      <div id={bodyId} className="arch-filters" data-open={open ? 'true' : undefined}>
        <FilterSelect
          label="YEAR / 年份"
          value={filters.year}
          options={facets.years}
          onChange={(value) => setFilter('year', value)}
        />
        <FilterSelect
          label="ORG / 机构"
          value={filters.organization}
          options={facets.organizations}
          onChange={(value) => setFilter('organization', value)}
        />
        <FilterSelect
          label="FAMILY / 家族"
          value={filters.family}
          options={facets.families}
          onChange={(value) => setFilter('family', value)}
        />
        <FilterSelect
          label="CATEGORY / 类别"
          value={filters.category}
          options={facets.categories}
          onChange={(value) => setFilter('category', value)}
        />
        <FilterSelect
          label="COUNTRY / 地区"
          value={filters.country}
          options={facets.countries}
          onChange={(value) => setFilter('country', value)}
        />
        <FilterSelect
          label="STATUS / 核实"
          value={filters.status}
          options={statusOptions}
          onChange={(value) => setFilter('status', value)}
        />
      </div>
    </div>
  );
}
