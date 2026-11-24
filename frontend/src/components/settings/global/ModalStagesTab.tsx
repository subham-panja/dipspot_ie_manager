'use client';

import React from 'react';
import { Stage } from './globalSettingsTypes';

interface ModalStagesTabProps {
  pipelineStages: Stage[];
  shipmentStages: Stage[];
  isLight: boolean;
}

export default function ModalStagesTab({
  pipelineStages,
  shipmentStages,
  isLight,
}: ModalStagesTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Sales Pipeline Stages (Kanban Funnel)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {pipelineStages.map((st) => (
            <div
              key={st.stage_id}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-2"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: st.color || '#3b82f6' }}
              />
              <div className="truncate font-semibold text-xs text-slate-200">{st.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/40">
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Cargo & Ocean Freight Master Milestones
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {shipmentStages.map((st) => (
            <div
              key={st.stage_id}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between"
            >
              <div className="truncate font-semibold text-xs text-slate-200">{st.name}</div>
              <span className="text-[10px] font-mono text-cyan-400">Step {st.order}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
