'use client';

import React from 'react';
import { Kanban, Sliders, Plus } from 'lucide-react';

interface PipelineHeaderProps {
  stagesCount: number;
  onOpenConfig: () => void;
  onOpenNewDeal: () => void;
  isLight: boolean;
  accentClasses: {
    badgeBg: string;
    text: string;
    bg: string;
    bgHover: string;
  };
}

export default function PipelineHeader({
  stagesCount,
  onOpenConfig,
  onOpenNewDeal,
  isLight,
  accentClasses,
}: PipelineHeaderProps) {
  return (
    <div
      className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
            Interactive Funnel
          </span>
          <span className="text-xs text-slate-400 font-mono">{stagesCount} Stages • Drag &amp; Drop Enabled</span>
        </div>
        <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <Kanban className={`w-6 h-6 ${accentClasses.text}`} />
          Customer Pipeline Kanban
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tactile drag-and-drop board tracking customer deals through negotiation, contract signing, and cargo release.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenConfig}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configure Stages</span>
        </button>

        <button
          onClick={onOpenNewDeal}
          className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5 cursor-pointer`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer Deal</span>
        </button>
      </div>
    </div>
  );
}
