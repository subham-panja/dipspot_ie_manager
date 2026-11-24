'use client';

import React from 'react';
import { X } from 'lucide-react';

interface SuppliersFilterDropdownsProps {
  district: string;
  onDistrictChange: (val: string) => void;
  commodity: string;
  onCommodityChange: (val: string) => void;
  minScore: number | '';
  onMinScoreChange: (val: number | '') => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  isLight: boolean;
}

export default function SuppliersFilterDropdowns({
  district,
  onDistrictChange,
  commodity,
  onCommodityChange,
  minScore,
  onMinScoreChange,
  hasActiveFilters,
  onResetFilters,
  isLight,
}: SuppliersFilterDropdownsProps) {
  const selectBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-800'
    : 'bg-slate-950 border-slate-800 text-slate-200';

  return (
    <>
      <select
        value={district}
        onChange={(e) => onDistrictChange(e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${selectBg}`}
      >
        <option value="">All Production Clusters</option>
        <option value="Burdwan">Burdwan (Purba / Paschim)</option>
        <option value="Hooghly">Hooghly Milling Corridor</option>
        <option value="Birbhum">Birbhum Agro Basin</option>
        <option value="Midnapore">Midnapore / Haldia Port</option>
        <option value="Bankura">Bankura Grain Terminal</option>
        <option value="Nadia">Nadia Border Access</option>
      </select>

      <select
        value={commodity}
        onChange={(e) => onCommodityChange(e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${selectBg}`}
      >
        <option value="">All Commodity Specialties</option>
        <option value="IR-64">IR-64 Parboiled Non-Basmati</option>
        <option value="Swarna">Swarna Premium Milled</option>
        <option value="Minikit">Minikit Super Fine</option>
        <option value="Basmati">1121 &amp; Traditional Basmati</option>
        <option value="Sortex">Sortex Cleaned Ready Units</option>
      </select>

      <select
        value={minScore}
        onChange={(e) => onMinScoreChange(e.target.value ? Number(e.target.value) : '')}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${selectBg}`}
      >
        <option value="">All Quality Scores</option>
        <option value="80">Score 80+ (Tier 1 Certified)</option>
        <option value="60">Score 60+ (Active)</option>
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold ml-1"
        >
          <X className="w-3.5 h-3.5" /> Reset
        </button>
      )}
    </>
  );
}
