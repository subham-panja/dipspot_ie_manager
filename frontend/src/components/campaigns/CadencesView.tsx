'use client';

import React, { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import {
  Clock,
  Mail,
  Smartphone,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
  Sliders,
  Scale,
  Sparkles,
  Info,
} from 'lucide-react';

export interface CadenceStep {
  step_number: number;
  delay_days: number;
  channel: 'Email' | 'WhatsApp';
  template_name: string;
  subject: string;
  body: string;
}

export interface FollowUpCadence {
  cadence_id: string;
  name: string;
  description: string;
  status: string;
  channel_mix: string;
  auto_pause_on_reply: boolean;
  steps: CadenceStep[];
}

export interface CadenceEnrollment {
  enrollment_id: string;
  lead_id: number;
  company_name: string;
  country: string;
  email: string;
  phone: string;
  cadence_id: string;
  cadence_name: string;
  current_step: number;
  total_steps: number;
  status: string;
  has_replied: boolean;
  last_reply_channel?: string;
  last_reply_snippet?: string;
  next_step_due_at: string;
  execution_history: any[];
}

interface CadencesViewProps {
  isLight: boolean;
  accentClasses: any;
}

export default function CadencesView({ isLight, accentClasses }: CadencesViewProps) {
  const [cadences, setCadences] = useState<FollowUpCadence[]>([]);
  const [enrollments, setEnrollments] = useState<CadenceEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningDue, setRunningDue] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [showLegalGuide, setShowLegalGuide] = useState(false);

  const loadCadencesAndEnrollments = async () => {
    try {
      setLoading(true);
      const [cadRes, enrRes] = await Promise.all([
        fetchJson<{ cadences: FollowUpCadence[] }>('/campaigns/cadences'),
        fetchJson<{ enrollments: CadenceEnrollment[] }>('/campaigns/cadences/enrollments'),
      ]);
      setCadences(cadRes.cadences || []);
      setEnrollments(enrRes.enrollments || []);
    } catch (e) {
      console.error('Failed to load cadences', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCadencesAndEnrollments();
  }, []);

  const handleRunDueFollowups = async () => {
    try {
      setRunningDue(true);
      const res = await fetchJson<{ success: boolean; result: any }>('/campaigns/cadences/run-due', {
        method: 'POST',
      });
      alert(
        `Executed due follow-ups successfully!\nProcessed: ${res.result?.processed_count || 0}\nDispatched: ${res.result?.dispatched?.length || 0}`
      );
      loadCadencesAndEnrollments();
    } catch (e: any) {
      alert('Error running due followups: ' + e.message);
    } finally {
      setRunningDue(false);
    }
  };

  const handleEnrollLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;
    try {
      setEnrolling(true);
      const res = await fetchJson<{ success: boolean; message: string }>('/campaigns/cadences/enroll', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: parseInt(selectedLeadId),
          cadence_id: 'CAD-COMMERCIAL-OUTREACH',
        }),
      });
      alert(res.message);
      setShowEnrollModal(false);
      setSelectedLeadId('');
      loadCadencesAndEnrollments();
    } catch (e: any) {
      alert('Enrollment failed: ' + e.message);
    } finally {
      setEnrolling(false);
    }
  };

  const primaryCadence = cadences[0];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Omnichannel Follow-Up Automation
            </span>
            <span className="text-xs text-slate-400 font-mono">Gmail SMTP + WhatsApp Cadences</span>
          </div>
          <h2 className={`text-xl font-bold tracking-tight mt-1 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Clock className="w-5 h-5 text-purple-400" />
            Automated Multi-Touch Follow-Up Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Alternate strategic touchpoints between professional Gmail SMTP quotations and direct WhatsApp outreach. Features <strong>Centralized Auto-Pause</strong> so robotic messages instantly freeze when a client replies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowLegalGuide(!showLegalGuide)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>WhatsApp Legality Guide</span>
          </button>

          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Enroll Lead</span>
          </button>

          <button
            onClick={handleRunDueFollowups}
            disabled={runningDue}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 ${accentClasses.btn}`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${runningDue ? 'animate-spin' : ''}`} />
            <span>{runningDue ? 'Dispatching...' : 'Run Due Follow-Ups Now'}</span>
          </button>
        </div>
      </div>

      {/* WHATSAPP LEGALITY & ANTI-BAN ARCHITECTURE CALLOUT */}
      {showLegalGuide && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-600/40 shadow-sm text-amber-100 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                WhatsApp Automation: Legality & Anti-Ban Architecture
              </h3>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                You asked: <em>"Can I use my own WhatsApp for automation, and is it legal?"</em> Here is the complete legal and architectural breakdown:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>1. Statutory Law (India DPDP, TRAI, GDPR, TCPA)</span>
              </h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>LEGAL FOR B2B COMMERCE:</strong> Sending commercial proposals to institutional buyers is lawful under legitimate business interest, provided you immediately honor recipient opt-outs (e.g. <em>"Reply STOP to unsubscribe"</em>). Our engine auto-pauses and blacklists immediately upon receiving "STOP".
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>2. Meta Platform Terms of Service</span>
              </h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>HIGH BAN RISK IF ABUSED:</strong> Automating personal numbers via unofficial web tools violates Meta ToS (Section 3). If you blast 100+ unsolicited cold messages, your number will be permanently banned.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-200">
            <strong>TradePulse Dual-Mode Solution:</strong> Use your <strong>Personal WhatsApp</strong> with human typing delay (4.5s - 8.2s) strictly for direct 1-to-1 VIP follow-ups (capped at <strong>35-50 chats/day</strong>). Use the official <strong>Meta WhatsApp Business Cloud API</strong> for large automated broadcast cadences.
          </div>
        </div>
      )}

      {/* VISUAL CADENCE PIPELINE TIMELINE */}
      {primaryCadence && (
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
                Active Cadence Pipeline
              </span>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {primaryCadence.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {primaryCadence.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Pause on Reply: Enabled</span>
              </span>
            </div>
          </div>

          {/* Step Sequence Cards (Day 0 -> Day 2 -> Day 5 -> Day 8) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {primaryCadence.steps.map((st, idx) => {
              const isEmail = st.channel === 'Email';
              return (
                <div
                  key={st.step_number}
                  className={`p-4 rounded-xl border relative space-y-2.5 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                      Step {st.step_number} • Day {st.delay_days}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isEmail
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {isEmail ? <Mail className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                      <span>{st.channel}</span>
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {st.template_name}
                  </h4>

                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                    {st.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE ENROLLMENTS & AUTO-PAUSE AUDIT TABLE */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Enrolled Leads & Auto-Pause Activity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time progression status across all enrolled buyers and suppliers.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Total Enrolled: <strong className="text-white">{enrollments.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/60">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/60">
            <thead className={`text-[11px] uppercase font-bold tracking-wider ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400'}`}>
              <tr>
                <th className="p-3.5">Company & Contact</th>
                <th className="p-3.5">Market</th>
                <th className="p-3.5">Cadence Progress</th>
                <th className="p-3.5">Automation Status</th>
                <th className="p-3.5">Last Inbound Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-purple-400" />
                    <span>Loading cadence enrollments...</span>
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No leads enrolled yet. Click "Enroll Lead" to launch an automated cadence.
                  </td>
                </tr>
              ) : (
                enrollments.map((enr) => {
                  const isPaused = enr.status.includes('Paused');
                  return (
                    <tr key={enr.enrollment_id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{enr.company_name}</div>
                        <div className="text-[11px] text-slate-400">{enr.email || enr.phone}</div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">
                        {enr.country}
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-xs font-semibold text-slate-200">
                          Step {enr.current_step} of {enr.total_steps}
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(enr.current_step / enr.total_steps) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5">
                        {isPaused ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                            <Pause className="w-2.5 h-2.5" />
                            <span>PAUSED (CLIENT REPLIED)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>ACTIVE CADENCE</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-400">
                        {enr.last_reply_channel ? (
                          <div>
                            <span className="font-bold text-slate-200">via {enr.last_reply_channel}:</span>{' '}
                            <span className="italic">"{enr.last_reply_snippet}"</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Awaiting response</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ENROLL MODAL */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <h3 className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <span>Enroll Lead in Omnichannel Cadence</span>
            </h3>
            <p className="text-xs text-slate-400">
              The lead will enter Step 1 immediately (Gmail SCO Offer), followed by automated WhatsApp follow-ups on Day 2, 5, and 8.
            </p>

            <form onSubmit={handleEnrollLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Lead Database ID
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1, 2, 3..."
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition"
                >
                  {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

