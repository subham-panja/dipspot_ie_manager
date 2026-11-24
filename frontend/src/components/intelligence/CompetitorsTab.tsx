'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Competitor } from './intelligenceTypes';

interface CompetitorsTabProps {
  competitors: Competitor[];
  isLight: boolean;
  onAddCompetitor: () => void;
}

export default function CompetitorsTab({
  competitors,
  isLight,
  onAddCompetitor,
}: CompetitorsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">
          Surveillance intelligence tracking competitor processing &amp; supply capacities, port logistics, and contract tactics.
        </p>
        <button
          onClick={onAddCompetitor}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Competitor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitors.map((c, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl border space-y-3.5 shadow-sm transition ${
              isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                  {c.market_share_tier}
                </span>
                <h3 className={`text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {c.company_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">HQ: {c.hq_country}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Est. Volume</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {c.estimated_volume_mt_month.toLocaleString()} MT/mo
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border space-y-2 text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800/80'
            }`}>
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Core Varieties:</span>
                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{c.core_varieties}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Target Markets:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.primary_export_markets?.map((m, i) => (
                    <span key={i} className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Export Ports:</span>
                <span className="text-slate-400">{c.export_ports?.join(', ')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Key Strength</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">{c.strengths || 'N/A'}</span>
              </div>
              <div className="bg-red-950/20 border border-red-900/40 p-2.5 rounded-lg">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Vulnerability / Edge</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">{c.vulnerabilities || 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
