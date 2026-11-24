'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface PipelineFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  countryFilter: string;
  onCountryFilterChange: (val: string) => void;
  countries: string[];
  activeDealsCount: number;
  totalValue: number;
  totalQuantity: number;
  formatCurrency: (val: number) => string;
  isLight: boolean;
}

export default function PipelineFilterBar({
  search,
  onSearchChange,
  countryFilter,
  onCountryFilterChange,
  countries,
  activeDealsCount,
  totalValue,
  totalQuantity,
  formatCurrency,
  isLight,
}: PipelineFilterBarProps) {
  return (
    <div
      className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer, opportunity title, or commodity..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full text-xs pl-8 pr-3 py-2 rounded-lg border outline-none transition ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500'
            }`}
          />
        </div>
        <select
          value={countryFilter}
          onChange={(e) => onCountryFilterChange(e.target.value)}
          className={`text-xs px-3 py-2 rounded-lg border outline-none ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-slate-950 border-slate-800 text-slate-200'
          }`}
        >
          <option value="">All Customer Geographies</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
        <span>
          Active Deals: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{activeDealsCount}</strong>
        </span>
        <span>&bull;</span>
        <span>
          Pipeline Value:{' '}
          <strong className="text-emerald-400 font-mono font-bold">{formatCurrency(totalValue)}</strong>
        </span>
        <span>&bull;</span>
        <span className="font-mono">({totalQuantity.toLocaleString()} MT)</span>
      </div>
    </div>
  );
}
