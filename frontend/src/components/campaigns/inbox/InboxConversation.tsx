'use client';

import React from 'react';
import {
  Mail,
  Smartphone,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { OmnichannelThread, OmnichannelMessage } from './inboxTypes';

interface InboxConversationProps {
  selectedThread: OmnichannelThread;
  messages: OmnichannelMessage[];
  loadingMessages: boolean;
  replyChannel: 'Email' | 'WhatsApp';
  setReplyChannel: (ch: 'Email' | 'WhatsApp') => void;
  isLight: boolean;
}

export default function InboxConversation({
  selectedThread,
  messages,
  loadingMessages,
  replyChannel,
  setReplyChannel,
  isLight,
}: InboxConversationProps) {
  return (
    <>
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

                  {m.subject && (
                    <h5 className="text-xs font-bold text-slate-200 mb-1">
                      {m.subject}
                    </h5>
                  )}

                  <div className="text-xs whitespace-pre-wrap leading-relaxed font-sans">
                    {m.content}
                  </div>

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
    </>
  );
}
