'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CompetitorQuote } from './globalSettingsTypes';
import AddQuoteModal from './AddQuoteModal';

interface ModalPricingTabProps {
  quotes: CompetitorQuote[];
  onDeleteQuote: (quoteId: string) => Promise<void>;
  onAddQuote: (newQuote: any) => Promise<void>;
  isLight: boolean;
}

export default function ModalPricingTab({
  quotes,
  onDeleteQuote,
  onAddQuote,
  isLight,
}: ModalPricingTabProps) {
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Competitor Pricing Matrix & Benchmark Radar
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configured-based pricing intelligence comparing competitor FOB & CIF spot offers against TradePulse quotes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddQuoteModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Competitor Quote</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead
            className={`text-[10px] uppercase font-semibold border-b ${
              isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            <tr>
              <th className="py-2.5 px-3">Competitor</th>
              <th className="py-2.5 px-3">Commodity & Origin</th>
              <th className="py-2.5 px-3">Competitor Price ($/MT)</th>
              <th className="py-2.5 px-3">Our Price ($/MT)</th>
              <th className="py-2.5 px-3">Spread & Advantage</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {quotes.map((q) => (
              <tr key={q.quote_id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}>
                <td className="py-2.5 px-3 font-semibold text-slate-200">
                  <div>{q.competitor_name}</div>
                  <div className="text-[10px] text-slate-400">{q.destination_port}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-slate-300 font-medium">{q.commodity}</div>
                  <div className="text-[10px] text-slate-400">
                    {q.origin_country} &bull; {q.payment_terms}
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                  <div>FOB: ${q.fob_price_usd_mt}</div>
                  <div className="text-[10px] text-slate-400">CIF: ${q.cif_price_usd_mt}</div>
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                  ${q.our_price_usd_mt}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      q.spread_usd <= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {q.spread_usd <= 0 ? `-$${Math.abs(q.spread_usd)} / MT` : `+$${q.spread_usd} / MT`}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDeleteQuote(q.quote_id)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                    title="Delete Quote"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddQuoteModal
        isOpen={showAddQuoteModal}
        onClose={() => setShowAddQuoteModal(false)}
        onSave={onAddQuote}
        isLight={isLight}
      />
    </div>
  );
}
