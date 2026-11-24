'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import { OmnichannelThread, OmnichannelMessage } from './inboxTypes';

export function useInboxData() {
  const [threads, setThreads] = useState<OmnichannelThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThread, setSelectedThread] = useState<OmnichannelThread | null>(null);
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<'All' | 'Email' | 'WhatsApp'>('All');
  const [filterIntent, setFilterIntent] = useState<'All' | 'RFQ' | 'Negotiation' | 'Unsubscribe'>('All');

  const [replyChannel, setReplyChannel] = useState<'Email' | 'WhatsApp'>('Email');
  const [replySubject, setReplySubject] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [simulatingInbound, setSimulatingInbound] = useState(false);
  const [simText, setSimText] = useState('We need 10 containers of 5% broken parboiled rice CIF Jebel Ali. Please send proforma invoice.');

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

  useEffect(() => {
    loadThreads();
  }, []);

  const handleGenerateAIDraft = async () => {
    if (!selectedThread) return;
    try {
      setGeneratingDraft(true);
      const res = await fetchJson<{
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

  const handleDispatchReply = async () => {
    if (!selectedThread || !replyContent.trim()) {
      alert('Please enter a message body to dispatch.');
      return;
    }
    try {
      setSendingReply(true);
      const res = await fetchJson<{ record: OmnichannelMessage }>(
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

  const handleSimulateInbound = async () => {
    if (!selectedThread || !simText.trim()) return;
    try {
      setSimulatingInbound(true);
      const res = await fetchJson<{ intent: any }>(
        '/omnichannel/inbound',
        {
          method: 'POST',
          body: JSON.stringify({
            lead_id: selectedThread.lead_id,
            channel: replyChannel,
            content: simText,
            sender: `procurement@${selectedThread.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          }),
        }
      );

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
    loadThreads,
    selectThread,
    handleGenerateAIDraft,
    handleDispatchReply,
    handleSimulateInbound,
  };
}
