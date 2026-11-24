'use client';

import React from 'react';
import { Plus, Tag, UserCheck, Send, Trash2 } from 'lucide-react';
import { CustomerSegment } from './CampaignTypes';

interface SegmentsTabProps {
  segments: CustomerSegment[];
  isLight: boolean;
  accentClasses: any;
  onInspectSegment: (seg: CustomerSegment) => void;
  onDeleteSegment: (segmentId: string) => Promise<void>;
  onLaunchSegmentCampaign: (seg: CustomerSegment) => void;
  onOpenNewSegmentModal: () => void;
}

export default function SegmentsTab({
  segments,
  isLight,
  accentClasses,
  onInspectSegment,
  onDeleteSegment,
  onLaunchSegmentCampaign,
  onOpenNewSegmentModal,
}: SegmentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Audience Segments & Targeted Customer Groups
          </h2>
          <p className="text-xs text-slate-400">
            Create and filter dynamic customer groupings based on import tonnage, bank qualification score, and target destinations.
          </p>
        </div>

        <button
          onClick={onOpenNewSegmentModal}
          className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5 cursor-pointer`}
        >
          <Plus className="w-4 h-4" />
          <span>Create Customer Segment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {segments.map((seg) => (
          <div
            key={seg.segment_id}
            className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  {seg.segment_id}
                </span>
                <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {seg.member_count ?? 0} Matched Leads
                </span>
              </div>

              <h3 className={`text-base font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {seg.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{seg.description}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {seg.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5 text-purple-400" />
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Lead Type:</span>
                  <strong className="text-slate-200 capitalize">
                    {seg.lead_type === 'wb_mill' ? 'Domestic Supplier' : 'Global Importer / Buyer'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Target Geographies:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">
                    {seg.countries?.length > 0 ? seg.countries.join(', ') : 'All Countries'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Priority Score:</span>
                  <span className="font-mono text-emerald-400 font-bold">{seg.min_score}+</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <button
                onClick={() => onInspectSegment(seg)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Customer List</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLaunchSegmentCampaign(seg)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Launch Campaign</span>
                </button>

                <button
                  onClick={() => onDeleteSegment(seg.segment_id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
