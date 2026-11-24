'use client';

import React from 'react';
import { Plus, Building, Trash2 } from 'lucide-react';
import { CompetitorQuote } from './intelligenceTypes';

interface QuotesTabProps {
  quotes: CompetitorQuote[];
  isLight: boolean;
  onAddQuote: () => void;
  onDeleteQuote: (quoteId: string) => void;
}

export default function QuotesTab({
  quotes,
  isLight,
  onAddQuote,
  onDeleteQuote,
}: QuotesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">
          Configured competitor spot offers, FOB/CIF differentials, and pricing spread relative to TradePulse benchmark quotes.
        </p>
        <button
          onClick={onAddQuote}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Spot Offer
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
              <th className="p-3.5">Competitor</th>
              <th className="p-3.5">Commodity Spec</th>
              <th className="p-3.5">Origin Port</th>
              <th className="p-3.5">FOB ($/MT)</th>
              <th className="p-3.5">CIF ($/MT)</th>
              <th className="p-3.5">Payment Terms</th>
              <th className="p-3.5">Spread vs TradePulse</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {quotes.map((q) => {
              const isUnder = q.spread_vs_tradepulse < 0;
              return (
                <tr key={q.quote_id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div>
                      <div>{q.competitor_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{q.quote_id}</div>
                    </div>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-200">{q.commodity}</td>
                  <td className="p-3.5 text-slate-300">{q.origin_port}</td>
                  <td className="p-3.5 font-mono font-bold text-emerald-400">${q.fob_price_usd_mt}</td>
                  <td className="p-3.5 font-mono font-bold text-blue-400">${q.cif_price_usd_mt}</td>
                  <td className="p-3.5 text-slate-300">{q.payment_terms}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isUnder
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {q.spread_vs_tradepulse > 0 ? `+${q.spread_vs_tradepulse}` : q.spread_vs_tradepulse} $/MT
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => onDeleteQuote(q.quote_id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
