'use client';

import React from 'react';
import {
  Search,
  Mail,
  Smartphone,
  RefreshCw,
  Pause,
} from 'lucide-react';
import { OmnichannelThread } from './inboxTypes';

interface InboxThreadListProps {
  threads: OmnichannelThread[];
  loadingThreads: boolean;
  selectedThread: OmnichannelThread | null;
  onSelectThread: (thread: OmnichannelThread) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterChannel: 'All' | 'Email' | 'WhatsApp';
  setFilterChannel: (ch: 'All' | 'Email' | 'WhatsApp') => void;
  filterIntent: 'All' | 'RFQ' | 'Negotiation' | 'Unsubscribe';
  setFilterIntent: (intent: 'All' | 'RFQ' | 'Negotiation' | 'Unsubscribe') => void;
  isLight: boolean;
}

export default function InboxThreadList({
  threads,
  loadingThreads,
  selectedThread,
  onSelectThread,
  searchQuery,
  setSearchQuery,
  filterChannel,
  setFilterChannel,
  filterIntent,
  setFilterIntent,
  isLight,
}: InboxThreadListProps) {
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.last_message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = filterChannel === 'All' || t.latest_channel === filterChannel;
    const matchesIntent =
      filterIntent === 'All' ||
      (filterIntent === 'RFQ' && t.latest_intent.includes('RFQ')) ||
      (filterIntent === 'Negotiation' && t.latest_intent.includes('Negotiation')) ||
      (filterIntent === 'Unsubscribe' && t.latest_intent.includes('Unsubscribe'));
    return matchesSearch && matchesChannel && matchesIntent;
  });

  return (
    <div
      className={`lg:col-span-5 rounded-2xl border flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div className="p-3.5 border-b border-slate-800/60 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, country, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none border transition ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setFilterChannel('All')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              filterChannel === 'All'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Channels
          </button>
          <button
            onClick={() => setFilterChannel('Email')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
              filterChannel === 'Email'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3 h-3 text-blue-400" />
            <span>Gmail</span>
          </button>
          <button
            onClick={() => setFilterChannel('WhatsApp')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
              filterChannel === 'WhatsApp'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          <span className="text-slate-600">|</span>

          <button
            onClick={() => setFilterIntent(filterIntent === 'RFQ' ? 'All' : 'RFQ')}
            className={`px-2 py-1 rounded-lg font-medium transition ${
              filterIntent === 'RFQ'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            RFQ
          </button>
          <button
            onClick={() => setFilterIntent(filterIntent === 'Negotiation' ? 'All' : 'Negotiation')}
            className={`px-2 py-1 rounded-lg font-medium transition ${
              filterIntent === 'Negotiation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            Negotiation
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 max-h-[620px]">
        {loadingThreads ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>Loading customer conversations...</span>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No customer threads match your search criteria.
          </div>
        ) : (
          filteredThreads.map((t) => {
            const isSelected = selectedThread?.thread_id === t.thread_id;
            return (
              <div
                key={t.thread_id}
                onClick={() => onSelectThread(t)}
                className={`p-3.5 transition cursor-pointer select-none ${
                  isSelected
                    ? isLight
                      ? 'bg-purple-50/80 border-l-4 border-purple-600'
                      : 'bg-slate-800/80 border-l-4 border-purple-500'
                    : isLight
                    ? 'hover:bg-slate-50'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {t.latest_channel === 'WhatsApp' ? (
                      <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Smartphone className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3" />
                      </div>
                    )}
                    <h4 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {t.company_name}
                    </h4>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {t.last_activity_at ? new Date(t.last_activity_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span>{t.contact_person || 'Procurement Desk'}</span>
                  <span>•</span>
                  <span>{t.country}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase border ${
                      t.badge_color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : t.badge_color === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : t.badge_color === 'rose'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-700/40 text-slate-300 border-slate-600'
                    }`}
                  >
                    {t.latest_intent}
                  </span>

                  {t.cadence_paused && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                      <Pause className="w-2.5 h-2.5" />
                      <span>Cadence Paused</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {t.last_message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
