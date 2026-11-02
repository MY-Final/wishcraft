import type { Model } from '../data/types';

export type ArchiveTab = 'database' | 'timeline' | 'events';

export type SortOrder = 'asc' | 'desc';

export interface ModelFilterState {
  query: string;
  year: string;
  organization: string;
  family: string;
  category: string;
  country: string;
  status: string;
}

export const EMPTY_MODEL_FILTERS: ModelFilterState = {
  query: '',
  year: '',
  organization: '',
  family: '',
  category: '',
  country: '',
  status: '',
};

export type ModelFilterKey = keyof ModelFilterState;

export interface RelationNode {
  model: Model;
  depth: number;
  row: number;
}

export interface RelationEdge {
  from: string;
  to: string;
}

export interface RelationGraphData {
  nodes: RelationNode[];
  edges: RelationEdge[];
  hasEdges: boolean;
  truncated: boolean;
  columns: number;
}
