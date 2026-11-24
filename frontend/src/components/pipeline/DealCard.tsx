'use client';

import React from 'react';
import { Building2, GripVertical } from 'lucide-react';
import { Deal, Stage } from './pipelineTypes';

interface DealCardProps {
  deal: Deal;
  stages: Stage[];
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onOpenDossier: (e: React.MouseEvent, deal: Deal) => void;
  onStageChange: (dealId: string, newStageId: string) => void;
  formatCurrency: (val: number) => string;
  isLight: boolean;
  accentTextClass: string;
}

export default function DealCard({
  deal,
  stages,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onOpenDossier,
  onStageChange,
  formatCurrency,
  isLight,
  accentTextClass,
}: DealCardProps) {
  const dealValue = deal.value_usd ?? (deal.quantity_mt || 0) * 470;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.deal_id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`p-3.5 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all group hover:shadow-md ${
        isDragging
          ? 'opacity-30 border-dashed border-emerald-500 scale-[0.98]'
          : isLight
          ? 'bg-white border-slate-200 hover:border-slate-300'
          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          className={`text-xs font-bold transition line-clamp-1 group-hover:${accentTextClass} ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          {deal.title}
        </h4>
        <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-50 group-hover:opacity-100 transition shrink-0" />
      </div>

      <div
        onClick={(e) => {
          e.stopPropagation();
          onOpenDossier(e, deal);
        }}
        className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
        title="Click to view Customer Map & Intelligence"
      >
        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span
          className={`font-semibold truncate underline decoration-dotted underline-offset-2 ${
            isLight ? 'text-slate-700' : 'text-slate-200'
          }`}
        >
          {deal.company_name}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate max-w-[110px]">{deal.country}</span>
        <div className="flex items-center gap-1 font-mono">
          <span className="text-emerald-400 font-bold">{formatCurrency(dealValue)}</span>
          <span className="text-slate-500 font-semibold">({deal.quantity_mt} MT)</span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center justify-between gap-2">
        <select
          value={deal.stage_id}
          onChange={(e) => {
            e.stopPropagation();
            onStageChange(deal.deal_id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full text-[11px] rounded-lg px-2 py-1 border outline-none ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {stages.map((st) => (
            <option key={st.stage_id} value={st.stage_id}>
              Move &rarr; {st.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
