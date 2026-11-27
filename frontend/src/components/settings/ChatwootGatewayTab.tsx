'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Save,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import {
  ChatwootConfig,
  ChatwootTestResult,
  ChatwootClearFlags,
} from './settingsTypes';
import { sanitizeChannelUrl } from './channelConfigUtils';

interface ChatwootGatewayTabProps {
  chatwoot: ChatwootConfig;
  setChatwoot: React.Dispatch<React.SetStateAction<ChatwootConfig>>;
  clearFlags: ChatwootClearFlags;
  onClearSecret: (field: keyof ChatwootClearFlags, nextValue?: boolean) => void;
  onSave: () => void;
  onTest: () => void;
  testing: boolean;
  testResult: ChatwootTestResult | null;
  saving: boolean;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function ChatwootGatewayTab({
  chatwoot,
  setChatwoot,
  clearFlags,
  onClearSecret,
  onSave,
  onTest,
  testing,
  testResult,
  saving,
  isLight,
  accentClasses,
}: ChatwootGatewayTabProps) {
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const inputClass = `w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
  }`;

  const webhookCallbackUrl = `${API_BASE.replace(/\/+$/, '')}/omnichannel/chatwoot/webhook`;
  const safeConsoleUrl = sanitizeChannelUrl(chatwoot.public_url || chatwoot.base_url);

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookCallbackUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const assignInbox = (channel: 'email' | 'whatsapp' | 'website', id: number | string) => {
    const val = String(id);
    setChatwoot((prev) => ({
      ...prev,
      email_inbox_id: channel === 'email' ? val : prev.email_inbox_id,
      whatsapp_inbox_id: channel === 'whatsapp' ? val : prev.whatsapp_inbox_id,
      website_inbox_id: channel === 'website' ? val : prev.website_inbox_id,
    }));
  };

  const handleSecretChange = (
    field: 'api_access_token' | 'webhook_secret' | 'website_hmac_secret',
    clearKey: keyof ChatwootClearFlags,
    value: string
  ) => {
    setChatwoot((prev) => ({ ...prev, [field]: value }));
    if (value.length > 0 && clearFlags[clearKey]) {
      onClearSecret(clearKey, false);
    }
  };

  const channelPill = (label: string, active?: boolean) => (
    <span
      className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-semibold ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-slate-800/70 text-slate-400 border-slate-700'
      }`}
    >
      {label}: {active ? 'Ready' : 'Pending'}
    </span>
  );

  const renderSecretHeader = (
    label: string,
    hasFlag: boolean | undefined,
    masked: string | undefined,
    clearKey: keyof ChatwootClearFlags
  ) => {
    const isClearing = clearFlags[clearKey];
    return (
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-400">{label}</label>
        <div className="flex items-center gap-2">
          {hasFlag && !isClearing && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Stored ({masked || '••••••••'})
            </span>
          )}
          {(hasFlag || isClearing) && (
            <button
              type="button"
              onClick={() => onClearSecret(clearKey)}
              className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition ${
                isClearing
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-rose-300'
              }`}
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>{isClearing ? 'Will Clear on Save' : 'Clear'}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div
        className={`p-6 rounded-2xl border space-y-6 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Self-Hosted Chatwoot Omnichannel Gateway
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    chatwoot.configured
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {chatwoot.configured ? 'Configured' : 'Setup Required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bridge Email, WhatsApp, and Website Live Chat widget conversations between TradePulse EXIM and your self-hosted Chatwoot instance.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {channelPill('Email', chatwoot.channels?.email)}
                {channelPill('WhatsApp', chatwoot.channels?.whatsapp)}
                {channelPill('Website Live Chat', chatwoot.channels?.website)}
              </div>
            </div>
          </div>

          {safeConsoleUrl && (
            <a
              href={safeConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition shadow-sm"
            >
              <span>Open Chatwoot Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(chatwoot.enabled)}
            onChange={(e) => setChatwoot({ ...chatwoot, enabled: e.target.checked })}
            className="rounded border-slate-700 bg-slate-900 text-purple-500"
          />
          <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
            Enable Chatwoot Omnichannel Synchronization &amp; Website Live Chat Widget
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Internal Server Base URL
            </label>
            <input
              type="text"
              value={chatwoot.base_url}
              onChange={(e) => setChatwoot({ ...chatwoot, base_url: e.target.value })}
              placeholder="http://localhost:3001"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Browser Public URL (Widget &amp; Links)
            </label>
            <input
              type="text"
              value={chatwoot.public_url}
              onChange={(e) => setChatwoot({ ...chatwoot, public_url: e.target.value })}
              placeholder="http://localhost:3001"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Account ID</label>
            <input
              type="text"
              value={chatwoot.account_id}
              onChange={(e) => setChatwoot({ ...chatwoot, account_id: e.target.value })}
              placeholder="1"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Inbox ID</label>
            <input
              type="text"
              value={chatwoot.email_inbox_id}
              onChange={(e) => setChatwoot({ ...chatwoot, email_inbox_id: e.target.value })}
              placeholder="e.g. 1"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">WhatsApp Inbox ID</label>
            <input
              type="text"
              value={chatwoot.whatsapp_inbox_id}
              onChange={(e) => setChatwoot({ ...chatwoot, whatsapp_inbox_id: e.target.value })}
              placeholder="e.g. 2"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Website Inbox ID</label>
            <input
              type="text"
              value={chatwoot.website_inbox_id}
              onChange={(e) => setChatwoot({ ...chatwoot, website_inbox_id: e.target.value })}
              placeholder="e.g. 3"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Website Live Chat Inbox Token
            </label>
            <input
              type="text"
              value={chatwoot.website_token}
              onChange={(e) => setChatwoot({ ...chatwoot, website_token: e.target.value })}
              placeholder="Paste Chatwoot Website Inbox token..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              TradePulse Webhook Callback URL (Configure in Chatwoot)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookCallbackUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono border bg-slate-950/80 border-slate-800 text-slate-400"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            {renderSecretHeader(
              'API Access Token',
              chatwoot.has_api_token,
              chatwoot.masked_api_token,
              'clear_api_token'
            )}
            <input
              type="password"
              value={chatwoot.api_access_token || ''}
              onChange={(e) => handleSecretChange('api_access_token', 'clear_api_token', e.target.value)}
              placeholder={
                clearFlags.clear_api_token
                  ? 'Will clear on save...'
                  : chatwoot.masked_api_token || 'Enter Chatwoot user API token...'
              }
              className={inputClass}
            />
          </div>

          <div>
            {renderSecretHeader(
              'Webhook HMAC Secret',
              chatwoot.has_webhook_secret,
              chatwoot.masked_webhook_secret,
              'clear_webhook_secret'
            )}
            <input
              type="password"
              value={chatwoot.webhook_secret || ''}
              onChange={(e) => handleSecretChange('webhook_secret', 'clear_webhook_secret', e.target.value)}
              placeholder={
                clearFlags.clear_webhook_secret
                  ? 'Will clear on save...'
                  : chatwoot.masked_webhook_secret || 'Enter webhook signing secret...'
              }
              className={inputClass}
            />
          </div>

          <div>
            {renderSecretHeader(
              'Website Identity HMAC Secret',
              chatwoot.has_website_hmac_secret,
              chatwoot.masked_website_hmac_secret,
              'clear_website_hmac_secret'
            )}
            <input
              type="password"
              value={chatwoot.website_hmac_secret || ''}
              onChange={(e) =>
                handleSecretChange('website_hmac_secret', 'clear_website_hmac_secret', e.target.value)
              }
              placeholder={
                clearFlags.clear_website_hmac_secret
                  ? 'Will clear on save...'
                  : chatwoot.masked_website_hmac_secret || 'Enter widget HMAC secret...'
              }
              className={inputClass}
            />
          </div>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              <span className="font-mono text-[10px]">
                {testResult.reachable ? `Reachable (HTTP ${testResult.status_code ?? 'OK'})` : 'Unreachable'}
              </span>
            </div>

            {Array.isArray(testResult.inboxes) && testResult.inboxes.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                <div className="text-[11px] font-bold text-white">
                  Discovered Chatwoot Inboxes ({testResult.inboxes.length}):
                </div>
                <div className="space-y-1.5">
                  {testResult.inboxes.map((inbox) => (
                    <div
                      key={inbox.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200"
                    >
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-purple-300">#{inbox.id}</span>
                        <span className="font-semibold">{inbox.name}</span>
                        {inbox.channel_type && (
                          <span className="text-[10px] text-slate-400 font-mono">({inbox.channel_type})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => assignInbox('email', inbox.id)}
                          className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                        >
                          Use as Email
                        </button>
                        <button
                          type="button"
                          onClick={() => assignInbox('whatsapp', inbox.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                        >
                          Use as WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => assignInbox('website', inbox.id)}
                          className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                        >
                          Use as Website
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={testing}
            onClick={onTest}
            className="px-4 py-2.5 rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Probing Chatwoot...' : 'Test Connection'}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 disabled:opacity-50 ${accentClasses.btn}`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Chatwoot Gateway'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
