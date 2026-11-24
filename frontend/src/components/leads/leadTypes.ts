export interface LeadItem {
  id: number;
  company_name: string;
  country: string;
  city?: string;
  city_or_hub?: string;
  contact_person?: string;
  phone?: string;
  phones?: string;
  email?: string;
  emails?: string;
  website?: string;
  address?: string;
  matched_varieties?: string;
  hs_codes_applicable?: string;
  priority_score: number;
  import_capacity_mt?: number;
  annual_turnover_usd?: string;
  lead_type: string;
  deal_status?: string;
  verified_status?: string;
  source_name?: string;
  source_url?: string;
  merge_count?: number;
  custom_label?: string;
  job_id?: number;
  created_at?: string;
  shipment_volume?: string;
  importer_tier?: string;
  nearest_port?: string;
  customs_manifest_data?: string | any;
  whatsapp_outreach_url?: string;
  linkedin_search_url?: string;
  google_maps_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_company_url?: string;
  state?: string;
  district?: string;
  gstin?: string;
  fssai_or_sfda_status?: string;
}

export interface LeadsAggregations {
  total_importers?: number;
  total_suppliers?: number;
  high_priority_count?: number;
  verified_gst_count?: number;
  countries_count?: number;
  avg_priority_score?: number;
  top_countries?: { country: string; count: number }[];
  top_districts?: { district: string; count: number }[];
}

export interface LeadsApiResponse {
  importers?: LeadItem[];
  suppliers?: LeadItem[];
  leads?: LeadItem[];
  total: number;
  page: number;
  pages: number;
  aggregations?: LeadsAggregations;
}

export interface NewLeadFormData {
  company_name: string;
  country: string;
  city_or_hub: string;
  state?: string;
  district?: string;
  nearest_port?: string;
  shipment_volume?: string;
  contact_person: string;
  phones: string;
  emails: string;
  website?: string;
  gstin?: string;
  matched_varieties: string;
  address: string;
  deal_status: string;
}

export interface DealFormData {
  title: string;
  commodity: string;
  quantity_mt: number;
  incoterm: string;
  payment_terms: string;
  stage_id?: string;
}
