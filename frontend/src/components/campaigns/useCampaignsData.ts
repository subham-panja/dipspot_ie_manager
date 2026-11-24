'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchJson } from '@/lib/api';
import { SmtpStopperStatus } from './SmtpStopperBanner';
import {
  Campaign,
  CustomerSegment,
  MessageTemplate,
  TOKEN_SUGGESTIONS,
} from './CampaignTypes';

export function useCampaignsData(initialTab: 'segments' | 'campaigns' | 'wizard' | 'templates' | 'inbox' | 'cadences') {
  const [activeTab, setActiveTab] = useState<'segments' | 'campaigns' | 'wizard' | 'templates' | 'inbox' | 'cadences'>(initialTab);

  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [showNewSegmentModal, setShowNewSegmentModal] = useState(false);
  const [inspectingSegment, setInspectingSegment] = useState<CustomerSegment | null>(null);
  const [inspectLeads, setInspectLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [newSegmentForm, setNewSegmentForm] = useState({
    name: '',
    description: '',
    lead_type: 'importer',
    countries: 'United Arab Emirates, Saudi Arabia',
    min_score: 50,
    tags: 'High Volume, Commercial',
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplChannel, setTplChannel] = useState<'Email' | 'WhatsApp' | 'SMS'>('Email');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [isSavingTpl, setIsSavingTpl] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  const [wizardData, setWizardData] = useState({
    name: '',
    channel: 'Email',
    segment_id: '',
    target_commodity: 'IR-64 Parboiled Rice 5% Broken',
    target_countries: 'United Arab Emirates, Saudi Arabia',
    template_subject: 'Spot Commercial Offer: Certified {commodity} CIF {port}',
    template_body: `Dear Sourcing Director at {company_name},\n\nWe are direct producers and exporters of high-grade {commodity}.\n\nImmediate container shipment and SGS quality inspection available for destinations in {country}.\n\nCurrent Indicative Offer:\n- Commodity: {commodity}\n- Destination Port: {port}\n- Packing: Export standard PP bags with custom brand printing\n- Certification: Phytosanitary & SGS Certificate of Origin\n\nWould you like us to issue a formal Proforma Invoice and spec sheet?\n\nBest regards,\nCommercial Export Desk`,
  });

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [activeCampaignForEnroll, setActiveCampaignForEnroll] = useState<Campaign | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    country: '',
    lead_type: 'importer',
    segment_id: '',
  });
  const [enrolling, setEnrolling] = useState(false);
  const [smtpStopper, setSmtpStopper] = useState<SmtpStopperStatus | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNewSegmentModal(false);
        setInspectingSegment(null);
        setShowEnrollModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadSegments = async () => {
    try {
      const res = await fetchJson<{ segments: CustomerSegment[] }>('/campaigns/segments');
      setSegments(res.segments || []);
    } catch (e) {
      console.error('Failed to load segments', e);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const res = await fetchJson<{ campaigns: Campaign[] }>('/campaigns');
      setCampaigns(res.campaigns || []);
    } catch (e) {
      console.error('Failed to load campaigns', e);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const selectTemplate = (tpl: MessageTemplate) => {
    setSelectedTemplate(tpl);
    setTplName(tpl.name);
    setTplChannel(tpl.channel);
    setTplSubject(tpl.subject || '');
    setTplBody(tpl.body);
  };

  const loadTemplates = async () => {
    try {
      const res = await fetchJson<{ templates: MessageTemplate[] }>('/campaigns/templates');
      const tpls = res.templates || [];
      setTemplates(tpls);
      if (tpls.length > 0 && !selectedTemplate) {
        selectTemplate(tpls[0]);
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    }
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
      body: JSON.stringify({ reason: 'Operator manual emergency freeze' }),
    });
    if (res?.status) setSmtpStopper(res.status);
    loadCampaigns();
  };

  const handleResume = async () => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/resume', {
      method: 'POST',
    });
    if (res?.status) setSmtpStopper(res.status);
    loadCampaigns();
  };

  const handleResetCounter = async () => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/reset-counter', {
      method: 'POST',
    });
    if (res?.status) setSmtpStopper(res.status);
  };

  const handleUpdateLimit = async (newLimit: number) => {
    const res = await fetchJson<{ status: SmtpStopperStatus }>('/campaigns/smtp-stopper/config', {
      method: 'PATCH',
      body: JSON.stringify({ daily_limit: newLimit }),
    });
    if (res?.status) setSmtpStopper(res.status);
  };

  useEffect(() => {
    loadSegments();
    loadCampaigns();
    loadTemplates();
    loadSmtpStopper();
  }, []);

  const handleCreateNewTemplate = () => {
    setSelectedTemplate(null);
    setTplName('New Custom Message Template');
    setTplChannel('WhatsApp');
    setTplSubject('');
    setTplBody(`Hello {contact_name},\n\nWe have an updated cargo dispatch schedule for {company_name} destined for {port}.\n\nCommodity: {commodity}\nTrack progression: {tracking_link}`);
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !tplBody.trim()) {
      alert('Template name and body are required.');
      return;
    }
    setIsSavingTpl(true);
    try {
      const vars = TOKEN_SUGGESTIONS.map((t) => t.token).filter((tok) => tplBody.includes(tok));
      const payload = {
        name: tplName,
        channel: tplChannel,
        subject: tplSubject,
        body: tplBody,
        variables: vars,
      };

      if (selectedTemplate) {
        const res = await fetchJson<{ template: MessageTemplate }>(`/campaigns/templates/${selectedTemplate.template_id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSelectedTemplate(res.template);
        alert('Template updated successfully!');
      } else {
        const res = await fetchJson<{ template: MessageTemplate }>('/campaigns/templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSelectedTemplate(res.template);
        alert('Template created successfully!');
      }
      loadTemplates();
    } catch (err: any) {
      alert('Failed to save template: ' + err.message);
    } finally {
      setIsSavingTpl(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await fetchJson(`/campaigns/templates/${templateId}`, { method: 'DELETE' });
      setSelectedTemplate(null);
      loadTemplates();
    } catch (err: any) {
      alert('Failed to delete template: ' + err.message);
    }
  };

  const insertTokenIntoDraft = (token: string) => {
    if (!textareaRef.current) {
      setTplBody((prev) => prev + ' ' + token);
      return;
    }
    const elem = textareaRef.current;
    const start = elem.selectionStart;
    const end = elem.selectionEnd;
    const nextBody = tplBody.substring(0, start) + token + tplBody.substring(end);
    setTplBody(nextBody);
    setTimeout(() => {
      elem.focus();
      elem.setSelectionRange(start + token.length, start + token.length);
    }, 50);

    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const countries = newSegmentForm.countries.split(',').map((c) => c.trim()).filter(Boolean);
      const tags = newSegmentForm.tags.split(',').map((t) => t.trim()).filter(Boolean);

      await fetchJson('/campaigns/segments', {
        method: 'POST',
        body: JSON.stringify({
          name: newSegmentForm.name,
          description: newSegmentForm.description,
          lead_type: newSegmentForm.lead_type,
          countries,
          min_score: Number(newSegmentForm.min_score),
          tags,
        }),
      });

      setShowNewSegmentModal(false);
      setNewSegmentForm({
        name: '',
        description: '',
        lead_type: 'importer',
        countries: 'United Arab Emirates, Saudi Arabia',
        min_score: 50,
        tags: 'High Volume, Commercial',
      });
      loadSegments();
    } catch (err: any) {
      alert('Error creating segment: ' + err.message);
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this audience segment?')) return;
    try {
      await fetchJson(`/campaigns/segments/${segmentId}`, { method: 'DELETE' });
      loadSegments();
    } catch (err: any) {
      alert('Failed to delete segment: ' + err.message);
    }
  };

  const inspectSegmentLeads = async (seg: CustomerSegment) => {
    setInspectingSegment(seg);
    setLoadingLeads(true);
    try {
      const res = await fetchJson<{ leads: any[]; total: number }>(`/campaigns/segments/${seg.segment_id}/leads`);
      setInspectLeads(res.leads || []);
    } catch (e) {
      console.error('Failed to load leads for segment', e);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardData.name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    try {
      const countries = wizardData.target_countries.split(',').map((c) => c.trim()).filter(Boolean);
      const seg = segments.find((s) => s.segment_id === wizardData.segment_id);
      const initialEnrollCount = seg?.member_count || 35;

      await fetchJson<{ campaign: Campaign }>('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: wizardData.name,
          channel: wizardData.channel,
          segment_id: wizardData.segment_id,
          target_commodity: wizardData.target_commodity,
          target_countries: countries,
          template_subject: wizardData.template_subject,
          template_body: wizardData.template_body,
          enrolled_leads_count: initialEnrollCount,
          status: 'Active',
        }),
      });

      alert(`Campaign "${wizardData.name}" launched successfully! Enrolled ${initialEnrollCount} leads.`);
      loadCampaigns();
      setActiveTab('campaigns');
    } catch (err: any) {
      alert('Error launching campaign: ' + err.message);
    }
  };

  const handleBroadcast = async (campaignId: string) => {
    setBroadcastingId(campaignId);
    try {
      const res = await fetchJson<{ success: boolean; message: string; stopper_status?: SmtpStopperStatus }>(
        `/campaigns/${campaignId}/broadcast`,
        { method: 'POST' }
      );
      alert(res.message);
      if (res.stopper_status) setSmtpStopper(res.stopper_status);
      loadCampaigns();
    } catch (err: any) {
      alert('Broadcast halted: ' + err.message);
      loadSmtpStopper();
      loadCampaigns();
    } finally {
      setBroadcastingId(null);
    }
  };

  const toggleCampaignStatus = async (c: Campaign) => {
    const nextStatus = c.status === 'Active' ? 'Paused' : 'Active';
    try {
      await fetchJson(`/campaigns/${c.campaign_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      loadCampaigns();
    } catch (err: any) {
      alert('Failed to update campaign status: ' + err.message);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await fetchJson(`/campaigns/${campaignId}`, { method: 'DELETE' });
      loadCampaigns();
    } catch (err: any) {
      alert('Failed to delete campaign: ' + err.message);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaignForEnroll) return;
    setEnrolling(true);
    try {
      const res = await fetchJson<{ message: string }>(`/campaigns/${activeCampaignForEnroll.campaign_id}/enroll`, {
        method: 'POST',
        body: JSON.stringify({
          country: enrollForm.country || undefined,
          lead_type: enrollForm.lead_type || undefined,
          segment_id: enrollForm.segment_id || undefined,
        }),
      });
      alert(res.message || 'Leads enrolled successfully!');
      setShowEnrollModal(false);
      loadCampaigns();
    } catch (err: any) {
      alert('Error enrolling leads: ' + err.message);
    } finally {
      setEnrolling(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    segments,
    showNewSegmentModal,
    setShowNewSegmentModal,
    inspectingSegment,
    setInspectingSegment,
    inspectLeads,
    loadingLeads,
    newSegmentForm,
    setNewSegmentForm,
    campaigns,
    loadingCampaigns,
    broadcastingId,
    templates,
    filterChannel,
    setFilterChannel,
    selectedTemplate,
    tplName,
    setTplName,
    tplChannel,
    setTplChannel,
    tplSubject,
    setTplSubject,
    tplBody,
    setTplBody,
    isSavingTpl,
    copiedToken,
    textareaRef,
    selectedSampleIndex,
    setSelectedSampleIndex,
    wizardData,
    setWizardData,
    showEnrollModal,
    setShowEnrollModal,
    activeCampaignForEnroll,
    setActiveCampaignForEnroll,
    enrollForm,
    setEnrollForm,
    enrolling,
    smtpStopper,
    handleHardBreak,
    handleResume,
    handleResetCounter,
    handleUpdateLimit,
    selectTemplate,
    handleCreateNewTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    insertTokenIntoDraft,
    handleCreateSegment,
    handleDeleteSegment,
    inspectSegmentLeads,
    handleLaunchCampaign,
    handleBroadcast,
    toggleCampaignStatus,
    handleDeleteCampaign,
    handleEnrollSubmit,
  };
}
