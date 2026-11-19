'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  RotateCcw,
  Play,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Mail,
  Zap,
} from 'lucide-react';

export interface SmtpStopperStatus {
  sent_today: number;
  daily_limit: number;
  remaining: number;
  percent_used: number;
  is_hard_stopped: boolean;
  stop_reason: string;
  stopped_at: string | null;
  total_lifetime_sent: number;
  window_resets_in: string;
  last_sent_at: string | null;
}

interface SmtpStopperBannerProps {
  status: SmtpStopperStatus | null;
  onHardBreak: () => Promise<void>;
  onResume: () => Promise<void>;
  onResetCounter: () => Promise<void>;
  onUpdateLimit: (newLimit: number) => Promise<void>;
  isLight: boolean;
  accentClasses: any;
}

export default function SmtpStopperBanner({
  status,
  onHardBreak,
  onResume,
  onResetCounter,
  onUpdateLimit,
  isLight,
  accentClasses,
}: SmtpStopperBannerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [customLimit, setCustomLimit] = useState(status?.daily_limit || 450);

  if (!status) return null;

  const handleAction = async (fn: () => Promise<void>) => {
    try {
      setActionLoading(true);
      await fn();
    } catch (e: any) {
      alert(e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const isHardStopped = status.is_hard_stopped;
  const isNearLimit = status.percent_used >= 80 && !isHardStopped;

  return (
    <div className="space-y-3">
      {/* 1. CRITICAL HARD-BREAK ALERT BANNER (Shown when Stopper is tripped) */}
      {isHardStopped && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-600/80 shadow-lg shadow-rose-950/50 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <AlertOctagon className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500 text-white font-mono tracking-wider">
                  EMERGENCY HARD-STOP ACTIVATED
                </span>
                <span className="text-xs text-rose-300 font-mono">
                  {status.stopped_at ? new Date(status.stopped_at).toLocaleTimeString() : 'Active Freeze'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                Gmail Mail Stopper Engaged: All Automated Email Outreach Frozen!
              </h3>
              <p className="text-xs text-rose-200/90 mt-0.5 max-w-2xl">
                <span className="font-semibold text-rose-100">Trigger Reason:</span> {status.stop_reason || 'Personal Gmail 24-hour SMTP sending limit ceiling reached.'} Active broadcasts and cadence dispatches are held to prevent Gmail account suspension.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => handleAction(onResume)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Disengage & Resume</span>
            </button>
            <button
              onClick={() => handleAction(onResetCounter)}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Reset 24h Sent Counter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 24h Counter</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. LIVE SMTP QUOTA GAUGE BAR & SAFETY CONTROLS */}
      <div
        className={`p-4 rounded-2xl border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : isHardStopped
            ? 'bg-slate-900/90 border-rose-800/40'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Quota Tracker & Status */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase border flex items-center gap-1 ${
                  isHardStopped
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : isNearLimit
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isHardStopped ? (
                  <>
                    <AlertOctagon className="w-3 h-3 text-rose-400" />
                    <span>Hard-Stopped</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Stopper Active & Protected</span>
                  </>
                )}
              </span>

              <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                Personal Gmail SMTP Quota Monitor
              </span>

              <span className="text-[11px] text-slate-400 font-mono">
                • Resets in: <strong className="text-slate-300">{status.window_resets_in}</strong>
              </span>

              <span className="text-[11px] text-slate-400 font-mono">
                • Lifetime: {status.total_lifetime_sent.toLocaleString()} sent
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Daily Usage: <strong className={isHardStopped ? 'text-rose-400 font-bold' : isLight ? 'text-slate-900' : 'text-white'}>{status.sent_today}</strong> / {status.daily_limit} emails
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {status.remaining} remaining today ({status.percent_used}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHardStopped
                      ? 'bg-rose-500'
                      : status.percent_used > 80
                      ? 'bg-amber-500'
                      : status.percent_used > 50
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(status.percent_used, 2))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Operational Actions & Quota Settings */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Configure Daily Limit Threshold"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Limit: {status.daily_limit}/day</span>
            </button>

            {!isHardStopped ? (
              <button
                onClick={() => {
                  if (confirm('Engage Emergency Hard Stop? All active campaigns will be frozen immediately.')) {
                    handleAction(onHardBreak);
                  }
                }}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Emergency Freeze</span>
              </button>
            ) : (
              <button
                onClick={() => handleAction(onResume)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Sending</span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm('Reset the rolling 24-hour counter back to 0?')) {
                  handleAction(onResetCounter);
                }
              }}
              disabled={actionLoading}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Reset 24h Quota Counter"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Quota Config Drawer */}
        {showConfig && (
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Select safe threshold:</span>
              <button
                onClick={() => { setCustomLimit(100); onUpdateLimit(100); }}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                  status.daily_limit === 100
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                100 (Strict Safe)
              </button>
              <button
                onClick={() => { setCustomLimit(450); onUpdateLimit(450); }}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                  status.daily_limit === 450
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                450 (Standard Personal)
              </button>
              <button
                onClick={() => { setCustomLimit(1900); onUpdateLimit(1900); }}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                  status.daily_limit === 1900
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                1,900 (Google Workspace)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="2000"
                value={customLimit}
                onChange={(e) => setCustomLimit(parseInt(e.target.value) || 450)}
                className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
              <button
                onClick={() => onUpdateLimit(customLimit)}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Save Limit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

