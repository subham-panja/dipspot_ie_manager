export interface OmnichannelThread {
  thread_id: string;
  lead_id: number;
  company_name: string;
  contact_person?: string;
  country: string;
  latest_channel: 'Email' | 'WhatsApp';
  latest_intent: string;
  sentiment: string;
  urgency: string;
  badge_color: string;
  unread_count: number;
  last_message: string;
  last_activity_at: string;
  cadence_status?: string;
  cadence_paused?: boolean;
}

export interface OmnichannelMessage {
  message_id: string;
  lead_id: number;
  company_name: string;
  channel: 'Email' | 'WhatsApp';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  status: string;
  sender?: string;
  intent?: string;
  sentiment?: string;
  urgency?: string;
  timestamp: string;
}

export interface OmnichannelInboxViewProps {
  isLight: boolean;
  accentClasses: any;
}
