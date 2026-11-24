'use client';

import React from 'react';
import { Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { OmnichannelInboxViewProps } from './inbox/inboxTypes';
import { useInboxData } from './inbox/useInboxData';
import InboxThreadList from './inbox/InboxThreadList';
import InboxConversation from './inbox/InboxConversation';
import InboxReplyComposer from './inbox/InboxReplyComposer';

export * from './inbox/inboxTypes';

export default function OmnichannelInboxView({ isLight }: OmnichannelInboxViewProps) {
  const inbox = useInboxData();

  return (
    <div className="space-y-4">
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
            onClick={inbox.loadThreads}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Refresh Conversations"
          >
            <RefreshCw className={`w-4 h-4 ${inbox.loadingThreads ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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
              />
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
