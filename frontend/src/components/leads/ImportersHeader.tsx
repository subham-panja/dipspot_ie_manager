'use client';

import React from 'react';
import Link from 'next/link';
import { Globe, Plus, Compass, Download } from 'lucide-react';

interface ImportersHeaderProps {
  isLight: boolean;
  accentBadgeBg: string;
  onAddLead: () => void;
  exportCsvUrl: string;
  exportJsonUrl: string;
}

export default function ImportersHeader({
  isLight,
  accentBadgeBg,
  onAddLead,
  exportCsvUrl,
  exportJsonUrl,
}: ImportersHeaderProps) {
  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentBadgeBg}`}>
            Directory Hub
          </span>
          <span className="text-xs text-slate-400 font-mono">Global Buyer Registry</span>
        </div>
        <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <Globe className="w-6 h-6 text-blue-400" />
          Global Importers & Wholesale Buyers
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Verified international buyers with trade volume, geocoded map coordinates, and direct contact desk.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onAddLead}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Lead</span>
        </button>

        <Link
          href="/crawler"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
        >
          <Compass className="w-3.5 h-3.5 text-purple-400" />
          <span>Crawler</span>
        </Link>

        <a
          href={exportCsvUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          title="Download CSV matching current filters"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Export CSV</span>
        </a>

        <a
          href={exportJsonUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          title="Download JSON matching current filters"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export JSON</span>
        </a>
      </div>
    </div>
  );
}
