'use client';

import React from 'react';
import { Scale, CheckCircle2, AlertOctagon, Save } from 'lucide-react';
import { WhatsAppConfig } from './settingsTypes';

interface WhatsAppGatewayTabProps {
  whatsapp: WhatsAppConfig;
  setWhatsapp: React.Dispatch<React.SetStateAction<WhatsAppConfig>>;
  onSave: () => void;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function WhatsAppGatewayTab({
  whatsapp,
  setWhatsapp,
  onSave,
  isLight,
  accentClasses,
}: WhatsAppGatewayTabProps) {
  return (
    <div className="space-y-6">
      <div
        className={`p-6 rounded-2xl border space-y-6 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div>
          <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            WhatsApp True-Omnichannel Integration & Legal Compliance Desk
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect your Personal WhatsApp number or Meta Cloud API for automated trade follow-ups, CIF spot offers, and cargo alerts.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-amber-200 space-y-3">
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-white">
                Legal Compliance & Anti-Ban Analysis: Using Your Own WhatsApp for Automation
              </h3>
              <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                You asked: <em>&quot;Can I practically use my own WhatsApp for automation, and is it legal?&quot;</em>
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
                <strong>FULLY COMPLIANT FOR B2B:</strong> Outreaching to commercial buyers with legitimate trade interest does not violate statutory cyber laws, provided you immediately honor recipient opt-outs (&quot;Reply STOP&quot;). TradePulse auto-pauses cadences instantly upon opt-out.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                Meta Terms of Service (Risk of Number Ban)
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>HIGH BAN RISK IF USED FOR BULK SPAM:</strong> Unofficial headless browser automation of personal numbers violates Meta ToS (Section 3). Blasting cold broadcasts will quickly result in permanent phone number banning.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-200">
            <strong>TradePulse Recommended Dual-Mode Architecture:</strong> Use your <strong>Personal WhatsApp</strong> with human typing jitter strictly for direct 1-to-1 customer replies (&lt;50 chats/day). Use the <strong>Meta WhatsApp Cloud API</strong> for large automated broadcast cadences.
          </div>
        </div>

        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Channel Provider Mode</label>
            <select
              value={whatsapp.provider}
              onChange={(e) => setWhatsapp({ ...whatsapp, provider: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            >
              <option value="personal_web_direct">Personal WhatsApp Web Direct Session (Safe Cap: 35-50 chats/day)</option>
              <option value="meta_cloud_api">Meta Cloud API (Official WhatsApp Business API - High Volume)</option>
              <option value="gupshup">Gupshup Enterprise Messaging Gateway</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Daily Safe Cap (Chats/Day)</label>
              <input
                type="number"
                value={whatsapp.personal_daily_cap || 50}
                onChange={(e) => setWhatsapp({ ...whatsapp, personal_daily_cap: parseInt(e.target.value) || 50 })}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Human Typing Delay Jitter</label>
              <input
                type="text"
                readOnly
                value={whatsapp.typing_delay_jitter || '4500ms - 8200ms'}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border bg-slate-950/80 border-slate-800 text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">System Access Token / API Key</label>
            <input
              type="password"
              value={whatsapp.api_token}
              onChange={(e) => setWhatsapp({ ...whatsapp, api_token: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number ID</label>
            <input
              type="text"
              value={whatsapp.phone_number_id}
              onChange={(e) => setWhatsapp({ ...whatsapp, phone_number_id: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Inbound Webhook Endpoint</label>
            <input
              type="text"
              value={whatsapp.webhook_url}
              readOnly
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border bg-slate-950/80 border-slate-800 text-slate-400"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/40 flex justify-end">
          <button
            onClick={onSave}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
          >
            <Save className="w-4 h-4" />
            Save Channel Gateway
          </button>
        </div>
      </div>
    </div>
  );
}
