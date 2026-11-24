'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Factory, Loader2 } from 'lucide-react';
import { LeadItem, DealFormData } from './leadTypes';

interface ConvertToDealModalProps {
  lead: LeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DealFormData) => Promise<void>;
  isLight: boolean;
  modalTitle?: string;
  submitButtonText?: string;
  accentClass?: string;
  iconType?: 'sparkles' | 'factory';
}

export default function ConvertToDealModal({
  lead,
  isOpen,
  onClose,
  onSubmit,
  isLight,
  modalTitle = 'Convert Importer to Pipeline Deal',
  submitButtonText = 'Add to Funnel',
  accentClass = 'bg-blue-600 hover:bg-blue-500',
  iconType = 'sparkles',
}: ConvertToDealModalProps) {
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    commodity: 'IR-64 Parboiled Rice 5% Broken',
    quantity_mt: 250,
    incoterm: 'CIF Jebel Ali Port',
    payment_terms: '100% L/C at Sight',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      const isSupplier = lead.lead_type === 'wb_mill';
      setFormData({
        title: isSupplier
          ? `500 MT Supply Contract - ${lead.company_name}`
          : `500 MT Supply Contract - ${lead.company_name}`,
        commodity: lead.matched_varieties || 'General Commodity Grains',
        quantity_mt: isSupplier ? 500 : 250,
        incoterm: isSupplier ? 'FOB Kolkata / Haldia Port' : 'CIF Jebel Ali Port',
        payment_terms: isSupplier ? 'Irrevocable LC / CAD' : '100% L/C at Sight',
      });
    }
  }, [lead]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {iconType === 'factory' ? (
              <Factory className="w-5 h-5 text-emerald-400" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-400" />
            )}
            {modalTitle}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Company / Entity</label>
            <input
              type="text"
              disabled
              value={lead.company_name}
              className="w-full bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contract / Opportunity Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Commodity Spec</label>
              <input
                type="text"
                required
                value={formData.commodity}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Quantity (MT)</label>
              <input
                type="number"
                required
                value={formData.quantity_mt}
                onChange={(e) => setFormData({ ...formData, quantity_mt: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Incoterms</label>
              <input
                type="text"
                value={formData.incoterm}
                onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Terms</label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/40">
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
              className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClass} shadow-md transition flex items-center gap-1.5`}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{submitting ? 'Converting...' : submitButtonText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
