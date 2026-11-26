'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Megaphone, AlertCircle, Loader2, GitBranch } from 'lucide-react';
import { CustomerLead, OutreachHistoryResponse, OutreachMessage } from './dossierTypes';
import { fetchJson } from '@/lib/api';

interface DossierOutreachTabProps {
  lead: CustomerLead;
  isLight: boolean;
}

export default function DossierOutreachTab({ lead, isLight }: DossierOutreachTabProps) {
  const [data, setData] = useState<OutreachHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyChannel, setReplyChannel] = useState<'Email' | 'WhatsApp'>('Email');
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasValidLeadId = Boolean(lead.id && String(lead.id) !== '0');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  const loadOutreachHistory = async (targetId = lead.id) => {
    const seq = ++requestSeqRef.current;
    if (!targetId || String(targetId) === '0') {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetchJson<OutreachHistoryResponse>(`/leads/${targetId}/outreach-history`);
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setData(res || null);
    } catch (err: any) {
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setData(null);
      setError(err?.message || 'Failed to load outreach history.');
    } finally {
      if (isMountedRef.current && seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setReplyContent('');
    setSendFeedback(null);
    loadOutreachHistory(lead.id);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [lead.id]);

  const handleQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidLeadId || !replyContent.trim() || sending) return;
    const targetId = lead.id;
    try {
      setSending(true);
      setError(null);
      setSendFeedback(null);
      const res = await fetchJson<{ message?: string }>(`/omnichannel/threads/${targetId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          channel: replyChannel,
          content: replyContent.trim(),
        }),
      });
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      setReplyContent('');
      setSendFeedback(res?.message || `Sent ${replyChannel} message.`);
      await loadOutreachHistory(targetId);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Failed to send outreach reply.');
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  };

  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';

  if (!hasValidLeadId) {
    return (
      <div className={`p-4 rounded-xl border text-xs ${cardBg} ${textMuted}`}>
        This pipeline deal is not linked to a directory lead yet. Link it to view or log outreach history.
      </div>
    );
  }

  const messages: OutreachMessage[] = data?.messages || [];
  const enrollments = data?.enrollments || [];
  const cadence = data?.cadence_enrollment || null;
  const hasHistory = messages.length > 0 || enrollments.length > 0 || Boolean(cadence);

  return (
    <div className="space-y-4 text-xs">
      {error && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sendFeedback && (
        <div
          className={`p-2.5 rounded-lg border text-xs ${
            isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {sendFeedback}
        </div>
      )}

      {/* Quick Reply Box */}
      <form onSubmit={handleQuickReply} className={`p-3 rounded-xl border space-y-2 ${cardBg}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`font-bold text-[11px] ${textPrimary}`}>Quick Outreach Message</span>
          <select
            value={replyChannel}
            onChange={(e) => setReplyChannel(e.target.value as 'Email' | 'WhatsApp')}
            className={`text-[11px] px-2 py-1 rounded-lg border outline-none ${
              isLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            <option value="Email">Email</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Send ${replyChannel} follow-up to ${lead.company_name}...`}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs border outline-none focus:border-blue-500 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          />
          <button
            type="submit"
            disabled={sending || !replyContent.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </form>

      {loading ? (
        <div className={`py-6 text-center text-xs flex items-center justify-center gap-2 ${textMuted}`}>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Loading outreach history...</span>
        </div>
      ) : !hasHistory ? (
        <div className={`py-8 text-center space-y-2 ${textMuted}`}>
          <Send className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-xs">No outreach messages or campaign enrollments logged for this lead yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cadence && (
            <div className={`p-3 rounded-xl border flex items-center justify-between ${cardBg}`}>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <span className={`font-semibold ${textPrimary}`}>
                    {cadence.cadence_name || cadence.cadence_id || 'Active Cadence'}
                  </span>
                  <span className={`text-[10px] block ${textMuted}`}>
                    Step {cadence.current_step || 1} / {cadence.total_steps || 1}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                {cadence.status || 'Active'}
              </span>
            </div>
          )}

          {enrollments.length > 0 && (
            <div className="space-y-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
                Campaign Enrollments ({enrollments.length})
              </span>
              <div className="space-y-2">
                {enrollments.map((enr, idx) => (
                  <div
                    key={enr.enrollment_id || enr._id || idx}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${cardBg}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Megaphone className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <span className={`font-semibold block truncate ${textPrimary}`}>
                          {enr.campaign_name || enr.campaign_id}
                        </span>
                        <span className={`text-[10px] block ${textMuted}`}>
                          {enr.contact_name ? `${enr.contact_name} • ` : ''}
                          Mode: {enr.enrollment_mode || 'all_contacts'} &bull;{' '}
                          {enr.enrolled_at ? enr.enrolled_at.slice(0, 10) : 'Recent'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      {enr.status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
                Communication Log ({messages.length})
              </span>
              <div className="space-y-2">
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`p-3 rounded-xl border space-y-1 ${cardBg}`}>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${textPrimary}`}>
                          {msg.channel || 'Email'}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                            msg.direction === 'inbound'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}
                        >
                          {msg.direction || 'outbound'}
                        </span>
                      </div>
                      <span className={`font-mono text-[10px] ${textMuted}`}>
                        {msg.timestamp ? msg.timestamp.slice(0, 16).replace('T', ' ') : ''}
                      </span>
                    </div>
                    {msg.subject && (
                      <div className={`text-[11px] font-semibold ${textPrimary}`}>{msg.subject}</div>
                    )}
                    <p className={`text-xs whitespace-pre-line ${textMuted}`}>{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
