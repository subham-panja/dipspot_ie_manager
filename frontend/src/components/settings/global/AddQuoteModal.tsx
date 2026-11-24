'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: any) => Promise<void>;
  isLight: boolean;
}

export default function AddQuoteModal({
  isOpen,
  onClose,
  onSave,
  isLight,
}: AddQuoteModalProps) {
  const [newQuote, setNewQuote] = useState({
    competitor_name: '',
    commodity: 'Non-Basmati Parboiled Grain',
    category: 'Agricultural Grains',
    origin_country: 'India',
    fob_price_usd_mt: 445,
    cif_price_usd_mt: 490,
    our_price_usd_mt: 438,
    destination_port: 'Jebel Ali Port (AEJEA)',
    payment_terms: '100% LC at Sight',
    notes: 'Direct commercial quote',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(newQuote);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
          <h4 className="text-sm font-bold text-slate-200">Record Competitor Spot Offer</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Competitor Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Olam International / KRBL"
              value={newQuote.competitor_name}
              onChange={(e) => setNewQuote({ ...newQuote, competitor_name: e.target.value })}
              className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Commodity</label>
              <input
                type="text"
                value={newQuote.commodity}
                onChange={(e) => setNewQuote({ ...newQuote, commodity: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Origin Country</label>
              <input
                type="text"
                value={newQuote.origin_country}
                onChange={(e) => setNewQuote({ ...newQuote, origin_country: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Competitor FOB Price ($/MT)</label>
              <input
                type="number"
                value={newQuote.fob_price_usd_mt}
                onChange={(e) => setNewQuote({ ...newQuote, fob_price_usd_mt: Number(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Our Counter Price ($/MT)</label>
              <input
                type="number"
                value={newQuote.our_price_usd_mt}
                onChange={(e) => setNewQuote({ ...newQuote, our_price_usd_mt: Number(e.target.value) })}
                className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              Save Quote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
