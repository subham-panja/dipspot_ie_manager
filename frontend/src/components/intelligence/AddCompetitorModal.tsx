'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CompetitorFormData } from './intelligenceTypes';

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CompetitorFormData) => Promise<void>;
  isLight: boolean;
  accentClasses: { bg: string; [key: string]: any };
}

const INITIAL_FORM: CompetitorFormData = {
  company_name: '',
  hq_country: 'India',
  estimated_volume_mt_month: 8000,
  core_varieties: 'IR-64 Parboiled Rice',
  primary_export_markets: 'UAE, Saudi Arabia, Benin',
  export_ports: 'Kolkata Port, Kakinada',
  pricing_strategy: 'Aggressive pricing, razor-thin margin',
  market_share_tier: 'Tier 1 Top Exporter',
  strengths: 'Massive supply capacity across regional hubs',
  vulnerabilities: 'High debt leverage, delayed BL releases',
};

export default function AddCompetitorModal({
  isOpen,
  onClose,
  onSubmit,
  isLight,
  accentClasses,
}: AddCompetitorModalProps) {
  const [form, setForm] = useState<CompetitorFormData>(INITIAL_FORM);
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
      alert('Failed to add competitor: ' + err.message);
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
            Add Competitor Intelligence Profile
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Est. Volume MT/Month</label>
              <input
                type="number"
                value={form.estimated_volume_mt_month}
                onChange={(e) => setForm({ ...form, estimated_volume_mt_month: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Market Share Tier</label>
              <select
                value={form.market_share_tier}
                onChange={(e) => setForm({ ...form, market_share_tier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="Tier 1 Conglomerate">Tier 1 Conglomerate</option>
                <option value="Mid-Tier Exporter">Mid-Tier Exporter</option>
                <option value="Regional Supplier">Regional Supplier</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Core Varieties</label>
            <input
              type="text"
              value={form.core_varieties}
              onChange={(e) => setForm({ ...form, core_varieties: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Key Strength</label>
            <input
              type="text"
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Vulnerability / Edge</label>
            <input
              type="text"
              value={form.vulnerabilities}
              onChange={(e) => setForm({ ...form, vulnerabilities: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
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
              {submitting ? 'Saving...' : 'Save Competitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
