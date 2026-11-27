export interface ChatwootWidgetConfig {
  enabled: boolean;
  baseUrl: string;
  websiteToken: string;
  identifier: string;
  identifierHash: string;
  name?: string;
  email?: string;
}

export interface ChatwootWidgetBackendPayload {
  enabled?: boolean | string | number;
  base_url?: string;
  website_token?: string;
  identifier?: string;
  identifier_hash?: string;
  name?: string;
  email?: string;
}

export function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
  }
  return Boolean(value);
}

export const CHATWOOT_SCRIPT_ID = 'chatwoot-sdk-script';

export const DEFAULT_CHATWOOT_SETTINGS = {
  position: 'right' as const,
  type: 'standard' as const,
  launcherTitle: 'Chat with TradePulse',
};

export function sanitizeHttpUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function buildChatwootSdkScriptUrl(baseUrl?: string | null): string {
  const clean = sanitizeHttpUrl(baseUrl);
  return clean ? `${clean}/packs/js/sdk.js` : '';
}

export function resolveWidgetConfig(options: {
  backendConfig?: ChatwootWidgetBackendPayload | null;
  envBaseUrl?: string;
  envWebsiteToken?: string;
}): ChatwootWidgetConfig {
  const { backendConfig, envBaseUrl, envWebsiteToken } = options;
  const cleanEnvUrl = sanitizeHttpUrl(envBaseUrl);
  const cleanEnvToken = typeof envWebsiteToken === 'string' ? envWebsiteToken.trim() : '';

  if (backendConfig && typeof backendConfig === 'object') {
    const backendEnabled = parseBooleanFlag(backendConfig.enabled);
    const baseUrl = sanitizeHttpUrl(backendConfig.base_url) || cleanEnvUrl;
    const websiteToken =
      (typeof backendConfig.website_token === 'string' ? backendConfig.website_token.trim() : '') ||
      cleanEnvToken;
    const identifier = typeof backendConfig.identifier === 'string' ? backendConfig.identifier.trim() : '';
    const identifierHash =
      typeof backendConfig.identifier_hash === 'string' ? backendConfig.identifier_hash.trim() : '';

    return {
      enabled: backendEnabled && Boolean(baseUrl && websiteToken),
      baseUrl,
      websiteToken,
      identifier,
      identifierHash,
      name: typeof backendConfig.name === 'string' ? backendConfig.name.trim() : undefined,
      email: typeof backendConfig.email === 'string' ? backendConfig.email.trim() : undefined,
    };
  }

  return {
    enabled: Boolean(cleanEnvUrl && cleanEnvToken),
    baseUrl: cleanEnvUrl,
    websiteToken: cleanEnvToken,
    identifier: '',
    identifierHash: '',
  };
}
