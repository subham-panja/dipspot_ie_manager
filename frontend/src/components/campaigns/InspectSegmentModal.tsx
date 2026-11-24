'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CustomerSegment } from './CampaignTypes';

interface InspectSegmentModalProps {
  segment: CustomerSegment | null;
  onClose: () => void;
  leads: any[];
  loading: boolean;
  isLight: boolean;
}

export default function InspectSegmentModal({
  segment,
  onClose,
  leads,
  loading,
  isLight,
}: InspectSegmentModalProps) {
  if (!segment) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {segment.segment_id}
              </span>
              <h3 className={`text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {segment.name}
              </h3>
              <p className="text-xs text-slate-400">{segment.description}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Filtered Members ({leads.length})</span>
              <span>Minimum Score: {segment.min_score}+</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading members...</div>
            ) : leads.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                No leads match this segment criteria yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white">{lead.company_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {lead.contact_person || 'Executive Buyer'} &bull; {lead.country}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Score: {lead.priority_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
