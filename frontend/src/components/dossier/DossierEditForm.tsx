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
}

export default function DossierEditForm({
  editForm,
  setEditForm,
  onSave,
  onCancel,
  saving,
  accentBtnClass,
}: DossierEditFormProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-purple-400" />
          <span>Edit Lead Specifications &amp; Metadata</span>
        </h3>
        <span className="text-xs text-slate-400">All fields update in real-time</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Company Legal Name</label>
          <input
            type="text"
            value={editForm.company_name || ''}
            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Country / Territory</label>
          <input
            type="text"
            value={editForm.country || ''}
            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">City or Commercial Hub</label>
          <input
            type="text"
            value={editForm.city_or_hub || ''}
            onChange={(e) => setEditForm({ ...editForm, city_or_hub: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Contact Executive</label>
          <input
            type="text"
            value={editForm.contact_person || ''}
            onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Telephone Numbers (Semi-colon separated)</label>
          <input
            type="text"
            value={editForm.phones || ''}
            onChange={(e) => setEditForm({ ...editForm, phones: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Email Addresses (Semi-colon separated)</label>
          <input
            type="text"
            value={editForm.emails || ''}
            onChange={(e) => setEditForm({ ...editForm, emails: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Corporate Website</label>
          <input
            type="text"
            value={editForm.website || ''}
            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Direct Telephone</label>
          <input
            type="text"
            value={editForm.direct_phone || ''}
            onChange={(e) => setEditForm({ ...editForm, direct_phone: e.target.value })}
            placeholder="+971 4 123 4567"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Primary Email</label>
          <input
            type="text"
            value={editForm.primary_email || ''}
            onChange={(e) => setEditForm({ ...editForm, primary_email: e.target.value })}
            placeholder="purchase@company.com"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-blue-400 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Secondary / Inbox Email</label>
          <input
            type="text"
            value={editForm.secondary_email || ''}
            onChange={(e) => setEditForm({ ...editForm, secondary_email: e.target.value })}
            placeholder="desk@company.com"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-purple-300 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">WhatsApp Outreach URL</label>
          <input
            type="text"
            value={editForm.whatsapp_url || editForm.whatsapp_outreach_url || ''}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                whatsapp_url: e.target.value,
                whatsapp_outreach_url: e.target.value,
              })
            }
            placeholder="https://wa.me/971501234567"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">LinkedIn Persona Profile URL</label>
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
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-blue-400 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Corporate Contact Desk Page URL</label>
          <input
            type="text"
            value={editForm.contact_page_url || editForm.corporate_contact_page_url || ''}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                contact_page_url: e.target.value,
                corporate_contact_page_url: e.target.value,
              })
            }
            placeholder="https://company.com/contact-us"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-purple-400 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">GitHub Profile URL</label>
          <input
            type="text"
            value={editForm.github_url || ''}
            onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
            placeholder="https://github.com/company"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-300 outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Entity Role</label>
          <select
            value={editForm.lead_type || 'importer'}
            onChange={(e) => setEditForm({ ...editForm, lead_type: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
          >
            <option value="importer">Global Importer / Buyer</option>
            <option value="wb_mill">Commercial Supplier / Mill</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Commodity Lines</label>
          <input
            type="text"
            value={editForm.matched_varieties || ''}
            onChange={(e) => setEditForm({ ...editForm, matched_varieties: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Applicable HS Codes</label>
          <input
            type="text"
            value={editForm.hs_codes_applicable || ''}
            onChange={(e) => setEditForm({ ...editForm, hs_codes_applicable: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Custom Campaign Label</label>
          <input
            type="text"
            value={editForm.custom_label || ''}
            onChange={(e) => setEditForm({ ...editForm, custom_label: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-purple-300 outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Tax ID / GSTIN / IEC</label>
          <input
            type="text"
            value={editForm.gstin || ''}
            onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400 outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-slate-400 font-semibold mb-1">Physical Facility / Port Address</label>
          <input
            type="text"
            value={editForm.address || ''}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
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
