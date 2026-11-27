'use client';

import { useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import {
  CHATWOOT_SCRIPT_ID,
  DEFAULT_CHATWOOT_SETTINGS,
  ChatwootWidgetBackendPayload,
  buildChatwootSdkScriptUrl,
  resolveWidgetConfig,
} from './chatwootWidgetUtils';

interface ChatwootSettings {
  hideMessageBubble?: boolean;
  position?: 'left' | 'right';
  locale?: string;
  type?: 'standard' | 'expanded_bubble';
  launcherTitle?: string;
}

interface ChatwootSDK {
  run: (config: { websiteToken: string; baseUrl: string }) => void;
}

interface ChatwootAPI {
  setUser: (
    identifier: string,
    user: {
      identifier_hash?: string;
      name?: string;
      email?: string;
    }
  ) => void;
}

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    chatwootSDK?: ChatwootSDK;
    $chatwoot?: ChatwootAPI;
  }
}

async function fetchBackendWidgetConfig(
  signal: AbortSignal
): Promise<ChatwootWidgetBackendPayload | null> {
  const endpoints = [
    `${API_BASE}/omnichannel/chatwoot/widget-config`,
    `${API_BASE}/config/chatwoot/widget`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { signal, cache: 'no-store' });
      if (res.ok) {
        return (await res.json()) as ChatwootWidgetBackendPayload;
      }
      if (res.status !== 404) {
        return null;
      }
    } catch {
      if (signal.aborted) return null;
    }
  }
  return null;
}

export default function ChatwootWidget() {
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let readyHandler: (() => void) | null = null;

    async function initWidget() {
      const backendConfig = await fetchBackendWidgetConfig(controller.signal);
      if (cancelled) return;

      const resolved = resolveWidgetConfig({
        backendConfig,
        envBaseUrl: process.env.NEXT_PUBLIC_CHATWOOT_URL,
        envWebsiteToken: process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN,
      });

      if (!resolved.enabled || !resolved.baseUrl || !resolved.websiteToken) {
        return;
      }

      const scriptUrl = buildChatwootSdkScriptUrl(resolved.baseUrl);
      if (!scriptUrl) {
        return;
      }

      window.chatwootSettings = {
        ...DEFAULT_CHATWOOT_SETTINGS,
      };

      readyHandler = () => {
        if (cancelled) return;
        if (resolved.identifier && resolved.identifierHash && window.$chatwoot?.setUser) {
          window.$chatwoot.setUser(resolved.identifier, {
            identifier_hash: resolved.identifierHash,
            ...(resolved.name ? { name: resolved.name } : {}),
            ...(resolved.email ? { email: resolved.email } : {}),
          });
        }
      };

      window.addEventListener('chatwoot:ready', readyHandler);

      const runSdk = () => {
        if (cancelled) return;
        window.chatwootSDK?.run({
          websiteToken: resolved.websiteToken,
          baseUrl: resolved.baseUrl,
        });
      };

      const existingScript = document.getElementById(CHATWOOT_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        if (window.chatwootSDK?.run) {
          runSdk();
        } else {
          existingScript.addEventListener('load', runSdk, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = CHATWOOT_SCRIPT_ID;
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = runSdk;
      (document.body || document.head).appendChild(script);
    }

    initWidget();

    return () => {
      cancelled = true;
      controller.abort();
      if (readyHandler) {
        window.removeEventListener('chatwoot:ready', readyHandler);
      }
    };
  }, []);

  return null;
}
