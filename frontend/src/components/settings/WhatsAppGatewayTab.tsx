'use client';

import React from 'react';
import { Scale, CheckCircle2, AlertOctagon, Save, Trash2 } from 'lucide-react';
import { WhatsAppConfig, WhatsAppClearFlags } from './settingsTypes';

interface WhatsAppGatewayTabProps {
  whatsapp: WhatsAppConfig;
  setWhatsapp: React.Dispatch<React.SetStateAction<WhatsAppConfig>>;
  clearFlags: WhatsAppClearFlags;
  onClearSecret: (field: keyof WhatsAppClearFlags, nextValue?: boolean) => void;
  onSave: () => void;
  saving: boolean;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function WhatsAppGatewayTab({
  whatsapp,
  setWhatsapp,
  clearFlags,
  onClearSecret,
  onSave,
  saving,
  isLight,
  accentClasses,
}: WhatsAppGatewayTabProps) {
  const inputClass = `w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
  }`;

  const handleSecretChange = (
    field: 'access_token' | 'webhook_verify_token',
    clearKey: keyof WhatsAppClearFlags,
    value: string
  ) => {
    setWhatsapp((prev) => ({ ...prev, [field]: value }));
    if (value.length > 0 && clearFlags[clearKey]) {
      onClearSecret(clearKey, false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`p-6 rounded-2xl border space-y-6 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              WhatsApp True-Omnichannel Integration &amp; Legal Compliance Desk
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect your Personal WhatsApp session or Meta Cloud API for automated trade follow-ups, CIF spot offers, and Chatwoot WhatsApp inbox routing.
            </p>
          </div>
          <span
            className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-bold ${
              whatsapp.configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {whatsapp.configured ? 'Credentials Configured' : 'Unconfigured'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-amber-200 space-y-3">
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-white">
                Legal Compliance &amp; Anti-Ban Architecture
              </h3>
              <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                Use <strong>Meta WhatsApp Cloud API</strong> (optionally bridged via Chatwoot) for automated broadcast cadences, and keep personal numbers strictly under the daily safe cap for 1-to-1 replies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Statutory Legality (India DPDP, TRAI, GDPR, TCPA)
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                B2B commercial outreach with instant opt-out enforcement (&quot;Reply STOP&quot;) auto-pauses cadences immediately.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                Meta Terms of Service Protection
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Official Cloud API tokens &amp; Business Account IDs are stored masked on the backend and never exposed back in plaintext.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Channel Provider Mode</label>
            <select
              value={whatsapp.provider}
              onChange={(e) => setWhatsapp({ ...whatsapp, provider: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            >
              <option value="meta_cloud_api">Meta Cloud API (Official WhatsApp Business API - High Volume)</option>
              <option value="personal_web_direct">Personal WhatsApp Web Direct Session (Safe Cap: 35-50 chats/day)</option>
              <option value="gupshup">Gupshup Enterprise Messaging Gateway</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Daily Safe Cap (Chats/Day)</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={whatsapp.personal_daily_cap}
                onChange={(e) =>
                  setWhatsapp({
                    ...whatsapp,
                    personal_daily_cap: Math.max(0, parseInt(e.target.value || '0', 10) || 0),
                  })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Human Typing Delay Jitter</label>
              <input
                type="text"
                value={whatsapp.typing_delay_jitter || '4500ms - 8200ms'}
                onChange={(e) => setWhatsapp({ ...whatsapp, typing_delay_jitter: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Meta Cloud API System Access Token
              </label>
              <div className="flex items-center gap-2">
                {whatsapp.has_access_token && !clearFlags.clear_access_token && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Stored ({whatsapp.masked_access_token || '••••••••'})
                  </span>
                )}
                {(whatsapp.has_access_token || clearFlags.clear_access_token) && (
                  <button
                    type="button"
                    onClick={() => onClearSecret('clear_access_token')}
                    className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition ${
                      clearFlags.clear_access_token
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-rose-300'
                    }`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>{clearFlags.clear_access_token ? 'Will Clear on Save' : 'Clear'}</span>
                  </button>
                )}
              </div>
            </div>
            <input
              type="password"
              value={whatsapp.access_token || ''}
              onChange={(e) => handleSecretChange('access_token', 'clear_access_token', e.target.value)}
              placeholder={
                clearFlags.clear_access_token
                  ? 'Token will be cleared when saved...'
                  : whatsapp.masked_access_token || 'Enter Meta Cloud API token (leave blank to keep stored)...'
              }
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number ID</label>
              <input
                type="text"
                value={whatsapp.phone_number_id}
                onChange={(e) => setWhatsapp({ ...whatsapp, phone_number_id: e.target.value })}
                placeholder="e.g. Meta WhatsApp Phone Number ID"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                WhatsApp Business Account ID (WABA)
              </label>
              <input
                type="text"
                value={whatsapp.business_account_id}
                onChange={(e) => setWhatsapp({ ...whatsapp, business_account_id: e.target.value })}
                placeholder="e.g. Meta WABA ID"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Inbound Webhook Endpoint URL
            </label>
            <input
              type="text"
              value={whatsapp.webhook_url}
              onChange={(e) => setWhatsapp({ ...whatsapp, webhook_url: e.target.value })}
              placeholder="https://your-domain.example/api/omnichannel/chatwoot/webhook"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Webhook Verify Token</label>
              <div className="flex items-center gap-2">
                {whatsapp.has_webhook_verify_token && !clearFlags.clear_webhook_verify_token && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Stored ({whatsapp.masked_webhook_verify_token || '••••••••'})
                  </span>
                )}
                {(whatsapp.has_webhook_verify_token || clearFlags.clear_webhook_verify_token) && (
                  <button
                    type="button"
                    onClick={() => onClearSecret('clear_webhook_verify_token')}
                    className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition ${
                      clearFlags.clear_webhook_verify_token
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-rose-300'
                    }`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>{clearFlags.clear_webhook_verify_token ? 'Will Clear on Save' : 'Clear'}</span>
                  </button>
                )}
              </div>
            </div>
            <input
              type="password"
              value={whatsapp.webhook_verify_token || ''}
              onChange={(e) =>
                handleSecretChange('webhook_verify_token', 'clear_webhook_verify_token', e.target.value)
              }
              placeholder={
                clearFlags.clear_webhook_verify_token
                  ? 'Verify token will be cleared when saved...'
                  : whatsapp.masked_webhook_verify_token || 'Enter Meta webhook verify token...'
              }
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(whatsapp.auto_stop_opt_out)}
              onChange={(e) => setWhatsapp({ ...whatsapp, auto_stop_opt_out: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-emerald-500"
            />
            <span>Automatically pause follow-up cadences on client opt-out (&quot;STOP&quot; / unsubscribe)</span>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-800/40 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 disabled:opacity-50 ${accentClasses.btn}`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Channel Gateway'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
