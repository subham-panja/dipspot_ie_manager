import type {
  OmnichannelChannel,
  InboxChannelFilter,
  InboxIntentFilter,
  OmnichannelThread,
  OmnichannelMessage,
} from './inboxTypes';

export function sanitizeExternalUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function normalizeChannel(raw?: string | null): OmnichannelChannel {
  const val = String(raw || '').trim().toLowerCase();
  if (
    val === 'website' ||
    val === 'web' ||
    val === 'website live chat' ||
    val === 'web_widget' ||
    val === 'webwidget' ||
    val === 'channel::webwidget'
  ) {
    return 'Website';
  }
  if (val === 'whatsapp' || val === 'wa' || val === 'channel::whatsapp') {
    return 'WhatsApp';
  }
  return 'Email';
}

export function deriveBadgeColor(
  intent?: string | null,
  urgency?: string | null,
  explicit?: string | null
): string {
  if (explicit && ['emerald', 'amber', 'rose', 'slate'].includes(explicit)) {
    return explicit;
  }
  const intentLower = String(intent || '').toLowerCase();
  const urgencyLower = String(urgency || '').toLowerCase();
  if (intentLower.includes('unsubscribe') || intentLower.includes('opt-out') || intentLower.includes('bounce')) {
    return 'rose';
  }
  if (intentLower.includes('rfq') || intentLower.includes('interested') || intentLower.includes('positive')) {
    return 'emerald';
  }
  if (intentLower.includes('negotiation') || urgencyLower === 'high') {
    return 'amber';
  }
  return 'slate';
}

function normalizeIdValue(val: unknown): string {
  if (val === 0) return '0';
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function isVisitorThread(thread?: Partial<OmnichannelThread> | null): boolean {
  if (!thread) return false;
  return Boolean(
    thread.is_visitor_thread ||
      String(thread.thread_id || '').startsWith('cw_conv_') ||
      String(thread.lead_id || '').startsWith('cw_conv_')
  );
}

export function normalizeThread(raw: Record<string, any>): OmnichannelThread {
  const rawConvId = raw?.chatwoot_conversation_id ?? null;
  const fallbackVisitorId = raw?.is_visitor_thread && rawConvId ? `cw_conv_${rawConvId}` : '';
  const thread_id =
    normalizeIdValue(raw?.thread_id) ||
    normalizeIdValue(raw?.lead_id) ||
    fallbackVisitorId;
  const rawLeadId = raw?.lead_id;
  const lead_id =
    rawLeadId !== undefined && rawLeadId !== null && String(rawLeadId).trim() !== ''
      ? rawLeadId
      : thread_id;
  const is_visitor_thread = Boolean(
    raw?.is_visitor_thread ||
      thread_id.startsWith('cw_conv_') ||
      String(lead_id).startsWith('cw_conv_')
  );

  const latest_intent = String(raw?.latest_intent ?? raw?.intent ?? 'Outbound Contacted');
  const urgency = String(raw?.urgency ?? 'Normal');

  return {
    thread_id,
    lead_id,
    company_name: String(raw?.company_name || (is_visitor_thread ? 'Website Visitor' : 'Global Trade Entity')),
    contact_person: raw?.contact_person ? String(raw.contact_person) : undefined,
    email: typeof raw?.email === 'string' ? raw.email : undefined,
    phone: typeof raw?.phone === 'string' ? raw.phone : undefined,
    country: String(raw?.country ?? ''),
    latest_channel: normalizeChannel(raw?.latest_channel ?? raw?.channel),
    latest_intent,
    sentiment: String(raw?.sentiment ?? 'Neutral'),
    urgency,
    badge_color: deriveBadgeColor(latest_intent, urgency, raw?.badge_color),
    unread_count: typeof raw?.unread_count === 'number' ? raw.unread_count : 0,
    last_message: String(raw?.last_message ?? raw?.latest_message ?? ''),
    last_activity_at: String(raw?.last_activity_at ?? raw?.latest_timestamp ?? ''),
    cadence_status: raw?.cadence_status ? String(raw.cadence_status) : undefined,
    cadence_paused: Boolean(raw?.cadence_paused),
    chatwoot_conversation_id: rawConvId,
    chatwoot_contact_id: raw?.chatwoot_contact_id ?? null,
    chatwoot_synced: Boolean(raw?.chatwoot_synced || rawConvId),
    is_visitor_thread,
    chatwoot_url: sanitizeExternalUrl(raw?.chatwoot_url),
  };
}

export function normalizeMessage(
  raw: Record<string, any>,
  fallbackThread?: OmnichannelThread | null
): OmnichannelMessage {
  const id = raw?.message_id ?? raw?._id ?? raw?.id ?? `${raw?.timestamp || ''}_${raw?.direction || 'out'}`;
  return {
    message_id: String(id),
    lead_id: raw?.lead_id ?? fallbackThread?.lead_id ?? '',
    company_name: String(raw?.company_name ?? fallbackThread?.company_name ?? 'Trade Contact'),
    channel: normalizeChannel(raw?.channel),
    direction: raw?.direction === 'inbound' ? 'inbound' : 'outbound',
    subject: typeof raw?.subject === 'string' ? raw.subject : undefined,
    content: String(raw?.content ?? ''),
    status: String(raw?.status ?? 'Sent'),
    sender: typeof raw?.sender === 'string' ? raw.sender : undefined,
    intent: typeof raw?.intent === 'string' ? raw.intent : undefined,
    sentiment: typeof raw?.sentiment === 'string' ? raw.sentiment : undefined,
    urgency: typeof raw?.urgency === 'string' ? raw.urgency : undefined,
    timestamp: String(raw?.timestamp ?? raw?.created_at ?? ''),
    chatwoot_message_id: raw?.chatwoot_message_id ?? null,
  };
}

export function filterInboxThreads(
  threads: OmnichannelThread[],
  searchQuery: string,
  filterChannel: InboxChannelFilter,
  filterIntent: InboxIntentFilter
): OmnichannelThread[] {
  const q = String(searchQuery || '').toLowerCase();
  return threads.filter((t) => {
    const company = String(t.company_name || '').toLowerCase();
    const country = String(t.country || '').toLowerCase();
    const lastMsg = String(t.last_message || '').toLowerCase();
    const contact = String(t.contact_person || '').toLowerCase();
    const intent = String(t.latest_intent || '').toLowerCase();

    const matchesSearch =
      !q || company.includes(q) || country.includes(q) || lastMsg.includes(q) || contact.includes(q);
    const matchesChannel = filterChannel === 'All' || t.latest_channel === filterChannel;
    const matchesIntent =
      filterIntent === 'All' || intent.includes(filterIntent.toLowerCase());

    return matchesSearch && matchesChannel && matchesIntent;
  });
}
