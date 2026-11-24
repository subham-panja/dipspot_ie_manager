export type IntelligenceTab = 'competitors' | 'quotes' | 'freight' | 'pricing' | 'tariffs';

export interface IntelligenceSummary {
  total_tracked_competitors: number;
  total_monitored_freight_routes: number;
  total_commodity_benchmarks: number;
  total_tariff_codes: number;
  avg_freight_rate_20ft_usd: number;
  avg_fob_price_usd_mt: number;
  total_competitor_monthly_volume_mt: number;
}

export interface Competitor {
  company_name: string;
  hq_country: string;
  estimated_volume_mt_month: number;
  core_varieties: string;
  primary_export_markets: string[];
  export_ports: string[];
  pricing_strategy: string;
  market_share_tier: string;
  strengths: string;
  vulnerabilities: string;
}

export interface FreightRoute {
  origin_port: string;
  destination_port: string;
  rate_20ft_usd: number;
  rate_40ft_usd: number;
  transit_days: number;
  carrier: string;
  trend: string;
}

export interface PriceBenchmark {
  commodity: string;
  grade: string;
  fob_price_usd_mt: number;
  cif_jebel_ali_usd_mt: number;
  change_wow_usd: string;
  trend: string;
}

export interface TariffRule {
  hs_code: string;
  description: string;
  indian_export_duty_pct: number;
  mep_usd_mt: number | null;
  apeda_registration: string;
  gulf_sfda_requirements: string;
}

export interface CompetitorQuote {
  quote_id: string;
  competitor_name: string;
  commodity: string;
  origin_port: string;
  fob_price_usd_mt: number;
  cif_price_usd_mt: number;
  payment_terms: string;
  valid_until?: string;
  spread_vs_tradepulse: number;
  notes: string;
}

export type CompetitorFormData = Omit<Competitor, 'primary_export_markets' | 'export_ports'> & {
  primary_export_markets: string;
  export_ports: string;
};

export type QuoteFormData = Omit<CompetitorQuote, 'quote_id' | 'valid_until'>;
export type RouteFormData = FreightRoute;
export type PriceFormData = PriceBenchmark;
