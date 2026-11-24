'use client';

import React from 'react';
import { ShieldCheck, CheckCircle, EyeOff, Eye, Sparkles, Save } from 'lucide-react';
import { ModalSmtpConfig } from './globalSettingsTypes';

interface ModalSmtpTabProps {
  smtp: ModalSmtpConfig;
  setSmtp: React.Dispatch<React.SetStateAction<ModalSmtpConfig>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  testingSmtp: boolean;
  smtpStatusMsg: string;
  onSaveSmtp: (e: React.FormEvent) => Promise<void>;
  onTestSmtp: () => Promise<void>;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function ModalSmtpTab({
  smtp,
  setSmtp,
  showPassword,
  setShowPassword,
  testingSmtp,
  smtpStatusMsg,
  onSaveSmtp,
  onTestSmtp,
  isLight,
  accentClasses,
}: ModalSmtpTabProps) {
  return (
    <form onSubmit={onSaveSmtp} className="space-y-4">
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Primary Outbound Gateway: <strong>Gmail SMTP</strong> is active. Use your standard Google Workspace or Gmail App Password.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
          {smtp.is_verified ? 'Verified Active' : 'Pending Verification'}
        </span>
      </div>

      {smtpStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{smtpStatusMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-slate-400 mb-1 font-medium">SMTP Server Host</label>
          <input
            type="text"
            value={smtp.host}
            onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
            className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Port</label>
          <input
            type="number"
            value={smtp.port}
            onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
            className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Gmail Username / Account Email</label>
          <input
            type="text"
            value={smtp.username}
            onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
            className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">App Password (16-character Google Pass)</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={smtp.masked_password || 'Enter Google App Password...'}
              value={smtp.password || ''}
              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
              className={`w-full p-2.5 pr-10 rounded-xl border outline-none font-mono ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Sender Display Name</label>
          <input
            type="text"
            value={smtp.from_name}
            onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
            className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">From Reply Email</label>
          <input
            type="email"
            value={smtp.from_email}
            onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
            className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 space-y-2">
        <div className="font-bold text-slate-300 text-xs">Omnichannel Gateway Status:</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <div className="font-bold">✉️ Email Channel</div>
            <div className="text-[10px] text-emerald-300">Active (Gmail SMTP)</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <div className="font-bold">💬 WhatsApp Gateway</div>
            <div className="text-[10px] text-amber-300">Upcoming / In Development</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400">
            <div className="font-bold">📱 SMS Carrier</div>
            <div className="text-[10px] text-slate-400">Upcoming / Carrier Webhook</div>
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          disabled={testingSmtp}
          onClick={onTestSmtp}
          className="px-4 py-2 rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-bold text-xs transition flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{testingSmtp ? 'Testing Handshake...' : 'Test SMTP Connection'}</span>
        </button>

        <button
          type="submit"
          className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition ${accentClasses.btn}`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save SMTP Configuration</span>
        </button>
      </div>
    </form>
  );
}
