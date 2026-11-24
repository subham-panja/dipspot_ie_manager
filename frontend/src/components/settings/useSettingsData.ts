'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import { SmtpStopperStatus } from '@/components/campaigns/SmtpStopperBanner';
import {
  SourceItem,
  CompanyProfile,
  DedupConfig,
  SmtpConfig,
  WhatsAppConfig,
  TrashLead,
} from './settingsTypes';

export function useSettingsData() {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const [company, setCompany] = useState<CompanyProfile>({
    company_name: 'TradePulse EXIM Global Corp',
    iec_code: '0519042918',
    gstin: '19AABCT1234F1Z5',
    default_currency: 'USD',
    default_unit: 'MT',
    primary_export_port: 'Syama Prasad Mookerjee Port Kolkata (INCCU)',
    support_email: 'export@tradepulse.exim',
    phone: '+91 33 2289 4400',
  });

  const [dedup, setDedup] = useState<DedupConfig>({
    dedup_threshold: 95.0,
    auto_merge_duplicates: true,
    conflict_resolution: 'intelligent_union',
    phone_crosscheck: true,
    tax_crosscheck: true,
    ml_model: 'RapidFuzz Multi-Factor NLP Token Ensemble',
  });

  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: 'smtp.gmail.com',
    port: 587,
    username: 'exports@tradepulse.exim',
    from_name: 'TradePulse Commercial Exports',
    from_email: 'exports@tradepulse.exim',
    use_tls: true,
    use_ssl: false,
    password: '',
  });
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testSmtpResult, setTestSmtpResult] = useState<string | null>(null);
  const [smtpStopper, setSmtpStopper] = useState<SmtpStopperStatus | null>(null);

  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>({
    provider: 'meta_cloud_api',
    api_token: 'EAABwzLIX4ZAIBA...',
    phone_number_id: '109849201948291',
    webhook_url: 'https://api.tradepulse.exim/webhooks/whatsapp',
    personal_daily_cap: 50,
    typing_delay_jitter: '4500ms - 8200ms',
    auto_stop_opt_out: true,
  });

  const [trashLeads, setTrashLeads] = useState<TrashLead[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setSaveMsg({ text, type });
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const loadSmtpStopper = async () => {
    try {
      const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/status');
      if (res?.status) setSmtpStopper(res.status);
    } catch (e) {
      console.error('Failed to load smtp stopper status', e);
    }
  };

  const handleHardBreak = async () => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/hard-break', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Operator manual emergency freeze from Settings' }),
    });
    if (res?.status) setSmtpStopper(res.status);
    showNotification('Gmail Mail Stopper engaged. All active email campaigns frozen.');
  };

  const handleResume = async () => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/resume', {
      method: 'POST',
    });
    if (res?.status) setSmtpStopper(res.status);
    showNotification('Mail Stopper disengaged. Campaigns resumed.');
  };

  const handleResetCounter = async () => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/reset-counter', {
      method: 'POST',
    });
    if (res?.status) setSmtpStopper(res.status);
    showNotification('24-hour SMTP counter reset to 0.');
  };

  const handleUpdateLimit = async (newLimit: number) => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/config', {
      method: 'PATCH',
      body: JSON.stringify({ daily_limit: newLimit }),
    });
    if (res?.status) setSmtpStopper(res.status);
    showNotification(`Daily SMTP limit set to ${newLimit} emails/day.`);
  };

  const loadSettings = async () => {
    try {
      const [compRes, dedupRes, smtpRes, sourcesRes] = await Promise.all([
        fetchJson<{ company: CompanyProfile }>('/config/company').catch(() => ({ company })),
        fetchJson<{ dedup: DedupConfig }>('/config/dedup').catch(() => ({ dedup })),
        fetchJson<{ smtp: SmtpConfig }>('/config/smtp').catch(() => ({ smtp })),
        fetchJson<{ sources: SourceItem[] }>('/config/sources').catch(() => ({ sources: [] })),
      ]);
      if (compRes?.company) setCompany(compRes.company);
      if (dedupRes?.dedup) setDedup(dedupRes.dedup);
      if (smtpRes?.smtp) setSmtp(smtpRes.smtp);
      if (sourcesRes?.sources) setSources(sourcesRes.sources);
      loadSmtpStopper();
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const res = await fetchJson<{ sources: SourceItem[] }>('/config/sources');
      if (res?.sources) setSources(res.sources);
    } catch (e) {
      console.error('Failed to load sources', e);
    } finally {
      setLoadingSources(false);
    }
  };

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, enabled } : s)));
    try {
      await fetchJson('/config/sources', {
        method: 'PATCH',
        body: JSON.stringify({ toggle: { source_id: sourceId, enabled } }),
      });
      showNotification(`Source ${enabled ? 'enabled' : 'disabled'} for lead crawling.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update source state', 'error');
      loadSources();
    }
  };

  const bulkUpdateSources = async (action: 'enable_all' | 'disable_all' | 'enable_indian_only') => {
    try {
      setSaving(true);
      const res = await fetchJson<{ disabled_sources: string[] }>('/config/sources', {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const disabledSet = new Set(res?.disabled_sources || []);
      setSources((prev) => prev.map((s) => ({ ...s, enabled: !disabledSet.has(s.id) })));
      showNotification('Sources configuration updated successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update sources', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadTrash = async () => {
    try {
      setLoadingTrash(true);
      const res = await fetchJson<{ leads: TrashLead[]; total: number }>('/leads/trash');
      setTrashLeads(res.leads || []);
    } catch (e) {
      console.error('Failed to load trash leads', e);
    } finally {
      setLoadingTrash(false);
    }
  };

  const saveCompany = async () => {
    try {
      setSaving(true);
      await fetchJson('/config/company', {
        method: 'PATCH',
        body: JSON.stringify(company),
      });
      showNotification('Company EXIM profile saved successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to save company profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveDedup = async () => {
    try {
      setSaving(true);
      await fetchJson('/config/dedup', {
        method: 'PATCH',
        body: JSON.stringify(dedup),
      });
      showNotification('ML Deduplication parameters & threshold updated!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to save deduplication settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveSmtp = async () => {
    try {
      setSaving(true);
      await fetchJson('/config/smtp', {
        method: 'PATCH',
        body: JSON.stringify(smtp),
      });
      showNotification('Gmail SMTP delivery settings saved!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to save SMTP settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    try {
      setTestingSmtp(true);
      setTestSmtpResult(null);
      const res = await fetchJson<{ message: string; success: boolean }>('/config/smtp/test', {
        method: 'POST',
        body: JSON.stringify({ recipient: smtp.from_email }),
      });
      setTestSmtpResult(res.message);
      showNotification('SMTP connection test succeeded!');
    } catch (err: any) {
      setTestSmtpResult('Connection Failed: ' + (err.message || 'Unable to connect to SMTP host'));
      showNotification('SMTP test connection failed', 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleRestoreLead = async (id: string | number) => {
    try {
      await fetchJson(`/leads/${id}/restore`, { method: 'POST' });
      setTrashLeads((prev) => prev.filter((l) => l.id !== id));
      showNotification('Lead restored back to active directory!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to restore lead', 'error');
    }
  };

  const handlePermanentDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to PERMANENTLY purge this lead? This cannot be undone.')) return;
    try {
      await fetchJson(`/leads/${id}?permanent=true`, { method: 'DELETE' });
      setTrashLeads((prev) => prev.filter((l) => l.id !== id));
      showNotification('Lead permanently deleted.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete lead', 'error');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    saving,
    saveMsg,
    showNotification,
    sources,
    loadingSources,
    toggleSource,
    bulkUpdateSources,
    company,
    setCompany,
    saveCompany,
    dedup,
    setDedup,
    saveDedup,
    smtp,
    setSmtp,
    saveSmtp,
    handleTestSmtp,
    testingSmtp,
    testSmtpResult,
    smtpStopper,
    handleHardBreak,
    handleResume,
    handleResetCounter,
    handleUpdateLimit,
    whatsapp,
    setWhatsapp,
    trashLeads,
    loadingTrash,
    loadTrash,
    handleRestoreLead,
    handlePermanentDelete,
  };
}
