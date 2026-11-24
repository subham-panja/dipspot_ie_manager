'use client';

import React from 'react';
import Link from 'next/link';
import { Factory, Plus, Compass, Download } from 'lucide-react';

interface SuppliersHeaderProps {
  total: number;
  isLight: boolean;
  onAddSupplier: () => void;
  exportCsvUrl: string;
  exportJsonUrl: string;
}

export default function SuppliersHeader({
  total,
  isLight,
  onAddSupplier,
  exportCsvUrl,
  exportJsonUrl,
}: SuppliersHeaderProps) {
  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Verified Suppliers &amp; Producers
          </span>
          <span className="text-xs text-slate-400 font-mono">{total} Units Registered</span>
        </div>
        <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <Factory className="w-6 h-6 text-emerald-500" />
          Verified Commodity Suppliers &amp; Producers
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Licensed manufacturing plants, verified supplier processing facilities, agricultural aggregators, and commercial production hubs.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onAddSupplier}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Supplier</span>
        </button>

        <Link
          href="/crawler"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
        >
          <Compass className="w-3.5 h-3.5 text-purple-400" />
          <span>Crawl New</span>
        </Link>

        <a
          href={exportCsvUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
          title="Download CSV matching current filters"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export CSV</span>
        </a>

        <a
          href={exportJsonUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
          title="Download JSON matching current filters"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export JSON</span>
        </a>
      </div>
    </div>
  );
}
