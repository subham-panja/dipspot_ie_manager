'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchJson } from '@/lib/api';
import {
  MessageTemplate,
  DispatchRecord,
  LeadSample,
  DEFAULT_SAMPLE_LEAD,
} from './templateTypes';

export function useTemplateStudio() {
  const [viewMode, setViewMode] = useState<'library' | 'studio'>('library');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'All' | 'Email' | 'WhatsApp' | 'SMS'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [activeTemplate, setActiveTemplate] = useState<MessageTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('Soft Offer');
  const [tplChannel, setTplChannel] = useState<'Email' | 'WhatsApp' | 'SMS'>('Email');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [realLeads, setRealLeads] = useState<LeadSample[]>([DEFAULT_SAMPLE_LEAD]);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [customLeadOverrides, setCustomLeadOverrides] = useState<Record<string, string>>({
    quantity_mt: '250 MT',
    price_per_mt: '$465 / MT',
    incoterm: 'CIF Jebel Ali Port',
    payment_terms: '100% L/C at Sight',
    tracking_link: 'http://localhost:3000/track/TRK-2026-8921',
    today_date: '17 Nov 2026',
    validity_days: '5 business days',
  });
  const [showOverrideInputs, setShowOverrideInputs] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop_email' | 'mobile_email' | 'whatsapp' | 'sms'>('desktop_email');

  const [testRecipient, setTestRecipient] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{
    success: boolean;
    mode: string;
    message: string;
    dispatch_id?: string;
  } | null>(null);

  const [quickTestTemplate, setQuickTestTemplate] = useState<MessageTemplate | null>(null);
  const [showOutboxModal, setShowOutboxModal] = useState(false);
  const [outboxRecords, setOutboxRecords] = useState<DispatchRecord[]>([]);
  const [loadingOutbox, setLoadingOutbox] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{ host?: string; is_verified?: boolean; has_password?: boolean } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectTemplateForStudio = (tpl: MessageTemplate) => {
    setActiveTemplate(tpl);
    setTplName(tpl.name);
    setTplCategory(tpl.category || 'Soft Offer');
    setTplChannel(tpl.channel);
    setTplSubject(tpl.subject || '');
    setTplBody(tpl.body);
    setDispatchFeedback(null);

    if (tpl.channel === 'WhatsApp') setPreviewDevice('whatsapp');
    else if (tpl.channel === 'SMS') setPreviewDevice('sms');
    else setPreviewDevice('desktop_email');

    const currentLead = realLeads[selectedLeadIndex] || DEFAULT_SAMPLE_LEAD;
    setTestRecipient(tpl.channel === 'Email' ? currentLead.emails || '' : currentLead.phones || '');
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetchJson<{ templates: MessageTemplate[] }>('/campaigns/templates');
      const list = res.templates || [];
      setTemplates(list);
      if (list.length > 0 && !activeTemplate) {
        selectTemplateForStudio(list[0]);
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRealLeads = async () => {
    try {
      const res = await fetchJson<{ leads: any[] }>('/leads?per_page=15');
      if (res.leads && res.leads.length > 0) {
        const samples: LeadSample[] = res.leads.map((l) => ({
          company_name: l.company_name || 'Al-Dhiyafa Foodstuff Trading LLC',
          contact_person: l.contact_person || l.company_name.split(' ')[0],
          commodity: l.matched_varieties || 'IR-64 Parboiled Rice 5% Broken',
          country: l.country || 'United Arab Emirates',
          nearest_port: l.nearest_port || l.city_or_hub || 'Jebel Ali Port (AEJEA)',
          emails: l.emails || `procurement@${l.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}.com`,
          phones: l.phones || '+971 4 223 8810',
        }));
        setRealLeads(samples);
      }
    } catch (e) {
      console.error('Failed to fetch real leads for preview', e);
    }
  };

  const loadSmtpStatus = async () => {
    try {
      const res = await fetchJson<{ smtp: any }>('/config/smtp');
      if (res.smtp) {
        setSmtpStatus(res.smtp);
      }
    } catch (e) {
      console.warn('Could not load SMTP config status', e);
    }
  };

  const loadDispatches = async () => {
    try {
      setLoadingOutbox(true);
      const res = await fetchJson<{ dispatches: DispatchRecord[] }>('/campaigns/templates/dispatches');
      setOutboxRecords(res.dispatches || []);
    } catch (e) {
      console.error('Failed to fetch dispatches', e);
    } finally {
      setLoadingOutbox(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadRealLeads();
    loadSmtpStatus();
    loadDispatches();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickTestTemplate(null);
        setShowOutboxModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenStudio = (tpl: MessageTemplate) => {
    selectTemplateForStudio(tpl);
    setViewMode('studio');
  };

  const handleCreateNew = () => {
    const blank: MessageTemplate = {
      template_id: `TPL-${Date.now().toString(36).toUpperCase()}`,
      name: 'Untitled Commercial Template',
      category: 'Soft Offer',
      channel: 'Email',
      subject: 'Spot Commercial Quotation: {commodity} CIF {port}',
      body: 'Dear Sourcing Team at {company_name},\n\nWe are direct producers and exporters of {commodity}.\n\nPlease find our commercial terms for delivery to {country}:\n• Commodity: {commodity}\n• Port of Discharge: {port}\n• Incoterm: CIF {port}\n• Payment Terms: 100% L/C at Sight\n\nPlease let us know your required prompt tonnage.\n\nBest regards,\nTradePulse Export Operations',
      variables: ['{company_name}', '{commodity}', '{country}', '{port}'],
    };
    selectTemplateForStudio(blank);
    setViewMode('studio');
  };

  const handleResetDefaults = async () => {
    if (!confirm('Restore default export-import industry templates? Custom edits will be preserved.')) return;
    try {
      setLoading(true);
      const res = await fetchJson<{ templates: MessageTemplate[] }>('/campaigns/templates/reset-defaults', {
        method: 'POST',
      });
      if (res.templates) {
        setTemplates(res.templates);
        if (res.templates.length > 0) {
          selectTemplateForStudio(res.templates[0]);
        }
      }
    } catch (e) {
      alert('Failed to reset templates: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !tplBody.trim()) {
      alert('Template Name and Message Body are required.');
      return;
    }

    try {
      setIsSaving(true);
      const bodyTokens = tplBody.match(/\{[a-zA-Z0-9_]+\}/g) || [];
      const subjTokens = tplSubject.match(/\{[a-zA-Z0-9_]+\}/g) || [];
      const tokensFound = Array.from(new Set([...bodyTokens, ...subjTokens]));

      const payload = {
        name: tplName.trim(),
        category: tplCategory,
        channel: tplChannel,
        subject: tplChannel === 'Email' ? tplSubject.trim() : '',
        body: tplBody,
        variables: tokensFound,
      };

      if (activeTemplate?._id) {
        await fetchJson(`/campaigns/templates/${activeTemplate.template_id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        const created = await fetchJson<{ template: MessageTemplate }>('/campaigns/templates', {
          method: 'POST',
          body: JSON.stringify({
            template_id: activeTemplate?.template_id || `TPL-${Date.now().toString(36).toUpperCase()}`,
            ...payload,
          }),
        });
        if (created.template) {
          setActiveTemplate(created.template);
        }
      }

      await loadTemplates();
      setDispatchFeedback({
        success: true,
        mode: 'saved',
        message: 'Template successfully saved to database.',
      });
    } catch (e) {
      alert('Failed to save template: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(`Are you sure you want to delete template ${templateId}?`)) return;
    try {
      await fetchJson(`/campaigns/templates/${templateId}`, {
        method: 'DELETE',
      });
      await loadTemplates();
      setViewMode('library');
    } catch (e) {
      alert('Failed to delete template: ' + e);
    }
  };

  const handleDuplicateTemplate = (tpl: MessageTemplate) => {
    const cloned: MessageTemplate = {
      template_id: `TPL-COPY-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      name: `${tpl.name} (Copy)`,
      category: tpl.category || 'Soft Offer',
      channel: tpl.channel,
      subject: tpl.subject ? `${tpl.subject} (Copy)` : '',
      body: tpl.body,
      variables: [...tpl.variables],
    };
    selectTemplateForStudio(cloned);
    setViewMode('studio');
  };

  const insertTokenIntoDraft = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTplBody((prev) => prev + ' ' + token);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = tplBody;
    const nextText = text.substring(0, start) + token + text.substring(end);
    setTplBody(nextText);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  const insertSnippetIntoDraft = (snippet: string) => {
    setTplBody((prev) => prev + snippet);
  };

  const handleExecuteTestDispatch = async (templateToDispatch?: MessageTemplate, targetRecipient?: string) => {
    const tpl = templateToDispatch || {
      template_id: activeTemplate?.template_id || 'TPL-TEST',
      name: tplName,
      category: tplCategory,
      channel: tplChannel,
      subject: tplSubject,
      body: tplBody,
      variables: [],
    };

    const recipient = targetRecipient || testRecipient;
    if (!recipient.trim()) {
      alert('Please enter a recipient email address or phone number.');
      return;
    }

    try {
      setIsDispatching(true);
      setDispatchFeedback(null);

      const activeLead = realLeads[selectedLeadIndex] || DEFAULT_SAMPLE_LEAD;
      const combinedCustomerData = {
        company_name: activeLead.company_name,
        contact_name: activeLead.contact_person,
        commodity: activeLead.commodity,
        country: activeLead.country,
        port: activeLead.nearest_port,
        ...customLeadOverrides,
      };

      const res = await fetchJson<{
        success: boolean;
        mode: string;
        message: string;
        dispatch_id?: string;
        error?: string;
      }>('/campaigns/templates/test-send', {
        method: 'POST',
        body: JSON.stringify({
          template_id: tpl.template_id,
          recipient: recipient.trim(),
          subject: tpl.subject,
          body: tpl.body,
          channel: tpl.channel,
          customer: combinedCustomerData,
        }),
      });

      setDispatchFeedback({
        success: res.success,
        mode: res.mode,
        message: res.message || res.error || 'Dispatch executed successfully',
        dispatch_id: res.dispatch_id,
      });

      await loadDispatches();
      if (quickTestTemplate) {
        setQuickTestTemplate(null);
      }
    } catch (e: any) {
      setDispatchFeedback({
        success: false,
        mode: 'error',
        message: 'Dispatch failed: ' + (e?.message || e),
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const activeLead = realLeads[selectedLeadIndex] || DEFAULT_SAMPLE_LEAD;
  const customerMergeDict: Record<string, string> = {
    company_name: activeLead.company_name,
    contact_name: activeLead.contact_person,
    commodity: activeLead.commodity,
    country: activeLead.country,
    port: activeLead.nearest_port,
    ...customLeadOverrides,
  };

  let hydratedBody = tplBody;
  let hydratedSubject = tplSubject;
  Object.entries(customerMergeDict).forEach(([k, v]) => {
    hydratedBody = hydratedBody.split(`{${k}}`).join(v);
    hydratedSubject = hydratedSubject.split(`{${k}}`).join(v);
  });

  const smsCharCount = hydratedBody.length;
  const smsSegments = smsCharCount <= 160 ? 1 : Math.ceil(smsCharCount / 153);

  return {
    viewMode,
    setViewMode,
    templates,
    loading,
    searchQuery,
    setSearchQuery,
    selectedChannel,
    setSelectedChannel,
    selectedCategory,
    setSelectedCategory,
    activeTemplate,
    tplName,
    setTplName,
    tplCategory,
    setTplCategory,
    tplChannel,
    setTplChannel,
    tplSubject,
    setTplSubject,
    tplBody,
    setTplBody,
    isSaving,
    copiedToken,
    realLeads,
    selectedLeadIndex,
    setSelectedLeadIndex,
    customLeadOverrides,
    setCustomLeadOverrides,
    showOverrideInputs,
    setShowOverrideInputs,
    previewDevice,
    setPreviewDevice,
    testRecipient,
    setTestRecipient,
    isDispatching,
    dispatchFeedback,
    quickTestTemplate,
    setQuickTestTemplate,
    showOutboxModal,
    setShowOutboxModal,
    outboxRecords,
    loadingOutbox,
    smtpStatus,
    textareaRef,
    activeLead,
    hydratedBody,
    hydratedSubject,
    smsCharCount,
    smsSegments,
    handleOpenStudio,
    handleCreateNew,
    handleResetDefaults,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleDuplicateTemplate,
    insertTokenIntoDraft,
    insertSnippetIntoDraft,
    handleExecuteTestDispatch,
  };
}
