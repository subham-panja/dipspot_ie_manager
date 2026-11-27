export type OmnichannelChannel = 'Email' | 'WhatsApp' | 'Website';
export type InboxChannelFilter = 'All' | OmnichannelChannel;
export type InboxIntentFilter = 'All' | 'RFQ' | 'Negotiation' | 'Unsubscribe';

export interface OmnichannelThread {
  thread_id: string;
  lead_id: number | string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  country: string;
  latest_channel: OmnichannelChannel;
  latest_intent: string;
  sentiment: string;
  urgency: string;
  badge_color: string;
  unread_count: number;
  last_message: string;
  last_activity_at: string;
  cadence_status?: string;
  cadence_paused?: boolean;
  chatwoot_conversation_id?: number | string | null;
  chatwoot_contact_id?: number | string | null;
  chatwoot_synced?: boolean;
  is_visitor_thread?: boolean;
  chatwoot_url?: string;
}

export interface OmnichannelMessage {
  message_id: string;
  lead_id: number | string;
  company_name: string;
  channel: OmnichannelChannel;
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  status: string;
  sender?: string;
  intent?: string;
  sentiment?: string;
  urgency?: string;
  timestamp: string;
  chatwoot_message_id?: number | string | null;
}

export interface ChatwootStatusInfo {
  configured?: boolean;
  enabled?: boolean;
  reachable?: boolean;
  public_url?: string;
  base_url?: string;
  synced_threads?: number;
  channels?: {
    email?: boolean;
    whatsapp?: boolean;
    website?: boolean;
  };
  message?: string;
}

export interface ThreadChatwootMeta {
  conversation_id?: number | string | null;
  contact_id?: number | string | null;
  synced?: boolean;
  url?: string;
}

export interface OmnichannelInboxViewProps {
  isLight: boolean;
  accentClasses: any;
}
