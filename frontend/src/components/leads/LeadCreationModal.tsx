'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Save } from 'lucide-react';
import { NewLeadFormData } from './leadTypes';

interface LeadCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewLeadFormData) => Promise<void>;
  leadType: 'importer' | 'wb_mill';
  isLight: boolean;
}

export default function LeadCreationModal({
  isOpen,
  onClose,
  onSubmit,
  leadType,
  isLight,
}: LeadCreationModalProps) {
  const isImporter = leadType === 'importer';

  const initialForm: NewLeadFormData = isImporter
    ? {
        company_name: '',
        country: 'United Arab Emirates',
        city_or_hub: 'Dubai',
        nearest_port: 'Jebel Ali Port (AEJEA)',
        shipment_volume: '1-3 Containers / mo (25-75 MT)',
        contact_person: '',
        phones: '',
        emails: '',
        website: '',
        matched_varieties: 'IR-64 Parboiled Rice; 1121 Basmati Rice',
        address: '',
        deal_status: 'unassigned',
      }
    : {
        company_name: '',
        country: 'India',
        state: 'West Bengal',
        district: 'Burdwan',
        city_or_hub: 'Burdwan Agro Cluster',
        contact_person: '',
        phones: '',
        emails: '',
        website: '',
        gstin: '',
        matched_varieties: 'Sortex IR-64 Parboiled Rice; Swarna Raw Rice',
        address: '',
        deal_status: 'unassigned',
      };

  const [formData, setFormData] = useState<NewLeadFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialForm);
    }
  }, [isOpen, leadType]);

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
    if (!formData.company_name.trim()) {
      alert(isImporter ? 'Company legal name is required' : 'Supplier facility name is required');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const accentColor = isImporter ? 'text-blue-400' : 'text-emerald-400';
  const buttonBg = isImporter ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Plus className={`w-5 h-5 ${accentColor}`} />
            {isImporter ? 'Add Verified International Importer' : 'Register Verified Processing Mill / Supplier'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isImporter ? 'Company Legal Name *' : 'Facility Legal Name *'}
            </label>
            <input
              type="text"
              required
              placeholder={isImporter ? 'e.g. Al-Futtaim Trading LLC' : 'e.g. Burdwan Agro Processing Mills Pvt Ltd'}
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isImporter ? 'Country' : 'State / Province'}
              </label>
              <input
                type="text"
                value={isImporter ? formData.country : formData.state || ''}
                onChange={(e) =>
                  isImporter
                    ? setFormData({ ...formData, country: e.target.value })
                    : setFormData({ ...formData, state: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isImporter ? 'City / Commercial Hub' : 'District / Hub'}
              </label>
              <input
                type="text"
                value={isImporter ? formData.city_or_hub : formData.district || ''}
                onChange={(e) =>
                  isImporter
                    ? setFormData({ ...formData, city_or_hub: e.target.value })
                    : setFormData({ ...formData, district: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {isImporter ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nearest Discharge Port</label>
                <input
                  type="text"
                  value={formData.nearest_port || ''}
                  onChange={(e) => setFormData({ ...formData, nearest_port: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Monthly Inbound Volume</label>
                <input
                  type="text"
                  value={formData.shipment_volume || ''}
                  onChange={(e) => setFormData({ ...formData, shipment_volume: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isImporter ? 'Key Contact Person' : 'Key Commercial Contact'}
              </label>
              <input
                type="text"
                placeholder={isImporter ? 'e.g. Tariq Mansoor (Purchase Manager)' : 'e.g. Joydeep Ghosh (Director)'}
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isImporter ? 'Phone Number' : 'Facility Phone'}
              </label>
              <input
                type="text"
                placeholder={isImporter ? 'e.g. +971 4 295 1111' : 'e.g. +91 9434123456'}
                value={formData.phones}
                onChange={(e) => setFormData({ ...formData, phones: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isImporter ? 'Verified Email' : 'Official Email'}
              </label>
              <input
                type="email"
                placeholder={isImporter ? 'e.g. trade@alfuttaim.ae' : 'e.g. mills@burdwanagro.com'}
                value={formData.emails}
                onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isImporter ? 'Corporate Website' : 'GSTIN Number'}
              </label>
              <input
                type="text"
                placeholder={isImporter ? 'e.g. www.alfuttaim.com' : 'e.g. 19AAACB1234F1Z5'}
                value={isImporter ? formData.website || '' : formData.gstin || ''}
                onChange={(e) =>
                  isImporter
                    ? setFormData({ ...formData, website: e.target.value })
                    : setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                }
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isImporter ? 'Commodity / Target Varieties' : 'Processing Specialties / Varieties'}
            </label>
            <input
              type="text"
              value={formData.matched_varieties}
              onChange={(e) => setFormData({ ...formData, matched_varieties: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
            />
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
              className={`px-5 py-2 rounded-xl font-semibold text-white ${buttonBg} shadow-md transition flex items-center gap-1.5`}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Saving...' : isImporter ? 'Save Lead' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
