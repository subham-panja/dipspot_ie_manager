import { AccentColor } from '@/context/ThemeContext';

export interface SourceItem {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  country_coverage: string;
  reliability_score: number;
  lead_type: 'importer' | 'supplier';
  is_indian?: boolean;
  is_map_extractor?: boolean;
  enabled: boolean;
}

export interface CompanyProfile {
  company_name: string;
  iec_code: string;
  gstin: string;
  default_currency: string;
  default_unit: string;
  primary_export_port: string;
  support_email: string;
  phone: string;
}

export interface DedupConfig {
  dedup_threshold: number;
  auto_merge_duplicates: boolean;
  conflict_resolution: string;
  phone_crosscheck: boolean;
  tax_crosscheck: boolean;
  ml_model: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  from_name: string;
  from_email: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_verified?: boolean;
  last_tested_at?: string;
  password?: string;
}

export interface WhatsAppConfig {
  provider: string;
  api_token: string;
  phone_number_id: string;
  webhook_url: string;
  personal_daily_cap: number;
  typing_delay_jitter: string;
  auto_stop_opt_out: boolean;
}

export interface TrashLead {
  id: string | number;
  company_name: string;
  country: string;
  lead_type: string;
  deleted_at: string;
}

export type SettingsTabType =
  | 'company'
  | 'sources'
  | 'dedup'
  | 'smtp'
  | 'whatsapp'
  | 'appearance'
  | 'trash';

export const COLOR_SWATCHES: { key: AccentColor; name: string; bg: string; hex: string }[] = [
  { key: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', hex: '#10b981' },
  { key: 'blue', name: 'Sapphire Blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'violet', name: 'Royal Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { key: 'amber', name: 'Warm Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'rose', name: 'Crimson Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
];
