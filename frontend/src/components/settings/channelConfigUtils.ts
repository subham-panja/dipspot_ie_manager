import type {
  WhatsAppConfig,
  ChatwootConfig,
  WhatsAppClearFlags,
  ChatwootClearFlags,
} from './settingsTypes';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  configured: false,
  provider: 'meta_cloud_api',
  phone_number_id: '',
  business_account_id: '',
  webhook_url: '',
  personal_daily_cap: 50,
  typing_delay_jitter: '4500ms - 8200ms',
  auto_stop_opt_out: true,
  has_access_token: false,
  masked_access_token: '',
  access_token: '',
  has_webhook_verify_token: false,
  masked_webhook_verify_token: '',
  webhook_verify_token: '',
  updated_at: null,
};

export const DEFAULT_CHATWOOT_CONFIG: ChatwootConfig = {
  configured: false,
  enabled: false,
  base_url: 'http://localhost:3001',
  public_url: 'http://localhost:3001',
  account_id: '1',
  email_inbox_id: '',
  whatsapp_inbox_id: '',
  website_inbox_id: '',
  website_token: '',
  has_api_token: false,
  masked_api_token: '',
  api_access_token: '',
  has_webhook_secret: false,
  masked_webhook_secret: '',
  webhook_secret: '',
  has_website_hmac_secret: false,
  masked_website_hmac_secret: '',
  website_hmac_secret: '',
  channels: {
    email: false,
    whatsapp: false,
    website: false,
  },
  updated_at: null,
};

export const EMPTY_WHATSAPP_CLEAR_FLAGS: WhatsAppClearFlags = {
  clear_access_token: false,
  clear_webhook_verify_token: false,
};

export const EMPTY_CHATWOOT_CLEAR_FLAGS: ChatwootClearFlags = {
  clear_api_token: false,
  clear_webhook_secret: false,
  clear_website_hmac_secret: false,
};

