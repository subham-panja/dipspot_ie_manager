'use client';

import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { CustomerSegment, TOKEN_SUGGESTIONS } from './CampaignTypes';

interface CampaignWizardTabProps {
  wizardData: {
    name: string;
    channel: string;
    segment_id: string;
    target_commodity: string;
    target_countries: string;
    template_subject: string;
    template_body: string;
  };
  setWizardData: React.Dispatch<React.SetStateAction<{
    name: string;
    channel: string;
    segment_id: string;
    target_commodity: string;
    target_countries: string;
    template_subject: string;
    template_body: string;
  }>>;
  segments: CustomerSegment[];
  isLight: boolean;
  accentClasses: any;
  onLaunch: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export default function CampaignWizardTab({
  wizardData,
  setWizardData,
  segments,
  isLight,
  accentClasses,
  onLaunch,
  onCancel,
}: CampaignWizardTabProps) {
  return (
    <div className={`p-6 rounded-2xl border max-w-4xl mx-auto ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
    }`}>
      <div className="pb-4 border-b border-slate-800/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Automated Pipeline Outreach
          </span>
          <h2 className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Create Enterprise Campaign
          </h2>
          <p className="text-xs text-slate-400">
            Draft commercial offers with dynamic tokens and dispatch to targeted customer segments.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Gmail SMTP Ready
          </span>
        </div>
      </div>

      <form onSubmit={onLaunch} className="space-y-4 mt-5 text-xs">
        <div className="space-y-3">
          <span className="text-xs font-bold block uppercase tracking-wider text-slate-400">
            1. Campaign Details & Audience Group
          </span>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Campaign Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Middle East Basmati & Non-Basmati Commercial Offer"
              value={wizardData.name}
              onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Select Audience Segment</label>
              <select
                value={wizardData.segment_id}
                onChange={(e) => setWizardData({ ...wizardData, segment_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              >
                <option value="">Custom Outreach (No Saved Segment)</option>
                {segments.map((s) => (
                  <option key={s.segment_id} value={s.segment_id}>
                    {s.name} ({s.member_count ?? 0} leads)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Outreach Channel</label>
              <select
                value={wizardData.channel}
                onChange={(e) => setWizardData({ ...wizardData, channel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              >
                <option value="Email">Email (via Gmail SMTP Gateway)</option>
                <option value="WhatsApp">WhatsApp (Official Meta Business API - Upcoming)</option>
                <option value="SMS">SMS Gateway (Twilio / Fast2SMS - Upcoming)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Commodity Spec</label>
              <input
                type="text"
                required
                value={wizardData.target_commodity}
                onChange={(e) => setWizardData({ ...wizardData, target_commodity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Countries (comma separated)</label>
              <input
                type="text"
                required
                value={wizardData.target_countries}
                onChange={(e) => setWizardData({ ...wizardData, target_countries: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-800/60">
          <span className="text-xs font-bold block uppercase tracking-wider text-slate-400">
            2. Commercial Offer Draft & Merge Variables
          </span>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Subject Line</label>
            <input
              type="text"
              value={wizardData.template_subject}
              onChange={(e) => setWizardData({ ...wizardData, template_subject: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">Message Body</label>
              <span className="text-[11px] text-slate-500">Insert dynamic variables:</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {TOKEN_SUGGESTIONS.map((tok) => (
                <button
                  key={tok.token}
                  type="button"
                  onClick={() =>
                    setWizardData((prev) => ({
                      ...prev,
                      template_body: prev.template_body + ' ' + tok.token,
                    }))
                  }
                  className="text-[11px] font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded cursor-pointer transition"
                  title={tok.desc}
                >
                  + {tok.token}
                </button>
              ))}
            </div>

            <textarea
              rows={8}
              value={wizardData.template_body}
              onChange={(e) => setWizardData({ ...wizardData, template_body: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-lg outline-none focus:border-emerald-500 font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white px-3 py-1.5"
          >
            Cancel
          </button>

          <button
            type="submit"
            className={`px-6 py-2.5 rounded-xl text-white font-semibold ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-2`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Campaign & Auto-Enroll Leads</span>
          </button>
        </div>
      </form>
    </div>
  );
}
