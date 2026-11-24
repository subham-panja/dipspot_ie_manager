'use client';

import React from 'react';
import { Save } from 'lucide-react';
import { CompanyProfile } from './settingsTypes';

interface CompanyProfileTabProps {
  company: CompanyProfile;
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  onSave: () => Promise<void>;
  saving: boolean;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function CompanyProfileTab({
  company,
  setCompany,
  onSave,
  saving,
  isLight,
  accentClasses,
}: CompanyProfileTabProps) {
  return (
    <div
      className={`p-6 rounded-2xl border space-y-6 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div>
        <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Enterprise EXIM Organization Profile
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure your official trade credentials, DGFT Import Export Code (IEC), and default shipping parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Legal Company Name</label>
          <input
            type="text"
            value={company.company_name}
            onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">DGFT IEC Code (10 Digits)</label>
          <input
            type="text"
            value={company.iec_code}
            onChange={(e) => setCompany({ ...company, iec_code: e.target.value })}
            placeholder="e.g. 0519042918"
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">GSTIN / Tax ID</label>
          <input
            type="text"
            value={company.gstin}
            onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Primary Export Sea Port</label>
          <input
            type="text"
            value={company.primary_export_port}
            onChange={(e) => setCompany({ ...company, primary_export_port: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Default Export Currency</label>
          <select
            value={company.default_currency}
            onChange={(e) => setCompany({ ...company, default_currency: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-white'
            }`}
          >
            <option value="USD">USD - US Dollar ($)</option>
            <option value="EUR">EUR - Euro (€)</option>
            <option value="INR">INR - Indian Rupee (₹)</option>
            <option value="AED">AED - UAE Dirham (د.إ)</option>
            <option value="GBP">GBP - British Pound (£)</option>
            <option value="SGD">SGD - Singapore Dollar (S$)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Default Weight / Volume Unit</label>
          <select
            value={company.default_unit}
            onChange={(e) => setCompany({ ...company, default_unit: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-white'
            }`}
          >
            <option value="MT">Metric Tons (MT)</option>
            <option value="KG">Kilograms (KG)</option>
            <option value="TEU">Twenty-Foot Equivalent Unit (TEU Containers)</option>
            <option value="QUINTAL">Quintals (100 KG)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Support Email</label>
          <input
            type="email"
            value={company.support_email}
            onChange={(e) => setCompany({ ...company, support_email: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Direct Hotline</label>
          <input
            type="text"
            value={company.phone}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/40 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Company Profile'}
        </button>
      </div>
    </div>
  );
}
