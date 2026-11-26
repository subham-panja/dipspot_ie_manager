export interface CustomerLead {
  id: number | string;
  company_name: string;
  country: string;
  city?: string;
  city_or_hub?: string;
  contact_person?: string;
  phones?: string;
  emails?: string;
  website?: string;
  address?: string;
  matched_varieties?: string;
  commodities_list?: string[];
  hs_codes_applicable?: string;
  priority_score: number;
  lead_type: string;
  category_or_role?: string;
  deal_status?: string;
  verified_status?: string;
  import_capacity_mt?: number;
  annual_turnover_usd?: string;
  gstin?: string;
  pan?: string;
  fssai_or_sfda_status?: string;
  state?: string;
  origin_state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  nearest_port?: string;
  trade_role?: string;
  annual_volume_est?: string;
  risk_tier?: string;
  key_trade_lanes?: string[];
  duplicate_probability?: number;
  duplicate_status?: string;
  source_name?: string;
  source_url?: string;
  source_category?: string;
  source_reliability?: number;
  b2b_directory?: string;
  harvest_date?: string;
  created_at?: string;
  updated_at?: string;
  contacts_count?: number;
  custom_label?: string;
  extraction_notes?: string;
  merge_count?: number;
  merged_history?: any[];
  shipment_volume?: string;
  importer_tier?: string;
  whatsapp_outreach_url?: string;
  linkedin_search_url?: string;
  google_maps_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_company_url?: string;
  customs_manifest_data?: string | Record<string, any>;
  primary_email?: string;
  secondary_email?: string;
  direct_phone?: string;
  whatsapp_url?: string;
  linkedin_persona_url?: string;
  linkedin_profile_url?: string;
  corporate_contact_page_url?: string;
  contact_page_url?: string;
  github_url?: string;
}

export interface ContactCompanyLink {
  lead_id: string | number;
  company_name: string;
  country?: string;
  role_at_company?: string;
  is_primary?: boolean;
}

export interface CompanyContact {
  id: string;
  contact_id: string;
  full_name: string;
  job_title?: string;
  email?: string;
  phone?: string;
  whatsapp_url?: string;
  linkedin_profile_url?: string;
  source?: string;
  verified?: boolean;
  role_at_company?: string;
  is_primary?: boolean;
  companies?: ContactCompanyLink[];
  created_at?: string;
  updated_at?: string;
}

export interface XrayProfile {
  name: string;
  title: string;
  company: string;
  profile_url: string;
  platform: string;
  snippet: string;
}

export interface XrayFallbacks {
  linkedin_keyword_search_url?: string;
  search_urls?: {
    google?: string;
    bing?: string;
    duckduckgo?: string;
  };
  corporate_contact_urls?: string[];
  message?: string;
}

export interface XraySearchResponse {
  success: boolean;
  company_name: string;
  country: string;
  platform: string;
  query: string;
  engine_used: string;
  status: 'live_results' | 'no_results' | 'rate_limited_or_offline';
  fallback_used: boolean;
  count: number;
  profiles: XrayProfile[];
  persisted_contacts?: CompanyContact[];
  fallbacks?: XrayFallbacks;
}

export interface LeadNote {
  _id?: string;
  id: string;
  note_id?: string;
  lead_id: string | number;
  author?: string;
  text: string;
  tag?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  author?: string;
  tag?: string;
  channel?: string;
  status?: string;
  timestamp: string;
}

export interface OutreachMessage {
  id: string;
  source?: string;
  channel: string;
  direction: string;
  subject?: string;
  content: string;
  recipient?: string;
  contact_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  status?: string;
  intent?: string;
  timestamp: string;
}

export interface OutreachEnrollment {
  _id?: string;
  enrollment_id?: string;
  campaign_id: string;
  campaign_name?: string;
  contact_id?: string;
  contact_name?: string;
  enrollment_mode?: string;
  status?: string;
  enrolled_at?: string;
}

export interface OutreachHistoryResponse {
  lead_id: string | number;
  company_name: string;
  messages: OutreachMessage[];
  dispatches?: any[];
  enrollments: OutreachEnrollment[];
  cadence_enrollment: any | null;
  cadence_enrollments?: any[];
  total: number;
}

export interface CustomerDossierProps {
  customer: CustomerLead | null;
  onClose: () => void;
  onConvertToDeal?: (customer: CustomerLead) => void;
  onConvert?: (customer?: any) => void;
  onEnroll?: (customer: CustomerLead, initialContactId?: string) => void;
  onUpdated?: (updated: CustomerLead) => void;
  isEnrollModalOpen?: boolean;
}
