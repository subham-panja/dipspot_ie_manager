'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Trash2, Loader2 } from 'lucide-react';
import { fetchJson } from '@/lib/api';
import { CustomerLead, LeadNote, TimelineEvent } from './dossierTypes';

interface DossierNotesProps {
  lead: CustomerLead;
  isLight: boolean;
}

export default function DossierNotes({ lead, isLight }: DossierNotesProps) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [extractionNotes, setExtractionNotes] = useState<string>(lead.extraction_notes || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [tag, setTag] = useState('General');

  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  const hasValidLeadId = Boolean(lead.id && String(lead.id) !== '0');

  const loadNotesAndTimeline = async (targetId = lead.id) => {
    const seq = ++requestSeqRef.current;
    if (!targetId || String(targetId) === '0') {
      setNotes([]);
      setTimeline([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [notesRes, timelineRes] = await Promise.all([
        fetchJson<{ notes: LeadNote[]; extraction_notes?: string }>(`/leads/${targetId}/notes`),
        fetchJson<{ timeline: TimelineEvent[] }>(`/leads/${targetId}/timeline`),
      ]);
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setNotes(Array.isArray(notesRes?.notes) ? notesRes.notes : []);
      if (typeof notesRes?.extraction_notes === 'string') {
        setExtractionNotes(notesRes.extraction_notes);
      }
      setTimeline(Array.isArray(timelineRes?.timeline) ? timelineRes.timeline : []);
    } catch (err: any) {
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setError(err?.message || 'Unable to load notes and timeline.');
    } finally {
      if (isMountedRef.current && seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setNotes([]);
    setTimeline([]);
    setError(null);
    setExtractionNotes(lead.extraction_notes || '');
    setNoteText('');
    loadNotesAndTimeline(lead.id);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [lead.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasValidLeadId || !noteText.trim() || submitting) return;
    const targetId = lead.id;
    try {
      setSubmitting(true);
      setError(null);
      await fetchJson(`/leads/${targetId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: noteText.trim(), tag }),
      });
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      setNoteText('');
      await loadNotesAndTimeline(targetId);
    } catch (err: any) {
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      setError(err?.message || 'Failed to save note.');
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!hasValidLeadId) return;
    const targetId = lead.id;
    try {
      setError(null);
      await fetchJson(`/leads/${targetId}/notes/${noteId}`, { method: 'DELETE' });
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      await loadNotesAndTimeline(targetId);
    } catch (err: any) {
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      setError(err?.message || 'Failed to delete note.');
    }
  };

  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div className={`p-3.5 rounded-xl border text-xs space-y-3 ${cardBg}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-bold flex items-center gap-1.5 ${textPrimary}`}>
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Notes &amp; Activity Timeline</span>
        </h4>
        <span className="text-[10px] font-mono text-emerald-500 font-bold">
          {lead.trade_role || (lead.lead_type === 'importer' ? 'Verified Importer' : 'Registered Supplier')}
        </span>
      </div>

      {error && (
        <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px]">
          {error}
        </div>
      )}

      {extractionNotes && (
        <div
          className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
            isLight ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-purple-500/10 border-purple-500/30 text-purple-200'
          }`}
        >
          <div className="font-bold text-[10px] uppercase tracking-wider">Extraction Notes</div>
          <div className="whitespace-pre-line font-mono text-[10px]">{extractionNotes}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className={`text-[11px] px-2 py-1.5 rounded-lg border outline-none ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <option value="General">General</option>
            <option value="Call">Call</option>
            <option value="Quote">Quote</option>
            <option value="Follow-up">Follow-up</option>
          </select>
          <input
            type="text"
            placeholder="Log call outcome, quotation note, or next step..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs border outline-none focus:border-blue-500 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          />
          <button
            type="submit"
            disabled={submitting || !noteText.trim() || !hasValidLeadId}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shrink-0"
          >
            {submitting ? 'Saving...' : 'Log Note'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className={`py-4 flex items-center justify-center gap-2 ${textMuted}`}>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Loading notes &amp; timeline...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.length > 0 && (
            <div className="space-y-1.5">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
                Saved Notes ({notes.length})
              </div>
              {notes.map((n) => {
                const nid = n.note_id || n.id;
                return (
                  <div
                    key={nid}
                    className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">
                          {n.tag || 'General'}
                        </span>
                        <span className={textMuted}>
                          {n.created_at ? n.created_at.slice(0, 16).replace('T', ' ') : ''}
                        </span>
                      </div>
                      <p className={`text-[11px] whitespace-pre-line ${textPrimary}`}>{n.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(nid)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition shrink-0"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {timeline.length > 0 && (
            <div
              className={`space-y-2 border-l-2 pl-3 ml-1.5 text-[11px] ${
                isLight ? 'border-slate-300' : 'border-slate-800'
              }`}
            >
              {timeline.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-blue-500" />
                  <div className={`font-semibold ${textPrimary}`}>{ev.title}</div>
                  {ev.description && <div className={`text-[10px] ${textMuted}`}>{ev.description}</div>}
                  <div className={`text-[9px] font-mono ${textMuted}`}>
                    {ev.timestamp ? ev.timestamp.slice(0, 16).replace('T', ' ') : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {notes.length === 0 && timeline.length === 0 && !extractionNotes && (
            <p className={`text-[11px] text-center py-2 ${textMuted}`}>
              No notes or timeline events logged yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
