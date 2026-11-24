'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { QuoteFormData } from './intelligenceTypes';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: QuoteFormData) => Promise<void>;
  isLight: boolean;
  accentClasses: { bg: string; [key: string]: any };
}

const INITIAL_FORM: QuoteFormData = {
  competitor_name: '',
  commodity: 'IR-64 Parboiled Rice 5% Broken',
  origin_port: 'Kolkata Port (INCCU)',
  fob_price_usd_mt: 420,
  cif_price_usd_mt: 455,
  payment_terms: '100% L/C at Sight',
  spread_vs_tradepulse: -10,
  notes: 'Offered for 10x20ft FCL prompt shipment',
};

export default function AddQuoteModal({
  isOpen,
  onClose,
  onSubmit,
  isLight,
  accentClasses,
}: AddQuoteModalProps) {
  const [form, setForm] = useState<QuoteFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSubmit(form);
      setForm(INITIAL_FORM);
      onClose();
    } catch (err: any) {
      alert('Failed to add quote: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`border rounded-2xl w-full max-w-lg p-6 shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Plus className="w-5 h-5 text-emerald-400" />
            Add Competitor Spot Offer
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Competitor / Exporter Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Pattabhi Agro Foods Pvt Ltd"
              value={form.competitor_name}
              onChange={(e) => setForm({ ...form, competitor_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Commodity Spec</label>
              <input
                type="text"
                required
                value={form.commodity}
                onChange={(e) => setForm({ ...form, commodity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Origin Port</label>
              <input
                type="text"
                value={form.origin_port}
                onChange={(e) => setForm({ ...form, origin_port: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">FOB ($/MT)</label>
              <input
                type="number"
                value={form.fob_price_usd_mt}
                onChange={(e) => setForm({ ...form, fob_price_usd_mt: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">CIF ($/MT)</label>
              <input
                type="number"
                value={form.cif_price_usd_mt}
                onChange={(e) => setForm({ ...form, cif_price_usd_mt: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Spread ($/MT)</label>
              <input
                type="number"
                value={form.spread_vs_tradepulse}
                onChange={(e) => setForm({ ...form, spread_vs_tradepulse: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Terms</label>
            <input
              type="text"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Surveillance Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`font-semibold px-5 py-2 rounded-xl text-white ${accentClasses.bg} disabled:opacity-50`}
            >
              {submitting ? 'Saving...' : 'Save Spot Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
