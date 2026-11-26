'use client';

import React from 'react';
import { Edit2, Save, Loader2 } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierEditFormProps {
  editForm: Partial<CustomerLead>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<CustomerLead>>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  accentBtnClass: string;
  isLight?: boolean;
}

export default function DossierEditForm({
  editForm,
  setEditForm,
  onSave,
  onCancel,
  saving,
  accentBtnClass,
  isLight = false,
}: DossierEditFormProps) {
  const inputClass = isLight
    ? 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500'
    : 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500';
  const labelClass = `block font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div
        className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <Edit2 className="w-4 h-4 text-purple-400" />
          <span>Edit Lead Specifications &amp; Metadata</span>
        </h3>
        <span className="text-xs text-slate-400">All fields update in real-time</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className={labelClass}>Company Legal Name</label>
          <input
            type="text"
            value={editForm.company_name || ''}
            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Country / Territory</label>
          <input
            type="text"
            value={editForm.country || ''}
            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Origin State / Province</label>
          <input
            type="text"
            value={editForm.origin_state || editForm.state || ''}
            onChange={(e) => setEditForm({ ...editForm, origin_state: e.target.value, state: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>City or Commercial Hub</label>
          <input
            type="text"
            value={editForm.city_or_hub || ''}
            onChange={(e) => setEditForm({ ...editForm, city_or_hub: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Port Hub (Nearest Sea Port)</label>
          <input
            type="text"
            value={editForm.nearest_port || ''}
            onChange={(e) => setEditForm({ ...editForm, nearest_port: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>B2B Directory / Source</label>
          <input
            type="text"
            value={editForm.b2b_directory || ''}
            onChange={(e) => setEditForm({ ...editForm, b2b_directory: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Shipment Volume</label>
          <input
            type="text"
            value={editForm.shipment_volume || ''}
            onChange={(e) => setEditForm({ ...editForm, shipment_volume: e.target.value })}
            placeholder="e.g. 5-10 Containers / mo"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Annual Volume Estimate</label>
          <input
            type="text"
            value={editForm.annual_volume_est || ''}
            onChange={(e) => setEditForm({ ...editForm, annual_volume_est: e.target.value })}
            placeholder="e.g. 2,400 MT / yr"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Contact Executive</label>
          <input
            type="text"
            value={editForm.contact_person || ''}
            onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Corporate Website</label>
          <input
            type="text"
            value={editForm.website || ''}
            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Direct Telephone</label>
          <input
            type="text"
            value={editForm.direct_phone || ''}
            onChange={(e) => setEditForm({ ...editForm, direct_phone: e.target.value })}
            placeholder="+971 4 123 4567"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Primary Email</label>
          <input
            type="text"
            value={editForm.primary_email || ''}
            onChange={(e) => setEditForm({ ...editForm, primary_email: e.target.value })}
            placeholder="purchase@company.com"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Telephone Numbers (Semi-colon separated)</label>
          <input
            type="text"
            value={editForm.phones || ''}
            onChange={(e) => setEditForm({ ...editForm, phones: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Email Addresses (Semi-colon separated)</label>
          <input
            type="text"
            value={editForm.emails || ''}
            onChange={(e) => setEditForm({ ...editForm, emails: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>LinkedIn Persona Profile URL</label>
          <input
            type="text"
            value={editForm.linkedin_profile_url || editForm.linkedin_persona_url || ''}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                linkedin_profile_url: e.target.value,
                linkedin_persona_url: e.target.value,
              })
            }
            placeholder="https://www.linkedin.com/in/director-profile"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Entity Role</label>
          <select
            value={editForm.lead_type || 'importer'}
            onChange={(e) => setEditForm({ ...editForm, lead_type: e.target.value })}
            className={inputClass}
          >
            <option value="importer">Global Importer / Buyer</option>
            <option value="wb_mill">Commercial Supplier / Mill</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Commodity Lines</label>
          <input
            type="text"
            value={editForm.matched_varieties || ''}
            onChange={(e) => setEditForm({ ...editForm, matched_varieties: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Applicable HS Codes</label>
          <input
            type="text"
            value={editForm.hs_codes_applicable || ''}
            onChange={(e) => setEditForm({ ...editForm, hs_codes_applicable: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Custom Campaign Label</label>
          <input
            type="text"
            value={editForm.custom_label || ''}
            onChange={(e) => setEditForm({ ...editForm, custom_label: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>Tax ID / GSTIN / IEC</label>
          <input
            type="text"
            value={editForm.gstin || ''}
            onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Physical Facility / Port Address</label>
          <input
            type="text"
            value={editForm.address || ''}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Extraction / Trade Notes</label>
          <textarea
            rows={2}
            value={editForm.extraction_notes || ''}
            onChange={(e) => setEditForm({ ...editForm, extraction_notes: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div
        className={`pt-4 border-t flex justify-end gap-3 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 rounded-xl text-xs font-semibold ${
            isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 ${accentBtnClass}`}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}
