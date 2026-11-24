'use client';

import React from 'react';
import { Inbox, X } from 'lucide-react';
import { DispatchRecord } from './templateTypes';

interface TemplateOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  outboxRecords: DispatchRecord[];
  loadingOutbox: boolean;
  isLight: boolean;
}

export default function TemplateOutboxModal({
  isOpen,
  onClose,
  outboxRecords,
  loadingOutbox,
  isLight,
}: TemplateOutboxModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Dispatched Outbox Log ({outboxRecords.length})</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Live audit trail of test messages and broadcasts processed by the gateway engine.
        </p>

        {loadingOutbox ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading outbox logs...</div>
        ) : outboxRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No dispatches recorded yet. Use the Test Send console in the studio to generate live logs.
          </div>
        ) : (
          <div className="space-y-2.5">
            {outboxRecords.map((r) => (
              <div
                key={r.dispatch_id || r._id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        r.channel === 'Email'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : r.channel === 'WhatsApp'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {r.channel}
                    </span>
                    <span className="font-semibold text-white">{r.recipient}</span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(r.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                    {new Date(r.sent_at).toLocaleDateString()}
                  </span>
                </div>

                {r.subject && (
                  <div className="text-[11px] text-slate-300 font-medium truncate">
                    Subject: {r.subject}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/50 p-2 rounded-lg font-mono whitespace-pre-wrap">
                  {r.body}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span className="font-mono">ID: {r.dispatch_id}</span>
                  <span className="text-emerald-400 font-medium">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
