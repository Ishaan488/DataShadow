// ─── MyShadow Core Types ───

export type DataSource =
  | 'google_search'
  | 'youtube'
  | 'location'
  | 'browser_history'
  | 'email'
  | 'social_media'
  | 'unknown';

export type EventCategory =
  | 'search'
  | 'video'
  | 'location'
  | 'browsing'
  | 'communication'
  | 'social'
  | 'financial'
  | 'health'
  | 'shopping'
  | 'travel'
  | 'other';

export type EntityType = 'person' | 'location' | 'topic' | 'organization' | 'financial';

export interface ShadowEvent {
  id: string;
  timestamp: number; // Unix ms
  source: DataSource;
  category: EventCategory;
  title: string;
  details: string;
  entities: string[]; // entity IDs
  rawData?: unknown;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  mentions: number;
  firstSeen: number;
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface EntityEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface EntityGraph {
  nodes: Entity[];
  edges: EntityEdge[];
}

export interface RiskScore {
  overall: number;        // 0-100
  piiDensity: number;     // 0-100
  locationLeakage: number;// 0-100
  financialExposure: number; // 0-100
  socialMapping: number;  // 0-100
}

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ThreatNarrative {
  id: string;
  title: string;
  severity: ThreatSeverity;
  narrative: string;
  attackVector: string;
  simulatedEmail?: string;
  socialEngScript?: string;
  mitigations: string[];
}

export interface UploadedFile {
  name: string;
  source: DataSource;
  events: ShadowEvent[];
  size: number;
}

export interface ShadowState {
  files: UploadedFile[];
  events: ShadowEvent[];
  entities: Entity[];
  edges: EntityEdge[];
  riskScore: RiskScore | null;
  threats: ThreatNarrative[];
  apiKey: string;
  isProcessing: boolean;
  currentStep: string;
  isAnalyzed: boolean;
}
