'use client';

import React from 'react';
import { Download, Trash2, X } from 'lucide-react';

interface StageOption {
  value: string;
  label: string;
}

interface LeadBulkActionBarProps {
  selectedCount: number;
  exportCsvUrl: string;
  exportJsonUrl: string;
  onBulkStatusUpdate: (stage: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  stagePlaceholder?: string;
  stageOptions: StageOption[];
  badgeBgColor?: string;
  borderColor?: string;
  itemNoun?: string;
}

export default function LeadBulkActionBar({
  selectedCount,
  exportCsvUrl,
  exportJsonUrl,
  onBulkStatusUpdate,
  onBulkDelete,
  onClearSelection,
  stagePlaceholder = 'Set Deal Stage...',
  stageOptions,
  badgeBgColor = 'bg-blue-500',
  borderColor = 'border-blue-500/50',
  itemNoun = 'Leads',
}: LeadBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`sticky top-4 z-30 bg-slate-900 border ${borderColor} shadow-2xl rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white animate-in fade-in duration-150`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full ${badgeBgColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}
        >
          {selectedCount}
        </span>
        <span className="font-semibold">
          {selectedCount} {itemNoun} Selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={exportCsvUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 text-xs text-slate-200 transition"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Export Selected (CSV)</span>
        </a>

        <a
          href={exportJsonUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 text-xs text-slate-200 transition"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Selected (JSON)</span>
        </a>

        <select
          onChange={(e) => {
            if (e.target.value) onBulkStatusUpdate(e.target.value);
            e.target.value = '';
          }}
          defaultValue=""
          className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none"
        >
          <option value="" disabled>
            {stagePlaceholder}
          </option>
          {stageOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={onBulkDelete}
          className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/40 flex items-center gap-1.5 text-xs transition"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Delete</span>
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 text-slate-400 hover:text-white transition"
          title="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
