export interface MessageTemplate {
  _id?: string;
  template_id: string;
  name: string;
  category?: string;
  channel: 'Email' | 'WhatsApp' | 'SMS';
  subject?: string;
  body: string;
  variables: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DispatchRecord {
  _id?: string;
  dispatch_id: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  status: string;
  mode?: string;
  host?: string;
  port?: number;
  segments?: number;
  chars?: number;
  sent_at: string;
}

export interface LeadSample {
  company_name: string;
  contact_person: string;
  commodity: string;
  country: string;
  nearest_port: string;
  emails?: string;
  phones?: string;
}

export const TOKEN_SUGGESTIONS = [
  { token: '{company_name}', desc: 'Company or Buyer Name' },
  { token: '{contact_name}', desc: 'Key Decision Maker' },
  { token: '{commodity}', desc: 'Target Commodity Spec' },
  { token: '{country}', desc: 'Destination Country' },
  { token: '{port}', desc: 'Discharge / Loading Port' },
  { token: '{quantity_mt}', desc: 'Consignment Volume in MT' },
  { token: '{price_per_mt}', desc: 'Indicative Price per MT' },
  { token: '{incoterm}', desc: 'Incoterm (CIF / FOB)' },
  { token: '{payment_terms}', desc: 'Banking Terms (100% L/C at Sight)' },
  { token: '{tracking_link}', desc: 'Public Cargo Tracker URL' },
  { token: '{today_date}', desc: 'Current Trade Date' },
  { token: '{validity_days}', desc: 'Quote Validity Window' },
];

export const PREBUILT_SNIPPETS = [
  {
    label: 'Specs Table',
    snippet: '\n\nCOMMODITY SPECIFICATIONS:\n• Quality: Sortex 100% Cleaned, Silky Polished\n• Moisture: Max 14.0% | Broken Grains: Max 5.0%\n• Packing: 50kg Heavy-Duty Export PP Bags\n• Surveyor: Pre-shipment Certificate by SGS / Bureau Veritas\n',
  },
  {
    label: 'L/C Payment Clause',
    snippet: '\n\nPAYMENT & CONTRACT TERMS:\n• Payment: 100% Irrevocable Letter of Credit (L/C) at Sight from Tier-1 Bank\n• Tolerance: +/- 5% in Quantity & Credit Value (UCP 600 Art. 30b)\n• Shipment Window: 14 business days from authenticated L/C receipt\n',
  },
  {
    label: 'Tracking Portal CTA',
    snippet: '\n\nLIVE CONSIGNMENT PROGRESSION:\nYou can monitor vessel GPS positions, CFS gate-in, and B/L issuance directly at:\n{tracking_link}\n',
  },
  {
    label: 'Quality Guarantee',
    snippet: '\n\nAPEDA & EXPORT ACCREDITATION:\nAll export lots conform strictly to APEDA, DGFT, and ISO 22000 quality standards with phytosanitary and fumigation quarantine clearance.\n',
  },
];

export const DEFAULT_SAMPLE_LEAD: LeadSample = {
  company_name: 'Al-Dhiyafa Foodstuff Trading LLC',
  contact_person: 'Tariq Mansoor',
  commodity: 'IR-64 Parboiled Rice 5% Broken',
  country: 'United Arab Emirates',
  nearest_port: 'Jebel Ali Port (AEJEA)',
  emails: 'procurement@al-dhiyafa-uae.com',
  phones: '+971 4 223 8810',
};

export const CATEGORIES_LIST = [
  'All',
  'Soft Offer',
  'Cold Outreach',
  'Shipping Update',
  'L/C Advising',
  'Price Revision',
  'Quick Quote',
];
