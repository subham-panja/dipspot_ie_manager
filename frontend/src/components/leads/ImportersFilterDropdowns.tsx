'use client';

import React from 'react';

interface ImportersFilterDropdownsProps {
  country: string;
  onCountryChange: (val: string) => void;
  minScore: number | '';
  onMinScoreChange: (val: number | '') => void;
  port: string;
  onPortChange: (val: string) => void;
  tier: string;
  onTierChange: (val: string) => void;
  isLight: boolean;
}

export default function ImportersFilterDropdowns({
  country,
  onCountryChange,
  minScore,
  onMinScoreChange,
  port,
  onPortChange,
  tier,
  onTierChange,
  isLight,
}: ImportersFilterDropdownsProps) {
  const selectBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-800'
    : 'bg-slate-950 border-slate-800 text-slate-200';

  return (
    <>
      <select
        value={country}
        onChange={(e) => onCountryChange(e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${selectBg}`}
      >
        <option value="">All Geographies</option>
        <option value="Togo">🇹🇬 Togo (Lomé Port Hub)</option>
        <option value="United Arab Emirates">🇦🇪 United Arab Emirates (Dubai)</option>
        <option value="Saudi Arabia">🇸🇦 Saudi Arabia (Riyadh, Dammam)</option>
        <option value="Qatar">🇶🇦 Qatar (Doha)</option>
        <option value="Oman">🇴🇲 Oman (Muscat)</option>
        <option value="Kuwait">🇰🇼 Kuwait</option>
        <option value="Bahrain">🇧🇭 Bahrain</option>
        <option value="Benin">🇧🇯 Benin (Cotonou)</option>
        <option value="Kenya">🇰🇪 Kenya (Mombasa)</option>
      </select>

      <select
        value={minScore}
        onChange={(e) => onMinScoreChange(e.target.value ? Number(e.target.value) : '')}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${selectBg}`}
      >
        <option value="">All Score Tiers</option>
        <option value="80">Score 80+ (Tier 1)</option>
        <option value="60">Score 60+ (Active)</option>
      </select>

      <select
        value={port}
        onChange={(e) => onPortChange(e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${selectBg}`}
      >
        <option value="">All Discharge Ports</option>
        <option value="Jebel Ali">🇦🇪 Jebel Ali Port (UAE)</option>
        <option value="Khalifa Bin Salman">🇧🇭 Khalifa Bin Salman (Bahrain)</option>
        <option value="Dammam">🇸🇦 King Abdulaziz Port / Dammam</option>
        <option value="Mombasa">🇰🇪 Port of Mombasa (Kenya)</option>
        <option value="Lome">🇹🇬 Autonomous Port of Lomé (Togo)</option>
      </select>

      <select
        value={tier}
        onChange={(e) => onTierChange(e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-lg border outline-none font-semibold ${
          tier === 'sme' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : selectBg
        }`}
      >
        <option value="">All Consignment Sizes</option>
        <option value="sme">🎯 SME Importers (1-3 Containers / mo)</option>
      </select>
    </>
  );
}
