'use client';

import React from 'react';
import { LeadsAggregations } from './leadTypes';

interface LeadsMetricsCardsProps {
  aggregations?: LeadsAggregations | null;
  isLight: boolean;
  type: 'importer' | 'supplier';
}

export default function LeadsMetricsCards({ aggregations, isLight, type }: LeadsMetricsCardsProps) {
  if (!aggregations) return null;

  if (type === 'importer') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-slate-400 text-xs">Total Importers</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{aggregations.total_importers}</div>
          <div className="text-[10px] text-slate-500">Verified buyers</div>
        </div>
        <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-slate-400 text-xs">Tier 1 Qualified</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{aggregations.high_priority_count}</div>
          <div className="text-[10px] text-slate-500">Score 80+</div>
        </div>
        <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-slate-400 text-xs">Destination Markets</div>
          <div className="text-xl font-bold text-white mt-1">{aggregations.countries_count} Countries</div>
          <div className="text-[10px] text-slate-500">GCC, SE Asia & Global</div>
        </div>
        <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-slate-400 text-xs">Primary Market</div>
          <div className="text-sm font-bold text-slate-200 mt-1.5 truncate">
            {aggregations.top_countries?.[0]?.country || 'United Arab Emirates'}
          </div>
          <div className="text-[10px] text-slate-500">{aggregations.top_countries?.[0]?.count || 0} buyers</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="text-slate-400 text-xs">Total Producers</div>
        <div className="text-xl font-bold text-emerald-400 mt-1">{aggregations.total_suppliers}</div>
        <div className="text-[10px] text-slate-500">Verified processing units</div>
      </div>
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="text-slate-400 text-xs">GSTIN Tax Compliant</div>
        <div className="text-xl font-bold text-blue-400 mt-1">{aggregations.verified_gst_count}</div>
        <div className="text-[10px] text-slate-500">Active GST verification</div>
      </div>
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="text-slate-400 text-xs">Production Hubs</div>
        <div className="text-xl font-bold text-white mt-1">{aggregations.top_districts?.length || 0} Districts</div>
        <div className="text-[10px] text-slate-500">Industrial agro zones</div>
      </div>
      <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="text-slate-400 text-xs">Top Production Cluster</div>
        <div className="text-sm font-bold text-slate-200 mt-1.5 truncate">
          {aggregations.top_districts?.[0]?.district || 'Burdwan'}
        </div>
        <div className="text-[10px] text-slate-500">
          {aggregations.top_districts?.[0]?.count || 0} registered facilities
        </div>
      </div>
    </div>
  );
}
