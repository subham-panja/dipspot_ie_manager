'use client';

import React from 'react';
import { Users, X } from 'lucide-react';

interface NewSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSegmentForm: {
    name: string;
    description: string;
    lead_type: string;
    countries: string;
    min_score: number;
    tags: string;
  };
  setNewSegmentForm: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    lead_type: string;
    countries: string;
    min_score: number;
    tags: string;
  }>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLight: boolean;
  accentClasses: any;
}

export default function NewSegmentModal({
  isOpen,
  onClose,
  newSegmentForm,
  setNewSegmentForm,
  onSubmit,
  isLight,
  accentClasses,
}: NewSegmentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Users className="w-5 h-5 text-purple-400" />
            Create Targeted Audience Segment
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Segment Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. GCC Top Tier Basmati Buyers"
              value={newSegmentForm.name}
              onChange={(e) => setNewSegmentForm({ ...newSegmentForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description / Audience Thesis</label>
            <input
              type="text"
              placeholder="e.g. Importers with verified bank credit in Dubai, Riyadh, and Doha"
              value={newSegmentForm.description}
              onChange={(e) => setNewSegmentForm({ ...newSegmentForm, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Directory Scope</label>
              <select
                value={newSegmentForm.lead_type}
                onChange={(e) => setNewSegmentForm({ ...newSegmentForm, lead_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
              >
                <option value="importer">Global Importers & Buyers</option>
                <option value="wb_mill">Verified Suppliers</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Min Priority Score (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newSegmentForm.min_score}
                onChange={(e) => setNewSegmentForm({ ...newSegmentForm, min_score: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Geographies (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. United Arab Emirates, Saudi Arabia, Qatar"
              value={newSegmentForm.countries}
              onChange={(e) => setNewSegmentForm({ ...newSegmentForm, countries: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Audience Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. High Volume, Wholesale, Direct Supplier"
              value={newSegmentForm.tags}
              onChange={(e) => setNewSegmentForm({ ...newSegmentForm, tags: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
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
              className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClasses.bg} shadow-md transition`}
            >
              Save Segment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
