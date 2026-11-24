'use client';

import React, { useState } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { PriceFormData } from './intelligenceTypes';

interface AddPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: PriceFormData) => Promise<void>;
  isLight: boolean;
  accentClasses: { bg: string; [key: string]: any };
}

const INITIAL_FORM: PriceFormData = {
  commodity: 'IR-64 Parboiled 5% Broken',
  grade: 'Sortex 100% Clean',
  fob_price_usd_mt: 440,
  cif_jebel_ali_usd_mt: 470,
  change_wow_usd: '-5.00',
  trend: 'Bearish',
};

export default function AddPriceModal({
  isOpen,
  onClose,
  onSubmit,
  isLight,
  accentClasses,
}: AddPriceModalProps) {
  const [form, setForm] = useState<PriceFormData>(INITIAL_FORM);
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
      alert('Failed to add price benchmark: ' + err.message);
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
        className={`border rounded-2xl w-full max-w-md p-6 shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Add Commodity Price Benchmark
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Commodity *</label>
            <input
              type="text"
              required
              value={form.commodity}
              onChange={(e) => setForm({ ...form, commodity: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Grade Specification</label>
            <input
              type="text"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">FOB Price ($/MT)</label>
              <input
                type="number"
                value={form.fob_price_usd_mt}
                onChange={(e) => setForm({ ...form, fob_price_usd_mt: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CIF Jebel Ali ($/MT)</label>
              <input
                type="number"
                value={form.cif_jebel_ali_usd_mt}
                onChange={(e) => setForm({ ...form, cif_jebel_ali_usd_mt: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`font-medium text-sm px-5 py-2 rounded-lg shadow-md transition text-white ${accentClasses.bg} disabled:opacity-50`}
            >
              {submitting ? 'Saving...' : 'Save Benchmark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
