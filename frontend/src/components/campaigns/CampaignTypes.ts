export interface Campaign {
  campaign_id: string;
  name: string;
  channel: string;
  status: 'Active' | 'Draft' | 'Paused' | 'Completed';
  target_commodity: string;
  target_countries: string[];
  template_subject?: string;
  template_body?: string;
  segment_id?: string;
  enrolled_leads_count: number;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  bounced_count?: number;
  interested_count?: number;
  conversions_count: number;
  last_dispatched_at?: string;
  created_at: string;
}

export interface CustomerSegment {
  segment_id: string;
  name: string;
  description: string;
  lead_type: string;
  countries: string[];
  min_score: number;
  tags: string[];
  member_count?: number;
  created_at: string;
}

export interface MessageTemplate {
  template_id: string;
  name: string;
  channel: 'Email' | 'WhatsApp' | 'SMS';
  subject?: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface SampleCustomer {
  label: string;
  data: {
    company_name: string;
    contact_name: string;
    commodity: string;
    country: string;
    port: string;
    tracking_link: string;
    inquiry_notes: string;
  };
}

export const SAMPLE_CUSTOMERS: SampleCustomer[] = [
  {
    label: 'Al-Dhiyafa Foodstuff LLC (UAE Importer)',
    data: {
      company_name: 'Al-Dhiyafa Foodstuff Trading LLC', contact_name: 'Tariq Mansoor',
      commodity: 'IR-64 Parboiled Rice 5% Broken', country: 'United Arab Emirates',
      port: 'Jebel Ali Port (AEJEA)', tracking_link: 'https://tradepulse.exim/track/TRK-2026-8921',
      inquiry_notes: 'Requires 10 x 20ft FCL monthly in 50kg PP bags',
    },
  },
  {
    label: 'Gulf Grains Consortium (Saudi Importer)',
    data: {
      company_name: 'Gulf Grains & Agri Commodities Ltd', contact_name: 'Sheikh Khalid Al-Otaibi',
      commodity: '1121 Steam Basmati Rice', country: 'Saudi Arabia',
      port: 'King Abdulaziz Port, Dammam (SADMM)', tracking_link: 'https://tradepulse.exim/track/TRK-2026-9044',
      inquiry_notes: 'Urgent spot offer requested for 500 MT FOB',
    },
  },
  {
    label: 'Burdwan Golden Agro (Indian Supplier)',
    data: {
      company_name: 'Burdwan Golden Mills Pvt Ltd', contact_name: 'Pranab Mukherjee',
      commodity: 'Swarna Parboiled Grain', country: 'India',
      port: 'Syama Prasad Mookerjee Port, Kolkata (INCCU)', tracking_link: 'https://tradepulse.exim/track/TRK-2026-7811',
      inquiry_notes: 'Ready inventory 800 MT sortex cleaned',
    },
  },
];

export const TOKEN_SUGGESTIONS = [
  { token: '{company_name}', desc: 'Company or Supplier Name' },
  { token: '{contact_name}', desc: 'Key Decision Maker' },
  { token: '{commodity}', desc: 'Target Commodity or Spec' },
  { token: '{country}', desc: 'Destination or Origin Country' },
  { token: '{port}', desc: 'Discharge / Loading Port' },
  { token: '{tracking_link}', desc: 'Live Public Cargo Tracker URL' },
  { token: '{inquiry_notes}', desc: 'Specific Trade Notes' },
];
