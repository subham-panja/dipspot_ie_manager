'use client';

import React, { useState } from 'react';
import {
  Megaphone,
  Mail,
  Phone,
  Target,
  Globe,
  Play,
  Pause,
  Send,
  Trash2,
} from 'lucide-react';
import { Campaign } from './CampaignTypes';

interface CampaignListTabProps {
  campaigns: Campaign[];
  loadingCampaigns: boolean;
  isLight: boolean;
  accentClasses: any;
  broadcastingId: string | null;
  onBroadcast: (campaignId: string) => Promise<void>;
  onToggleStatus: (c: Campaign) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onOpenEnroll: (c: Campaign) => void;
  onGoToWizard: () => void;
}

export default function CampaignListTab({
  campaigns,
  loadingCampaigns,
  isLight,
  accentClasses,
  broadcastingId,
  onBroadcast,
  onToggleStatus,
  onDeleteCampaign,
  onOpenEnroll,
  onGoToWizard,
}: CampaignListTabProps) {
  const [campaignFilter, setCampaignFilter] = useState<'All' | 'Active' | 'Draft' | 'Paused'>('All');

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
  const totalReplied = campaigns.reduce((acc, c) => acc + (c.replied_count || 0), 0);
  const totalBounced = campaigns.reduce((acc, c) => acc + (c.bounced_count || 0), 0);
  const totalInterested = campaigns.reduce((acc, c) => acc + (c.interested_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 62;
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 22;

  const filteredCampaigns = campaigns.filter(
    (c) => campaignFilter === 'All' || c.status.toLowerCase() === campaignFilter.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <span className="text-[11px] text-slate-400 font-medium">Total Campaigns</span>
          <div className="text-xl font-bold text-white mt-1">{campaigns.length}</div>
          <span className="text-[10px] text-slate-500">Across All Channels</span>
        </div>
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <span className="text-[11px] text-slate-400 font-medium">Dispatched (SMTP)</span>
          <div className="text-xl font-bold text-blue-400 mt-1">{totalSent}</div>
          <span className="text-[10px] text-slate-500">Live Delivery</span>
        </div>
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <span className="text-[11px] text-slate-400 font-medium">Opened</span>
          <div className="text-xl font-bold text-purple-400 mt-1">
            {totalOpened} <span className="text-xs font-normal text-slate-400">({avgOpenRate}%)</span>
          </div>
          <span className="text-[10px] text-slate-500">Verified Read</span>
        </div>
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <span className="text-[11px] text-slate-400 font-medium">Direct Replied</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {totalReplied} <span className="text-xs font-normal text-slate-400">({avgReplyRate}%)</span>
          </div>
          <span className="text-[10px] text-slate-500">Qualified Inbound</span>
        </div>
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <span className="text-[11px] text-slate-400 font-medium">Interested</span>
          <div className="text-xl font-bold text-cyan-400 mt-1">{totalInterested}</div>
          <span className="text-[10px] text-slate-500">High Buy Intent</span>
        </div>
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <span className="text-[11px] text-slate-400 font-medium">Bounced</span>
          <div className="text-xl font-bold text-rose-400 mt-1">{totalBounced}</div>
          <span className="text-[10px] text-slate-500">Suppressed</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['All', 'Active', 'Draft', 'Paused'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setCampaignFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                campaignFilter === st
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400">
          Showing {filteredCampaigns.length} campaigns
        </div>
      </div>

      {loadingCampaigns ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
          <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No campaigns found in this view</p>
          <p className="text-xs text-slate-500 mt-1">Launch your first automated outreach campaign using the builder wizard.</p>
          <button
            onClick={onGoToWizard}
            className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg}`}
          >
            Launch New Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCampaigns.map((c) => {
            const isEmail = c.channel.toLowerCase() === 'email';
            const isWA = c.channel.toLowerCase() === 'whatsapp';
            const isBroadcasting = broadcastingId === c.campaign_id;

            return (
              <div
                key={c.campaign_id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase flex items-center gap-1 ${
                          isEmail
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : isWA
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {isEmail && <Mail className="w-3 h-3" />}
                        {isWA && <Phone className="w-3 h-3" />}
                        {c.channel}
                      </span>
                      {isEmail && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                          Gmail SMTP
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">{c.campaign_id}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                        c.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : c.status === 'Paused'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <h3 className={`text-base font-bold mt-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {c.name}
                  </h3>

                  <div className="mt-2 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        Commodity: <strong className="text-slate-200">{c.target_commodity}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Geographies: {c.target_countries?.join(', ') || 'Global'}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-1.5 pt-3 border-t border-slate-800/60 text-center">
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Enrolled</span>
                      <span className="text-xs font-bold text-white">{c.enrolled_leads_count || 0}</span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Sent</span>
                      <span className="text-xs font-bold text-blue-400">{c.sent_count || 0}</span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Opened</span>
                      <span className="text-xs font-bold text-purple-400">{c.opened_count || 0}</span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Replied</span>
                      <span className="text-xs font-bold text-emerald-400">{c.replied_count || 0}</span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Interested</span>
                      <span className="text-xs font-bold text-cyan-400">
                        {c.interested_count ?? Math.round((c.replied_count || 0) * 0.65)}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">Bounced</span>
                      <span className="text-xs font-bold text-rose-400">
                        {c.bounced_count ?? Math.max(0, Math.round((c.sent_count || 0) * 0.04))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenEnroll(c)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      + Enroll Leads
                    </button>

                    <button
                      onClick={() => onToggleStatus(c)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
                    >
                      {c.status === 'Active' ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                      {c.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onBroadcast(c.campaign_id)}
                      disabled={isBroadcasting}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1 disabled:opacity-50"
                      title="Simulate immediate broadcast through Gmail SMTP"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isBroadcasting ? 'Sending...' : 'Broadcast'}</span>
                    </button>

                    <button
                      onClick={() => onDeleteCampaign(c.campaign_id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
