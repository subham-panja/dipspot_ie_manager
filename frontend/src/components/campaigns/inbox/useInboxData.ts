'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchJson } from '@/lib/api';
import {
  OmnichannelThread,
  OmnichannelMessage,
  OmnichannelChannel,
  InboxChannelFilter,
  InboxIntentFilter,
  ChatwootStatusInfo,
  ThreadChatwootMeta,
} from './inboxTypes';
import {
  normalizeThread,
  normalizeMessage,
  sanitizeExternalUrl,
  isVisitorThread,
} from './inboxNormalizers';

const VISITOR_UNSUPPORTED_MSG =
  'Visitor thread — reply via Chatwoot Console or link to a CRM lead.';

function getThreadTargetId(thread: OmnichannelThread): string {
  if (thread.thread_id) return thread.thread_id;
  if (thread.lead_id !== undefined && thread.lead_id !== null) return String(thread.lead_id);
  return '';
}

export function useInboxData() {
  const [threads, setThreads] = useState<OmnichannelThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThread, setSelectedThread] = useState<OmnichannelThread | null>(null);
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<InboxChannelFilter>('All');
  const [filterIntent, setFilterIntent] = useState<InboxIntentFilter>('All');

  const [replyChannel, setReplyChannel] = useState<OmnichannelChannel>('Email');
  const [replySubject, setReplySubject] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [simulatingInbound, setSimulatingInbound] = useState(false);
  const [simText, setSimText] = useState(
    'We need 10 containers of 5% broken parboiled rice CIF Jebel Ali. Please send proforma invoice.'
  );

  const [chatwootStatus, setChatwootStatus] = useState<ChatwootStatusInfo | null>(null);
  const [threadChatwoot, setThreadChatwoot] = useState<ThreadChatwootMeta | null>(null);
  const [syncingChatwoot, setSyncingChatwoot] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const selectThreadSeqRef = useRef(0);

  const loadChatwootStatus = async () => {
    try {
      const res = await fetchJson<ChatwootStatusInfo>('/omnichannel/chatwoot/status');
      setChatwootStatus(res || null);
    } catch {
      setChatwootStatus({ configured: false, enabled: false, reachable: false });
    }
  };

  const selectThread = async (thread: OmnichannelThread) => {
    const reqSeq = ++selectThreadSeqRef.current;
    const targetId = getThreadTargetId(thread);
    setSelectedThread(thread);
    setReplyChannel(thread.latest_channel || 'Email');
    setReplySubject(`Re: Commercial Proposal for ${thread.company_name}`);
    setThreadChatwoot({
      conversation_id: thread.chatwoot_conversation_id ?? null,
      contact_id: thread.chatwoot_contact_id ?? null,
      synced: Boolean(thread.chatwoot_synced || thread.chatwoot_conversation_id),
      url: sanitizeExternalUrl(thread.chatwoot_url),
    });

    try {
      setLoadingMessages(true);
      const res = await fetchJson<{
        thread?: Record<string, any>;
        lead?: Record<string, any>;
        messages?: Record<string, any>[];
        chatwoot?: Record<string, any>;
      }>(`/omnichannel/threads/${encodeURIComponent(targetId)}`);

      if (reqSeq !== selectThreadSeqRef.current) return;

      const rawMsgs = Array.isArray(res?.messages) ? res.messages : [];
      setMessages(rawMsgs.map((m) => normalizeMessage(m, thread)));

      if (res?.chatwoot && typeof res.chatwoot === 'object') {
        setThreadChatwoot({
          conversation_id: res.chatwoot.conversation_id ?? thread.chatwoot_conversation_id ?? null,
          contact_id: res.chatwoot.contact_id ?? thread.chatwoot_contact_id ?? null,
          synced: Boolean(res.chatwoot.synced ?? res.chatwoot.conversation_id ?? thread.chatwoot_synced),
          url: sanitizeExternalUrl(res.chatwoot.url) || sanitizeExternalUrl(thread.chatwoot_url),
        });
      }
    } catch (e) {
      if (reqSeq !== selectThreadSeqRef.current) return;
      console.error('Failed to load thread messages', e);
    } finally {
      if (reqSeq === selectThreadSeqRef.current) {
        setLoadingMessages(false);
      }
    }
  };

  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await fetchJson<{ threads?: Record<string, any>[] }>('/omnichannel/threads');
      const rawList = Array.isArray(res?.threads) ? res.threads : [];
      const data = rawList.map(normalizeThread);
      setThreads(data);
      if (data.length > 0 && !selectedThread) {
        selectThread(data[0]);
      } else if (selectedThread) {
        const currentId = getThreadTargetId(selectedThread);
        const refreshed = data.find((t) => getThreadTargetId(t) === currentId);
        if (refreshed) {
          setSelectedThread(refreshed);
        }
      }
    } catch (e) {
      console.error('Failed to load omnichannel threads', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreads();
    loadChatwootStatus();
    return () => {
      selectThreadSeqRef.current += 1;
    };
  }, []);

  const handleSyncChatwoot = async (threadId?: string) => {
    if (threadId && (threadId.startsWith('cw_conv_') || (selectedThread && getThreadTargetId(selectedThread) === threadId && isVisitorThread(selectedThread)))) {
      setSyncBanner(VISITOR_UNSUPPORTED_MSG);
      return;
    }
    try {
      setSyncingChatwoot(true);
      setSyncBanner(null);
      const endpoint = threadId
        ? `/omnichannel/threads/${encodeURIComponent(threadId)}/sync`
        : '/omnichannel/chatwoot/sync';
      const res = await fetchJson<{ message?: string; synced_count?: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setSyncBanner(
        res?.message ||
          (typeof res?.synced_count === 'number'
            ? `Synced ${res.synced_count} Chatwoot conversation(s).`
            : 'Chatwoot synchronization completed.')
      );
      await Promise.all([loadThreads(), loadChatwootStatus()]);
      if (selectedThread) {
        await selectThread(selectedThread);
      }
    } catch (e: any) {
      setSyncBanner(e?.message || 'Chatwoot sync unavailable.');
    } finally {
      setSyncingChatwoot(false);
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!selectedThread) return;
    if (isVisitorThread(selectedThread)) {
      setSyncBanner(VISITOR_UNSUPPORTED_MSG);
      return;
    }
    const targetId = getThreadTargetId(selectedThread);
    try {
      setGeneratingDraft(true);
      const res = await fetchJson<{
        draft_subject?: string;
        draft_content?: string;
      }>(`/omnichannel/threads/${encodeURIComponent(targetId)}/ai-draft`, {
        method: 'POST',
        body: JSON.stringify({ channel: replyChannel }),
      });
      if (res?.draft_content) {
        setReplyContent(res.draft_content);
        if (res.draft_subject) setReplySubject(res.draft_subject);
      }
    } catch (e: any) {
      alert('Failed to generate AI draft: ' + (e?.message || 'Unknown error'));
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleDispatchReply = async () => {
    if (!selectedThread) return;
    if (isVisitorThread(selectedThread)) {
      setSyncBanner(VISITOR_UNSUPPORTED_MSG);
      return;
    }
    if (!replyContent.trim()) {
      alert('Please enter a message body to dispatch.');
      return;
    }
    const targetId = getThreadTargetId(selectedThread);
    try {
      setSendingReply(true);
      const res = await fetchJson<{ record?: Record<string, any>; message?: Record<string, any> | string }>(
        `/omnichannel/threads/${encodeURIComponent(targetId)}/dispatch`,
        {
          method: 'POST',
          body: JSON.stringify({
            channel: replyChannel,
            subject: replySubject,
            content: replyContent,
          }),
        }
      );
      const recordObj = res?.record || (typeof res?.message === 'object' ? res.message : null);
      if (recordObj) {
        setMessages((prev) => [...prev, normalizeMessage(recordObj, selectedThread)]);
        setReplyContent('');
      } else {
        setReplyContent('');
        await selectThread(selectedThread);
      }
      loadThreads();
    } catch (e: any) {
      alert('Failed to dispatch reply: ' + (e?.message || 'Unknown error'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleSimulateInbound = async () => {
    if (!selectedThread || !simText.trim()) return;
    if (isVisitorThread(selectedThread)) {
      setSyncBanner(VISITOR_UNSUPPORTED_MSG);
      return;
    }
    const targetId = getThreadTargetId(selectedThread);
    try {
      setSimulatingInbound(true);
      const res = await fetchJson<{ intent?: { intent?: string } }>('/omnichannel/inbound', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: selectedThread.lead_id,
          channel: replyChannel,
          content: simText,
          sender: selectedThread.email || '',
        }),
      });

      const updated = await fetchJson<{ messages?: Record<string, any>[] }>(
        `/omnichannel/threads/${encodeURIComponent(targetId)}`
      );
      const rawMsgs = Array.isArray(updated?.messages) ? updated.messages : [];
      setMessages(rawMsgs.map((m) => normalizeMessage(m, selectedThread)));
      loadThreads();
      alert(
        `Inbound ${replyChannel} received! AI classified intent as: ${
          res?.intent?.intent || 'Analyzed'
        }. Automated cadences auto-paused.`
      );
    } catch (e: any) {
      alert('Simulation error: ' + (e?.message || 'Unknown error'));
    } finally {
      setSimulatingInbound(false);
    }
  };

  return {
    threads,
    loadingThreads,
    selectedThread,
    messages,
    loadingMessages,
    searchQuery,
    setSearchQuery,
    filterChannel,
    setFilterChannel,
    filterIntent,
    setFilterIntent,
    replyChannel,
    setReplyChannel,
    replySubject,
    setReplySubject,
    replyContent,
    setReplyContent,
    generatingDraft,
    sendingReply,
    simulatingInbound,
    simText,
    setSimText,
    chatwootStatus,
    threadChatwoot,
    syncingChatwoot,
    syncBanner,
    loadThreads,
    loadChatwootStatus,
    selectThread,
    handleSyncChatwoot,
    handleGenerateAIDraft,
    handleDispatchReply,
    handleSimulateInbound,
  };
}
