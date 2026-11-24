export interface Stage {
  stage_id: string;
  name: string;
  order: number;
  color?: string;
  description?: string;
  is_terminal?: boolean;
}

export interface ModalSmtpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  masked_password?: string;
  has_password?: boolean;
  from_name: string;
  from_email: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_verified?: boolean;
  last_tested_at?: string;
  channels_status?: Record<string, string>;
}

export interface CrawlerSource {
  id: string;
  name: string;
  active: boolean;
  type: string;
}

export interface CrawlerConfig {
  sources: CrawlerSource[];
  target_commodities: string[];
  target_countries: string[];
  crawl_depth_pages: number;
  infinite_pagination: boolean;
  auto_enrichment: boolean;
  request_delay_seconds: number;
  timeout_seconds: number;
}

export interface CompetitorQuote {
  quote_id: string;
  competitor_name: string;
  commodity: string;
  category: string;
  origin_country: string;
  fob_price_usd_mt: number;
  cif_price_usd_mt: number;
  destination_port: string;
  packaging: string;
  payment_terms: string;
  our_price_usd_mt: number;
  spread_usd: number;
  price_advantage: string;
  verified_date: string;
  notes: string;
}
