'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Campaign } from './CampaignTypes';

interface EnrollCampaignModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  enrollForm: {
    country: string;
    lead_type: string;
    segment_id: string;
  };
  setEnrollForm: React.Dispatch<React.SetStateAction<{
    country: string;
    lead_type: string;
    segment_id: string;
  }>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  enrolling: boolean;
  isLight: boolean;
  accentClasses: any;
}

export default function EnrollCampaignModal({
  campaign,
  isOpen,
  onClose,
  enrollForm,
  setEnrollForm,
  onSubmit,
  enrolling,
  isLight,
  accentClasses,
}: EnrollCampaignModalProps) {
  if (!isOpen || !campaign) return null;

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
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Enroll Leads into {campaign.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Country Filter</label>
            <input
              type="text"
              placeholder="e.g. United Arab Emirates (leave blank for all)"
              value={enrollForm.country}
              onChange={(e) => setEnrollForm({ ...enrollForm, country: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Directory Scope</label>
            <select
              value={enrollForm.lead_type}
              onChange={(e) => setEnrollForm({ ...enrollForm, lead_type: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
            >
              <option value="importer">Global Importers & Buyers</option>
              <option value="wb_mill">Verified Domestic Suppliers</option>
            </select>
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
              disabled={enrolling}
              className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClasses.bg} shadow-md transition`}
            >
              {enrolling ? 'Enrolling...' : 'Enroll Leads'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
