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
  configured?: boolean;
  provider: string;
  phone_number_id: string;
  business_account_id: string;
  webhook_url: string;
  personal_daily_cap: number;
  typing_delay_jitter: string;
  auto_stop_opt_out: boolean;
  has_access_token?: boolean;
  masked_access_token?: string;
  access_token?: string;
  has_webhook_verify_token?: boolean;
  masked_webhook_verify_token?: string;
  webhook_verify_token?: string;
  updated_at?: string | null;
}

export interface ChatwootInboxItem {
  id: number | string;
  name: string;
  channel_type?: string;
}

export interface ChatwootTestResult {
  success: boolean;
  reachable: boolean;
  status_code: number | null;
  inboxes: ChatwootInboxItem[];
  message: string;
}

export interface ChatwootConfig {
  configured?: boolean;
  enabled: boolean;
  base_url: string;
  public_url: string;
  account_id: string;
  email_inbox_id: string;
  whatsapp_inbox_id: string;
  website_inbox_id: string;
  website_token: string;
  has_api_token?: boolean;
  masked_api_token?: string;
  api_access_token?: string;
  has_webhook_secret?: boolean;
  masked_webhook_secret?: string;
  webhook_secret?: string;
  has_website_hmac_secret?: boolean;
  masked_website_hmac_secret?: string;
  website_hmac_secret?: string;
  channels?: {
    email: boolean;
    whatsapp: boolean;
    website: boolean;
  };
  updated_at?: string | null;
}

export interface WhatsAppClearFlags {
  clear_access_token: boolean;
  clear_webhook_verify_token: boolean;
}

export interface ChatwootClearFlags {
  clear_api_token: boolean;
  clear_webhook_secret: boolean;
  clear_website_hmac_secret: boolean;
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
  | 'chatwoot'
  | 'appearance'
  | 'trash';

export const COLOR_SWATCHES: { key: AccentColor; name: string; bg: string; hex: string }[] = [
  { key: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', hex: '#10b981' },
  { key: 'blue', name: 'Sapphire Blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'violet', name: 'Royal Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { key: 'amber', name: 'Warm Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'rose', name: 'Crimson Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
];
