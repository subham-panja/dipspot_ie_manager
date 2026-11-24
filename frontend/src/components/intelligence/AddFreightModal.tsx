'use client';

import React, { useState } from 'react';
import { Ship, X } from 'lucide-react';
import { RouteFormData } from './intelligenceTypes';

interface AddFreightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: RouteFormData) => Promise<void>;
  isLight: boolean;
  accentClasses: { bg: string; [key: string]: any };
}

const INITIAL_FORM: RouteFormData = {
  origin_port: 'Kolkata Port (INCCU)',
  destination_port: 'Jebel Ali Port (AEDXB)',
  rate_20ft_usd: 620,
  rate_40ft_usd: 1050,
  transit_days: 14,
  carrier: 'Maersk / MSC',
  trend: 'Falling',
};

export default function AddFreightModal({
  isOpen,
  onClose,
  onSubmit,
  isLight,
  accentClasses,
}: AddFreightModalProps) {
  const [form, setForm] = useState<RouteFormData>(INITIAL_FORM);
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
      alert('Failed to add freight route: ' + err.message);
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
            <Ship className="w-5 h-5 text-emerald-400" />
            Add Ocean Freight Route
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Origin Port *</label>
            <input
              type="text"
              required
              value={form.origin_port}
              onChange={(e) => setForm({ ...form, origin_port: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Port *</label>
            <input
              type="text"
              required
              value={form.destination_port}
              onChange={(e) => setForm({ ...form, destination_port: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">20ft FCL ($)</label>
              <input
                type="number"
                value={form.rate_20ft_usd}
                onChange={(e) => setForm({ ...form, rate_20ft_usd: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">40ft FCL ($)</label>
              <input
                type="number"
                value={form.rate_40ft_usd}
                onChange={(e) => setForm({ ...form, rate_40ft_usd: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transit Days</label>
              <input
                type="number"
                value={form.transit_days}
                onChange={(e) => setForm({ ...form, transit_days: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Carrier</label>
              <input
                type="text"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
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
              {submitting ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
