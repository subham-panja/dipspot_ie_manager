'use client';

import React from 'react';
import { ShieldCheck, Send, Save } from 'lucide-react';
import SmtpStopperBanner, { SmtpStopperStatus } from '@/components/campaigns/SmtpStopperBanner';
import { SmtpConfig } from './settingsTypes';

interface SmtpGatewayTabProps {
  smtp: SmtpConfig;
  setSmtp: React.Dispatch<React.SetStateAction<SmtpConfig>>;
  smtpStopper: SmtpStopperStatus | null;
  onHardBreak: () => Promise<void>;
  onResume: () => Promise<void>;
  onResetCounter: () => Promise<void>;
  onUpdateLimit: (newLimit: number) => Promise<void>;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
  testingSmtp: boolean;
  testSmtpResult: string | null;
  saving: boolean;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function SmtpGatewayTab({
  smtp,
  setSmtp,
  smtpStopper,
  onHardBreak,
  onResume,
  onResetCounter,
  onUpdateLimit,
  onSave,
  onTest,
  testingSmtp,
  testSmtpResult,
  saving,
  isLight,
  accentClasses,
}: SmtpGatewayTabProps) {
  return (
    <div className="space-y-6">
      <SmtpStopperBanner
        status={smtpStopper}
        onHardBreak={onHardBreak}
        onResume={onResume}
        onResetCounter={onResetCounter}
        onUpdateLimit={onUpdateLimit}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <div
        className={`p-6 rounded-2xl border space-y-6 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div>
          <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Gmail & Commercial SMTP Delivery Gateway
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect your organization SMTP server or Gmail App Password for transactional emails, quotations, and sequences.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Personal Gmail SMTP Sending Limits & Automated Stopper Protection</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Google enforces a strict limit of <strong>500 recipients per rolling 24-hour window</strong> for personal <code className="text-purple-300">@gmail.com</code> accounts (and throttles external SMTP clients at ~100–150 emails/day). Exceeding this triggers Gmail error <code className="text-rose-400">550 5.4.5 Daily user sending limit exceeded</code> and suspends sending for 24 hours.
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            <strong>TradePulse Guarantee:</strong> Our built-in Stopper tracks every email in real-time. If the configured ceiling is met, or if any 550/421 SMTP error is detected, an emergency hard break is instantly engaged to freeze active campaigns and safeguard your Gmail account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">SMTP Host Server</label>
            <input
              type="text"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Port (587 TLS / 465 SSL)</label>
            <input
              type="number"
              value={smtp.port}
              onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">SMTP Username / Email</label>
            <input
              type="email"
              value={smtp.username}
              onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
              placeholder="exports@tradepulse.exim"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">App Password / Auth Token</label>
            <input
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
              placeholder="••••••••••••••••"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sender From Name</label>
            <input
              type="text"
              value={smtp.from_name}
              onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
              placeholder="TradePulse Commercial Exports"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reply-To Email Address</label>
            <input
              type="email"
              value={smtp.from_email}
              onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
              placeholder="exports@tradepulse.exim"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>
        </div>

        {testSmtpResult && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
            {testSmtpResult}
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/40 flex items-center justify-between">
          <button
            onClick={onTest}
            disabled={testingSmtp}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {testingSmtp ? 'Testing Connection...' : 'Test SMTP Connection'}
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save SMTP Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
