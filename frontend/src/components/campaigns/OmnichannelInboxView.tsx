'use client';

import React, { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import {
  MessageSquare,
  Mail,
  Send,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Globe,
  Tag,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Check,
  Smartphone,
  Flame,
  ArrowRight,
} from 'lucide-react';

export interface OmnichannelThread {
  thread_id: string;
  lead_id: number;
  company_name: string;
  contact_person?: string;
  country: string;
  latest_channel: 'Email' | 'WhatsApp';
  latest_intent: string;
  sentiment: string;
  urgency: string;
  badge_color: string;
  unread_count: number;
  last_message: string;
  last_activity_at: string;
  cadence_status?: string;
  cadence_paused?: boolean;
}

export interface OmnichannelMessage {
  message_id: string;
  lead_id: number;
  company_name: string;
  channel: 'Email' | 'WhatsApp';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  status: string;
  sender?: string;
  intent?: string;
  sentiment?: string;
  urgency?: string;
  timestamp: string;
}

interface OmnichannelInboxViewProps {
  isLight: boolean;
  accentClasses: any;
}

export default function OmnichannelInboxView({ isLight, accentClasses }: OmnichannelInboxViewProps) {
  const [threads, setThreads] = useState<OmnichannelThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThread, setSelectedThread] = useState<OmnichannelThread | null>(null);
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<'All' | 'Email' | 'WhatsApp'>('All');
  const [filterIntent, setFilterIntent] = useState<'All' | 'RFQ' | 'Negotiation' | 'Unsubscribe'>('All');

  // Reply Desk State
  const [replyChannel, setReplyChannel] = useState<'Email' | 'WhatsApp'>('Email');
  const [replySubject, setReplySubject] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [simulatingInbound, setSimulatingInbound] = useState(false);
  const [simText, setSimText] = useState('We need 10 containers of 5% broken parboiled rice CIF Jebel Ali. Please send proforma invoice.');

  // Load threads
  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await fetchJson<{ threads: OmnichannelThread[] }>('/omnichannel/threads');
      const data = res.threads || [];
      setThreads(data);
      if (data.length > 0 && !selectedThread) {
        selectThread(data[0]);
      }
    } catch (e) {
      console.error('Failed to load omnichannel threads', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  const selectThread = async (thread: OmnichannelThread) => {
    setSelectedThread(thread);
    setReplyChannel(thread.latest_channel || 'Email');
    setReplySubject(`Re: Commercial Proposal for ${thread.company_name}`);
    try {
      setLoadingMessages(true);
      const res = await fetchJson<{ thread: OmnichannelThread; messages: OmnichannelMessage[] }>(
        `/omnichannel/threads/${thread.thread_id}`
      );
      setMessages(res.messages || []);
    } catch (e) {
      console.error('Failed to load thread messages', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  // Generate AI Smart Draft
  const handleGenerateAIDraft = async () => {
    if (!selectedThread) return;
    try {
      setGeneratingDraft(true);
      const res = await fetchJson<{
        lead_id: number;
        company_name: string;
        ai_intent: any;
        draft_subject: string;
        draft_content: string;
      }>(`/omnichannel/threads/${selectedThread.lead_id}/ai-draft`, {
        method: 'POST',
        body: JSON.stringify({ channel: replyChannel }),
      });
      if (res.draft_content) {
        setReplyContent(res.draft_content);
        if (res.draft_subject) setReplySubject(res.draft_subject);
      }
    } catch (e: any) {
      alert('Failed to generate AI draft: ' + e.message);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Dispatch Outbound Reply
  const handleDispatchReply = async () => {
    if (!selectedThread || !replyContent.trim()) {
      alert('Please enter a message body to dispatch.');
      return;
    }
    try {
      setSendingReply(true);
      const res = await fetchJson<{ success: boolean; message: string; record: OmnichannelMessage }>(
        `/omnichannel/threads/${selectedThread.lead_id}/dispatch`,
        {
          method: 'POST',
          body: JSON.stringify({
            channel: replyChannel,
            subject: replySubject,
            content: replyContent,
          }),
        }
      );
      if (res.record) {
        setMessages((prev) => [...prev, res.record]);
        setReplyContent('');
      }
      alert(`Message dispatched successfully via ${replyChannel}!`);
      loadThreads();
    } catch (e: any) {
      alert('Failed to dispatch reply: ' + e.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Simulate Inbound Customer Reply (Demonstrates AI classification and cadence auto-pause)
  const handleSimulateInbound = async () => {
    if (!selectedThread || !simText.trim()) return;
    try {
      setSimulatingInbound(true);
      const res = await fetchJson<{
        success: boolean;
        intent: any;
        cadence_status: string;
        message: string;
      }>('/omnichannel/inbound', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: selectedThread.lead_id,
          channel: replyChannel,
          content: simText,
          sender: `procurement@${selectedThread.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        }),
      });

      // Reload thread messages
      if (selectedThread) {
        const updated = await fetchJson<{ messages: OmnichannelMessage[] }>(
          `/omnichannel/threads/${selectedThread.thread_id}`
        );
        setMessages(updated.messages || []);
      }
      loadThreads();
      alert(`Inbound ${replyChannel} received! AI classified intent as: ${res.intent?.intent}. Automated cadences auto-paused.`);
    } catch (e: any) {
      alert('Simulation error: ' + e.message);
    } finally {
      setSimulatingInbound(false);
    }
  };

  // Filtered threads
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
    <div className="space-y-4">
      {/* Top Value Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Native CMS
              </span>
              <span className="text-xs text-slate-400 font-mono">Centralized Omnichannel Inbox</span>
            </div>
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Unified Customer Outreach & Response Hub
            </h2>
            <p className="text-xs text-slate-400">
              All Gmail SMTP emails and WhatsApp chats centralized in one timeline with automated AI intent classification and instant cadence auto-pause upon client reply.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadThreads}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Refresh Conversations"
          >
            <RefreshCw className={`w-4 h-4 ${loadingThreads ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Two-Column AI CMS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[680px]">
        {/* LEFT COLUMN: Customer Threads List (4 of 12 cols) */}
        <div
          className={`lg:col-span-5 rounded-2xl border flex flex-col overflow-hidden ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          {/* Search & Filters */}
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

            {/* Filter Pills */}
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

          {/* Thread List Items */}
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
                    onClick={() => selectThread(t)}
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

                    {/* AI Intent & Sentiment Badge */}
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

                    {/* Last message preview */}
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {t.last_message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chronological Timeline & AI Smart Response Desk (7 of 12 cols) */}
        <div
          className={`lg:col-span-7 rounded-2xl border flex flex-col overflow-hidden ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {selectedThread.company_name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Lead #{selectedThread.lead_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>Contact: <strong>{selectedThread.contact_person || 'Procurement Team'}</strong></span>
                    <span>•</span>
                    <span>Market: {selectedThread.country}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Channel:</span>
                  <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
                    <button
                      onClick={() => setReplyChannel('Email')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        replyChannel === 'Email' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Gmail</span>
                    </button>
                    <button
                      onClick={() => setReplyChannel('WhatsApp')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        replyChannel === 'WhatsApp' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Centralized Auto-Pause Banner */}
              {selectedThread.cadence_paused && (
                <div className="px-4 py-2.5 bg-purple-950/40 border-b border-purple-800/30 text-xs text-purple-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Pause className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      <strong>Automated Cadence Auto-Paused:</strong> Inbound client reply detected. Robotic follow-ups halted so you can conduct 1-to-1 commercial deal negotiation.
                    </span>
                  </div>
                </div>
              )}

              {/* Message Timeline */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[360px] bg-slate-950/30">
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Rendering conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No messages recorded in this customer thread yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isInbound = m.direction === 'inbound';
                    return (
                      <div
                        key={m.message_id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 border shadow-sm ${
                            isInbound
                              ? isLight
                                ? 'bg-slate-100 border-slate-200 text-slate-900'
                                : 'bg-slate-900 border-slate-800 text-slate-200'
                              : m.channel === 'WhatsApp'
                              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-100'
                              : 'bg-blue-950/80 border-blue-800 text-blue-100'
                          }`}
                        >
                          {/* Message Header */}
                          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800/40">
                            <span className="flex items-center gap-1 font-semibold">
                              {m.channel === 'WhatsApp' ? (
                                <Smartphone className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Mail className="w-3 h-3 text-blue-400" />
                              )}
                              <span>{isInbound ? m.sender || 'Customer' : 'TradePulse Commercial Desk'}</span>
                            </span>
                            <span className="font-mono">
                              {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          {/* Subject if email */}
                          {m.subject && (
                            <h5 className="text-xs font-bold text-slate-200 mb-1">
                              {m.subject}
                            </h5>
                          )}

                          {/* Body */}
                          <div className="text-xs whitespace-pre-wrap leading-relaxed font-sans">
                            {m.content}
                          </div>

                          {/* Inbound AI classification badge */}
                          {isInbound && m.intent && (
                            <div className="mt-2 pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px]">
                              <span className="text-purple-300 font-mono">
                                AI: {m.intent}
                              </span>
                              <span className="text-emerald-400 font-semibold">
                                {m.sentiment}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* AI SMART REPLY ASSISTANT & DISPATCH DESK */}
              <div className="p-4 border-t border-slate-800/60 bg-slate-950/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">AI True Native Response Assistant</span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                      Contextual Spot Offer & Counter-Offer
                    </span>
                  </div>

                  <button
                    onClick={handleGenerateAIDraft}
                    disabled={generatingDraft}
                    className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${generatingDraft ? 'animate-spin' : ''}`} />
                    <span>{generatingDraft ? 'Analyzing Context...' : 'Draft AI Smart Reply'}</span>
                  </button>
                </div>

                {/* Email Subject Line if Email */}
                {replyChannel === 'Email' && (
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder="Email Subject Line..."
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white font-medium outline-none"
                  />
                )}

                {/* Message Body Input */}
                <textarea
                  rows={4}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Type your ${replyChannel} commercial response or click 'Draft AI Smart Reply'...`}
                  className="w-full p-3 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 font-sans outline-none leading-relaxed resize-none focus:border-purple-500/50 transition"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Test Inbound Simulation Drawer */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={simText}
                      onChange={(e) => setSimText(e.target.value)}
                      placeholder="Simulate client reply text..."
                      className="w-64 px-2.5 py-1 text-[11px] rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                    />
                    <button
                      onClick={handleSimulateInbound}
                      disabled={simulatingInbound}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium flex items-center gap-1 cursor-pointer"
                      title="Simulates client reply, triggers AI sentiment and pauses cadence"
                    >
                      <span>Simulate Inbound</span>
                    </button>
                  </div>

                  {/* Dispatch Button */}
                  <button
                    onClick={handleDispatchReply}
                    disabled={sendingReply || !replyContent.trim()}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 ${
                      replyChannel === 'WhatsApp' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingReply ? 'animate-spin' : ''}`} />
                    <span>{sendingReply ? 'Transmitting...' : `Dispatch via ${replyChannel}`}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No Conversation Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a customer from the left list to review chronological email & WhatsApp messages, draft AI responses, and manage deals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

