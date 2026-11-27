'use client';

import React from 'react';
import { Sparkles, Send, ExternalLink, Info } from 'lucide-react';
import InboxWebhookSimulator from './InboxWebhookSimulator';
import { OmnichannelChannel } from './inboxTypes';
import { sanitizeExternalUrl } from './inboxNormalizers';

interface InboxReplyComposerProps {
  replyChannel: OmnichannelChannel;
  replySubject: string;
  setReplySubject: (subj: string) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  generatingDraft: boolean;
  onGenerateAIDraft: () => Promise<void>;
  sendingReply: boolean;
  onDispatchReply: () => Promise<void>;
  simText: string;
  setSimText: (t: string) => void;
  simulatingInbound: boolean;
  onSimulateInbound: () => Promise<void>;
  isVisitorThread?: boolean;
  chatwootUrl?: string;
}

const VISITOR_NOTICE = 'Visitor thread — reply via Chatwoot Console or link to a CRM lead';

export default function InboxReplyComposer({
  replyChannel,
  replySubject,
  setReplySubject,
  replyContent,
  setReplyContent,
  generatingDraft,
  onGenerateAIDraft,
  sendingReply,
  onDispatchReply,
  simText,
  setSimText,
  simulatingInbound,
  onSimulateInbound,
  isVisitorThread = false,
  chatwootUrl,
}: InboxReplyComposerProps) {
  const safeChatwootUrl = sanitizeExternalUrl(chatwootUrl);
  const dispatchBtnClass =
    replyChannel === 'WhatsApp'
      ? 'bg-emerald-600 hover:bg-emerald-500'
      : replyChannel === 'Website'
      ? 'bg-purple-600 hover:bg-purple-500'
      : 'bg-blue-600 hover:bg-blue-500';

  return (
    <div className="p-4 border-t border-slate-800/60 bg-slate-950/50 space-y-3">
      {isVisitorThread && (
        <div className="px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{VISITOR_NOTICE}</span>
          </div>
          {safeChatwootUrl && (
            <a
              href={safeChatwootUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1 transition shrink-0"
            >
              <span>Open Chatwoot</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">AI True Native Response Assistant</span>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
            Contextual Spot Offer & Counter-Offer
          </span>
        </div>

        <button
          type="button"
          onClick={onGenerateAIDraft}
          disabled={generatingDraft || isVisitorThread}
          title={isVisitorThread ? VISITOR_NOTICE : 'Generate an AI contextual draft'}
          className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className={`w-3.5 h-3.5 ${generatingDraft ? 'animate-spin' : ''}`} />
          <span>{generatingDraft ? 'Analyzing Context...' : 'Draft AI Smart Reply'}</span>
        </button>
      </div>

      {replyChannel === 'Email' && (
        <input
          type="text"
          value={replySubject}
          onChange={(e) => setReplySubject(e.target.value)}
          disabled={isVisitorThread}
          placeholder="Email Subject Line..."
          className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white font-medium outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}

      <textarea
        rows={4}
        value={replyContent}
        onChange={(e) => setReplyContent(e.target.value)}
        disabled={isVisitorThread}
        placeholder={
          isVisitorThread
            ? VISITOR_NOTICE
            : `Type your ${replyChannel} commercial response or click 'Draft AI Smart Reply'...`
        }
        className="w-full p-3 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 font-sans outline-none leading-relaxed resize-none focus:border-purple-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <InboxWebhookSimulator
          simText={simText}
          setSimText={setSimText}
          simulatingInbound={simulatingInbound}
          onSimulateInbound={onSimulateInbound}
          disabled={isVisitorThread}
          disabledReason={VISITOR_NOTICE}
        />

        <button
          type="button"
          onClick={onDispatchReply}
          disabled={sendingReply || isVisitorThread || !replyContent.trim()}
          title={isVisitorThread ? VISITOR_NOTICE : `Dispatch message via ${replyChannel}`}
          className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${dispatchBtnClass}`}
        >
          <Send className={`w-3.5 h-3.5 ${sendingReply ? 'animate-spin' : ''}`} />
          <span>{sendingReply ? 'Transmitting...' : `Dispatch via ${replyChannel}`}</span>
        </button>
      </div>
    </div>
  );
}
