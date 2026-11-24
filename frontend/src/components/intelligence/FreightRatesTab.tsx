'use client';

import React from 'react';
import { Plus, Anchor } from 'lucide-react';
import { FreightRoute } from './intelligenceTypes';

interface FreightRatesTabProps {
  freight: FreightRoute[];
  isLight: boolean;
  onAddRoute: () => void;
}

export default function FreightRatesTab({
  freight,
  isLight,
  onAddRoute,
}: FreightRatesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">
          Live container benchmark rates for 20ft &amp; 40ft TEUs from Indian East Coast ports to destination gateways.
        </p>
        <button
          onClick={onAddRoute}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Freight Route
        </button>
      </div>

      <div className={`border rounded-xl overflow-hidden shadow-sm ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <table className="w-full text-left text-xs text-slate-300">
          <thead className={`uppercase text-[10px] font-semibold border-b ${
            isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            <tr>
              <th className="p-3.5">Origin Port</th>
              <th className="p-3.5">Destination Gateway</th>
              <th className="p-3.5">20ft FCL ($)</th>
              <th className="p-3.5">40ft FCL ($)</th>
              <th className="p-3.5">Transit Days</th>
              <th className="p-3.5">Major Carrier</th>
              <th className="p-3.5">Rate Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {freight.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="p-3.5 font-medium text-white flex items-center gap-2">
                  <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                  {r.origin_port}
                </td>
                <td className="p-3.5 font-semibold text-slate-200">{r.destination_port}</td>
                <td className="p-3.5 font-mono font-bold text-emerald-400">${r.rate_20ft_usd}</td>
                <td className="p-3.5 font-mono text-slate-300">${r.rate_40ft_usd}</td>
                <td className="p-3.5 font-mono">{r.transit_days} days</td>
                <td className="p-3.5">{r.carrier}</td>
                <td className="p-3.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      r.trend === 'Falling'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : r.trend === 'Rising'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {r.trend}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
