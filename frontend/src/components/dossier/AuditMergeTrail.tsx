'use client';

import React from 'react';
import { History } from 'lucide-react';

interface AuditMergeTrailProps {
  mergedHistory?: any[];
}

export default function AuditMergeTrail({ mergedHistory }: AuditMergeTrailProps) {
  if (!mergedHistory || mergedHistory.length === 0) return null;

  return (
    <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-purple-400">
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          ML Deduplication Audit History ({mergedHistory.length} merges)
        </span>
      </div>
      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
        {mergedHistory.map((ev, i) => (
          <div key={i} className="text-[10px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <div className="flex justify-between font-mono text-[9px] text-slate-400">
              <span>Score: {ev.similarity_score}% ({ev.match_reason || 'ML Match'})</span>
              <span>{ev.merged_at ? ev.merged_at.slice(0, 10) : ''}</span>
            </div>
            <p className="truncate text-slate-200 mt-0.5">{ev.candidate_company} &bull; {ev.source_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
