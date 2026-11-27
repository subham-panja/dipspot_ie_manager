'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCw, MessageSquare, ExternalLink, Settings } from 'lucide-react';
import { OmnichannelInboxViewProps } from './inbox/inboxTypes';
import { useInboxData } from './inbox/useInboxData';
import { sanitizeExternalUrl, isVisitorThread } from './inbox/inboxNormalizers';
import InboxThreadList from './inbox/InboxThreadList';
import InboxConversation from './inbox/InboxConversation';
import InboxReplyComposer from './inbox/InboxReplyComposer';

export * from './inbox/inboxTypes';

export default function OmnichannelInboxView({ isLight }: OmnichannelInboxViewProps) {
  const inbox = useInboxData();
  const chatwootConsoleUrl =
    sanitizeExternalUrl(inbox.chatwootStatus?.public_url) ||
    sanitizeExternalUrl(inbox.chatwootStatus?.base_url) ||
    sanitizeExternalUrl(process.env.NEXT_PUBLIC_CHATWOOT_URL);

  const isChatwootConnected = Boolean(
    inbox.chatwootStatus?.configured && inbox.chatwootStatus?.reachable
  );
  const statusLabel = isChatwootConnected
    ? 'Chatwoot Connected'
    : inbox.chatwootStatus?.configured
    ? 'Chatwoot Offline'
    : 'Chatwoot Not Configured';

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Native CMS
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                  isChatwootConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : inbox.chatwootStatus?.configured
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {statusLabel}
              </span>
              <span className="text-xs text-slate-400 font-mono">Centralized Omnichannel Inbox</span>
            </div>
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Unified Customer Outreach & Response Hub
            </h2>
            <p className="text-xs text-slate-400">
              Email, WhatsApp, and Website Live Chat centralized in one timeline with Chatwoot sync, AI intent classification, and instant cadence auto-pause.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => inbox.handleSyncChatwoot()}
            disabled={inbox.syncingChatwoot}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
            title="Synchronize all active threads with Chatwoot"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${inbox.syncingChatwoot ? 'animate-spin' : ''}`} />
            <span>{inbox.syncingChatwoot ? 'Syncing...' : 'Sync Chatwoot'}</span>
          </button>

          {chatwootConsoleUrl ? (
            <a
              href={chatwootConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition shadow-sm"
            >
              <span>Open Chatwoot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <Link
              href="/settings?tab=chatwoot"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Chatwoot</span>
            </Link>
          )}

          <button
            type="button"
            onClick={inbox.loadThreads}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Refresh Conversations"
          >
            <RefreshCw className={`w-4 h-4 ${inbox.loadingThreads ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {inbox.syncBanner && (
        <div className="px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs text-purple-200">
          {inbox.syncBanner}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[680px]">
        <InboxThreadList
          threads={inbox.threads}
          loadingThreads={inbox.loadingThreads}
          selectedThread={inbox.selectedThread}
          onSelectThread={inbox.selectThread}
          searchQuery={inbox.searchQuery}
          setSearchQuery={inbox.setSearchQuery}
          filterChannel={inbox.filterChannel}
          setFilterChannel={inbox.setFilterChannel}
          filterIntent={inbox.filterIntent}
          setFilterIntent={inbox.setFilterIntent}
          isLight={isLight}
        />

        <div
          className={`lg:col-span-7 rounded-2xl border flex flex-col overflow-hidden ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          {inbox.selectedThread ? (
            <>
              <InboxConversation
                selectedThread={inbox.selectedThread}
                messages={inbox.messages}
                loadingMessages={inbox.loadingMessages}
                replyChannel={inbox.replyChannel}
                setReplyChannel={inbox.setReplyChannel}
                threadChatwoot={inbox.threadChatwoot}
                chatwootBaseUrl={chatwootConsoleUrl}
                onSyncThread={(tid) => inbox.handleSyncChatwoot(tid)}
                syncingChatwoot={inbox.syncingChatwoot}
                isLight={isLight}
              />
              <InboxReplyComposer
                replyChannel={inbox.replyChannel}
                replySubject={inbox.replySubject}
                setReplySubject={inbox.setReplySubject}
                replyContent={inbox.replyContent}
                setReplyContent={inbox.setReplyContent}
                generatingDraft={inbox.generatingDraft}
                onGenerateAIDraft={inbox.handleGenerateAIDraft}
                sendingReply={inbox.sendingReply}
                onDispatchReply={inbox.handleDispatchReply}
                simText={inbox.simText}
                setSimText={inbox.setSimText}
                simulatingInbound={inbox.simulatingInbound}
                onSimulateInbound={inbox.handleSimulateInbound}
                isVisitorThread={isVisitorThread(inbox.selectedThread)}
                chatwootUrl={
                  sanitizeExternalUrl(inbox.threadChatwoot?.url) ||
                  sanitizeExternalUrl(inbox.selectedThread.chatwoot_url) ||
                  chatwootConsoleUrl
                }
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No Conversation Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a customer from the left list to review Email, WhatsApp & Website live chat messages, draft AI responses, and manage deals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
