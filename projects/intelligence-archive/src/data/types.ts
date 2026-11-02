export type DatePrecision = 'day' | 'month' | 'year';

export type DateType =
  | 'paper'
  | 'announcement'
  | 'product'
  | 'api'
  | 'weights'
  | 'conference'
  | 'policy';

export type ModelCategory =
  | 'language'
  | 'reasoning'
  | 'multimodal'
  | 'coding'
  | 'agent'
  | 'image'
  | 'video'
  | 'audio'
  | 'science'
  | 'other';

export type SourceKind = 'official' | 'paper' | 'docs' | 'weights' | 'press' | 'archive';

export type VerificationStatus = 'verified' | 'partially-verified' | 'unverified';

export interface Source {
  label: string;
  url: string;
  kind: SourceKind;
}

export interface Model {
  id: string;
  name: string;
  organization: string;
  countryOrRegion: string;
  family: string;
  generation: string;
  announcementDate: string;
  availabilityDate: string | null;
  displayDate: string;
  datePrecision: DatePrecision;
  dateType: DateType;
  category: ModelCategory;
  tags: string[];
  openWeights: boolean | null;
  architecture: string;
  parameters: string | null;
  contextWindow: string | null;
  capabilities: string[];
  summary: string;
  keyAdvancement: string;
  significance: string;
  predecessors: string[];
  successors: string[];
  sources: Source[];
  verificationStatus: VerificationStatus;
  notes?: string | null;
}

export type EventCategory =
  | 'theory'
  | 'breakthrough'
  | 'system'
  | 'product'
  | 'organization'
  | 'science'
  | 'policy'
  | 'hardware';

export interface HistoryEvent {
  id: string;
  date: string;
  displayDate: string;
  datePrecision: DatePrecision;
  dateType: DateType;
  title: string;
  titleEn?: string;
  category: EventCategory;
  summary: string;
  significance: string;
  organizations: string[];
  people?: string[];
  relatedModels?: string[];
  chapter: number;
  sources: Source[];
  verificationStatus: VerificationStatus;
  notes?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  nameZh: string;
  countryOrRegion: string;
  founded: string;
  focus: string[];
  summary: string;
  sources: Source[];
}

export interface Dataset {
  models: Model[];
  events: HistoryEvent[];
  organizations: Organization[];
}

export interface ChapterMeta {
  index: number;
  slug: string;
  kicker: string;
  title: string;
  titleZh: string;
  startYear: number;
  endYear: number;
  rangeLabel: string;
  theme: string;
  tone: 'paper' | 'void';
}

export interface SearchHit {
  kind: 'model' | 'event';
  id: string;
  title: string;
  subtitle: string;
  date: string;
  displayDate: string;
  verificationStatus: VerificationStatus;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}
