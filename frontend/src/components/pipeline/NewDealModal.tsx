'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Stage, NewDealFormData } from './pipelineTypes';

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewDealFormData) => Promise<void>;
  stages: Stage[];
  isLight: boolean;
  accentClasses: { bg: string; bgHover: string };
}

export default function NewDealModal({
  isOpen,
  onClose,
  onSubmit,
  stages,
  isLight,
  accentClasses,
}: NewDealModalProps) {
  const initialForm: NewDealFormData = {
    title: '',
    company_name: '',
    country: 'United Arab Emirates',
    commodity: 'IR-64 Parboiled Rice 5% Broken',
    quantity_mt: 250,
    value_usd: 117500,
    incoterm: 'CIF Jebel Ali Port',
    payment_terms: '100% Irrevocable L/C at Sight',
    stage_id: 'inquiry',
    expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    note: 'Initial inquiry received via international trade buyer network',
  };

  const [formData, setFormData] = useState<NewDealFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialForm);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Plus className="w-5 h-5 text-emerald-500" />
            Add Customer to Funnel
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-300">Deal Title / Opportunity *</label>
            <input
              type="text"
              required
              placeholder="e.g. 500 MT Parboiled IR-64 to Dubai"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Company / Buyer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Dhiyafa Foodstuff LLC"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Country *</label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Commodity Variety *</label>
              <input
                type="text"
                required
                value={formData.commodity}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Quantity (MT) *</label>
              <input
                type="number"
                required
                value={formData.quantity_mt}
                onChange={(e) => {
                  const q = Number(e.target.value);
                  setFormData({ ...formData, quantity_mt: q, value_usd: q * 470 });
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Contract Value (USD)</label>
              <input
                type="number"
                min={0}
                value={formData.value_usd}
                onChange={(e) => setFormData({ ...formData, value_usd: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Incoterms</label>
              <input
                type="text"
                value={formData.incoterm}
                onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Initial Funnel Stage</label>
              <select
                value={formData.stage_id}
                onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              >
                {stages.map((st) => (
                  <option key={st.stage_id} value={st.stage_id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-300">Initial Customer Note</label>
            <textarea
              rows={2}
              placeholder="Customer requirements, sample dates, packing details..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/50">
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
              className={`px-5 py-2 rounded-lg font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5`}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{submitting ? 'Creating...' : 'Add Customer Deal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
