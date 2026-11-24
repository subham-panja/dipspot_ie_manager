'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SortOption {
  value: string;
  label: string;
}

interface LeadFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  searchPlaceholder?: string;
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  isLight: boolean;
  accentTextColor?: string;
  children?: React.ReactNode;
}

export default function LeadFiltersBar({
  search,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search by name, contact, commodity...',
  sortBy,
  onSortChange,
  sortOptions,
  isLight,
  accentTextColor = 'text-blue-400',
  children,
}: LeadFiltersBarProps) {
  return (
    <div
      className={`p-3 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
        {children}

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className={`text-xs px-3 py-1.5 rounded-lg border outline-none font-medium ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : `bg-slate-950 border-slate-800 ${accentTextColor}`
          }`}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={onSearchSubmit} className="relative w-full md:w-72">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border outline-none ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500'
          }`}
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
      </form>
    </div>
  );
}