export function sanitizeChannelUrl(raw?: string | null): string {
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

export function isUsableSecretInput(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return Boolean(trimmed) && !trimmed.startsWith('••••');
}

export function normalizeWhatsAppResponse(res: Record<string, any> | null | undefined): WhatsAppConfig {
  if (!res || typeof res !== 'object') return { ...DEFAULT_WHATSAPP_CONFIG };
  return {
    configured: Boolean(res.configured),
    provider: String(res.provider || 'meta_cloud_api'),
    phone_number_id: String(res.phone_number_id || ''),
    business_account_id: String(res.business_account_id || ''),
    webhook_url: String(res.webhook_url || ''),
    personal_daily_cap:
      typeof res.personal_daily_cap === 'number' && !Number.isNaN(res.personal_daily_cap)
        ? res.personal_daily_cap
        : 50,
    typing_delay_jitter: String(res.typing_delay_jitter || '4500ms - 8200ms'),
    auto_stop_opt_out: typeof res.auto_stop_opt_out === 'boolean' ? res.auto_stop_opt_out : true,
    has_access_token: Boolean(res.has_access_token),
    masked_access_token: String(res.masked_access_token || ''),
    access_token: '',
    has_webhook_verify_token: Boolean(res.has_webhook_verify_token),
    masked_webhook_verify_token: String(res.masked_webhook_verify_token || ''),
    webhook_verify_token: '',
    updated_at: res.updated_at ? String(res.updated_at) : null,
  };
}

export function buildWhatsAppPatchPayload(
  state: WhatsAppConfig,
  clearFlags: WhatsAppClearFlags = EMPTY_WHATSAPP_CLEAR_FLAGS
): Record<string, any> {
  const payload: Record<string, any> = {
    provider: state.provider || 'meta_cloud_api',
    phone_number_id: (state.phone_number_id || '').trim(),
    business_account_id: (state.business_account_id || '').trim(),
    webhook_url: (state.webhook_url || '').trim(),
    personal_daily_cap: Number.isFinite(state.personal_daily_cap) ? state.personal_daily_cap : 50,
    typing_delay_jitter: state.typing_delay_jitter || '4500ms - 8200ms',
    auto_stop_opt_out: Boolean(state.auto_stop_opt_out),
  };

  if (clearFlags.clear_access_token) {
    payload.clear_access_token = true;
  } else if (isUsableSecretInput(state.access_token)) {
    payload.access_token = state.access_token!.trim();
  }

  if (clearFlags.clear_webhook_verify_token) {
    payload.clear_webhook_verify_token = true;
  } else if (isUsableSecretInput(state.webhook_verify_token)) {
    payload.webhook_verify_token = state.webhook_verify_token!.trim();
  }

  return payload;
}

export function normalizeChatwootResponse(res: Record<string, any> | null | undefined): ChatwootConfig {
  if (!res || typeof res !== 'object') return { ...DEFAULT_CHATWOOT_CONFIG };
  const ch = res.channels && typeof res.channels === 'object' ? res.channels : {};
  return {
    configured: Boolean(res.configured),
    enabled: Boolean(res.enabled),
    base_url: String(res.base_url ?? 'http://localhost:3001').trim(),
    public_url: String(res.public_url ?? res.base_url ?? 'http://localhost:3001').trim(),
    account_id: String(res.account_id ?? '1').trim(),
    email_inbox_id: String(res.email_inbox_id ?? '').trim(),
    whatsapp_inbox_id: String(res.whatsapp_inbox_id ?? '').trim(),
    website_inbox_id: String(res.website_inbox_id ?? '').trim(),
    website_token: String(res.website_token ?? '').trim(),
    has_api_token: Boolean(res.has_api_token),
    masked_api_token: String(res.masked_api_token || ''),
    api_access_token: '',
    has_webhook_secret: Boolean(res.has_webhook_secret),
    masked_webhook_secret: String(res.masked_webhook_secret || ''),
    webhook_secret: '',
    has_website_hmac_secret: Boolean(res.has_website_hmac_secret),
    masked_website_hmac_secret: String(res.masked_website_hmac_secret || ''),
    website_hmac_secret: '',
    channels: {
      email: Boolean(ch.email),
      whatsapp: Boolean(ch.whatsapp),
      website: Boolean(ch.website),
    },
    updated_at: res.updated_at ? String(res.updated_at) : null,
  };
}

export function buildChatwootPatchPayload(
  state: ChatwootConfig,
  clearFlags: ChatwootClearFlags = EMPTY_CHATWOOT_CLEAR_FLAGS
): Record<string, any> {
  const payload: Record<string, any> = {
    enabled: Boolean(state.enabled),
    base_url: (state.base_url || '').trim(),
    public_url: (state.public_url || '').trim(),
    account_id: (state.account_id || '').trim(),
    email_inbox_id: (state.email_inbox_id || '').trim(),
    whatsapp_inbox_id: (state.whatsapp_inbox_id || '').trim(),
    website_inbox_id: (state.website_inbox_id || '').trim(),
    website_token: (state.website_token || '').trim(),
  };

  if (clearFlags.clear_api_token) {
    payload.clear_api_token = true;
  } else if (isUsableSecretInput(state.api_access_token)) {
    payload.api_access_token = state.api_access_token!.trim();
  }

  if (clearFlags.clear_webhook_secret) {
    payload.clear_webhook_secret = true;
  } else if (isUsableSecretInput(state.webhook_secret)) {
    payload.webhook_secret = state.webhook_secret!.trim();
  }

  if (clearFlags.clear_website_hmac_secret) {
    payload.clear_website_hmac_secret = true;
  } else if (isUsableSecretInput(state.website_hmac_secret)) {
    payload.website_hmac_secret = state.website_hmac_secret!.trim();
  }

  return payload;
}

export function buildChatwootTestPayload(state: ChatwootConfig): Record<string, any> {
  const payload: Record<string, any> = {
    base_url: (state.base_url || '').trim(),
    account_id: (state.account_id || '').trim(),
  };
  if (isUsableSecretInput(state.api_access_token)) {
    payload.api_access_token = state.api_access_token!.trim();
  }
  return payload;
}
