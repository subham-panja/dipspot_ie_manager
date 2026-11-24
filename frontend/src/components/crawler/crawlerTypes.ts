export interface CrawlerSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  country_coverage: string;
  reliability_score: number;
  lead_type: string;
  enabled?: boolean;
  is_dork_extractor?: boolean;
  is_map_extractor?: boolean;
}

export interface CrawlerJobLog {
  timestamp: string;
  level: string;
  message: string;
  url?: string;
  latency_ms?: number;
  elapsed_seconds: number;
}

export interface CrawlerJob {
  _id?: string;
  job_id: number;
  lead_type: string;
  country?: string;
  commodity?: string;
  depth?: number;
  custom_label?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_pct: number;
  current_step: string;
  current_url?: string;
  leads_found: number;
  inserted_count?: number;
  merged_count?: number;
  total_discovered?: number;
  elapsed_seconds?: number;
  created_at?: string;
  updated_at?: string;
  logs?: CrawlerJobLog[];
}

export interface LeadPreviewItem {
  id: number | string;
  company_name: string;
  country: string;
  city_or_hub?: string;
  matched_varieties?: string;
  lead_type: string;
  emails?: string;
  phones?: string;
  website?: string;
  priority_score?: number;
}

export interface PortPreset {
  country: string;
  city: string;
  portName: string;
  flag?: string;
}

export const DEPTH_PRESETS = [
  { value: 15, label: 'Quick 15', desc: 'Rapid spot check across top hubs' },
  { value: 50, label: 'Standard 50', desc: 'Balanced discovery across key directories' },
  { value: 100, label: 'Deep 100', desc: 'Comprehensive multi-source penetration' },
  { value: 200, label: 'Scale 200', desc: 'Full regional trade corridor harvest' },
];

export const COMMODITY_PRESETS = [
  'Basmati Rice 1121',
  'IR-64 Parboiled Rice',
  'Swarna Non-Basmati',
  'Sona Masoori Rice',
  'Organic Wheat',
  'Yellow Maize',
  'Spices & Cumin Seeds',
];

export const SOURCE_CATEGORIES = [
  { id: 'all', label: 'All Sources' },
  { id: 'b2b', label: 'B2B Trade Portals' },
  { id: 'customs', label: 'Customs & Port Manifests' },
  { id: 'gov', label: 'Government Trade Boards' },
  { id: 'geo', label: 'Geospatial & Map Registries' },
];
