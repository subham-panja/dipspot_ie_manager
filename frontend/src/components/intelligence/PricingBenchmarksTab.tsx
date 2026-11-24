'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { PriceBenchmark } from './intelligenceTypes';

interface PricingBenchmarksTabProps {
  pricing: PriceBenchmark[];
  isLight: boolean;
  onAddPrice: () => void;
}

export default function PricingBenchmarksTab({
  pricing,
  isLight,
  onAddPrice,
}: PricingBenchmarksTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">
          Spot pricing index for universal commodities with weekly price delta.
        </p>
        <button
          onClick={onAddPrice}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Price Benchmark
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
              <th className="p-3.5">Commodity Variety</th>
              <th className="p-3.5">Grade Specification</th>
              <th className="p-3.5">FOB Port ($/MT)</th>
              <th className="p-3.5">CIF Jebel Ali ($/MT)</th>
              <th className="p-3.5">WoW Change</th>
              <th className="p-3.5">Market Outlook</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pricing.map((p, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="p-3.5 font-bold text-white">{p.commodity}</td>
                <td className="p-3.5 text-slate-300">{p.grade}</td>
                <td className="p-3.5 font-mono font-bold text-emerald-400">${p.fob_price_usd_mt}</td>
                <td className="p-3.5 font-mono font-bold text-blue-400">${p.cif_jebel_ali_usd_mt}</td>
                <td className="p-3.5 font-mono">
                  <span
                    className={`font-semibold ${
                      p.change_wow_usd.startsWith('+')
                        ? 'text-red-400'
                        : p.change_wow_usd.startsWith('-')
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {p.change_wow_usd}
                  </span>
                </td>
                <td className="p-3.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      p.trend === 'Bullish'
                        ? 'bg-red-500/10 text-red-400'
                        : p.trend === 'Bearish'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {p.trend}
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
