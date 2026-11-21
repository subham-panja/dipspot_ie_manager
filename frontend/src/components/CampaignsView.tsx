'use client';

import React, { useState, useEffect, useRef } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
  Megaphone,
  Plus,
  Send,
  Users,
  Eye,
  MessageSquare,
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Mail,
  Phone,
  Layers,
  Filter,
  X,
  Sparkles,
  ExternalLink,
  Target,
  FileCode,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Save,
  Tag,
  ArrowRight,
  ShieldCheck,
  Globe,
  Settings,
  Sliders,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Search,
  UserCheck,
  Clock,
  AlertOctagon,
} from 'lucide-react';
import SmtpStopperBanner, { SmtpStopperStatus } from './campaigns/SmtpStopperBanner';
import OmnichannelInboxView from './campaigns/OmnichannelInboxView';
import CadencesView from './campaigns/CadencesView';

interface Campaign {
  campaign_id: string;
  name: string;
  channel: string;
  status: 'Active' | 'Draft' | 'Paused' | 'Completed';
  target_commodity: string;
  target_countries: string[];
  template_subject?: string;
  template_body?: string;
  segment_id?: string;
  enrolled_leads_count: number;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  bounced_count?: number;
  interested_count?: number;
  conversions_count: number;
  last_dispatched_at?: string;
  created_at: string;
}

interface CustomerSegment {
  segment_id: string;
  name: string;
  description: string;
  lead_type: string;
  countries: string[];
  min_score: number;
  tags: string[];
  member_count?: number;
  created_at: string;
}

interface MessageTemplate {
  template_id: string;
  name: string;
  channel: 'Email' | 'WhatsApp' | 'SMS';
  subject?: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

const SAMPLE_CUSTOMERS = [
  {
    label: 'Al-Dhiyafa Foodstuff LLC (UAE Importer)',
    data: {
      company_name: 'Al-Dhiyafa Foodstuff Trading LLC',
      contact_name: 'Tariq Mansoor',
      commodity: 'IR-64 Parboiled Rice 5% Broken',
      country: 'United Arab Emirates',
      port: 'Jebel Ali Port (AEJEA)',
      tracking_link: 'https://tradepulse.exim/track/TRK-2026-8921',
      inquiry_notes: 'Requires 10 x 20ft FCL monthly in 50kg PP bags',
    },
  },
  {
    label: 'Gulf Grains Consortium (Saudi Importer)',
    data: {
      company_name: 'Gulf Grains & Agri Commodities Ltd',
      contact_name: 'Sheikh Khalid Al-Otaibi',
      commodity: '1121 Steam Basmati Rice',
      country: 'Saudi Arabia',
      port: 'King Abdulaziz Port, Dammam (SADMM)',
      tracking_link: 'https://tradepulse.exim/track/TRK-2026-9044',
      inquiry_notes: 'Urgent spot offer requested for 500 MT FOB',
    },
  },
  {
    label: 'Burdwan Golden Agro (Indian Supplier)',
    data: {
      company_name: 'Burdwan Golden Mills Pvt Ltd',
      contact_name: 'Pranab Mukherjee',
      commodity: 'Swarna Parboiled Grain',
      country: 'India',
      port: 'Syama Prasad Mookerjee Port, Kolkata (INCCU)',
      tracking_link: 'https://tradepulse.exim/track/TRK-2026-7811',
      inquiry_notes: 'Ready inventory 800 MT sortex cleaned',
    },
  },
];

const TOKEN_SUGGESTIONS = [
  { token: '{company_name}', desc: 'Company or Supplier Name' },
  { token: '{contact_name}', desc: 'Key Decision Maker' },
  { token: '{commodity}', desc: 'Target Commodity or Spec' },
  { token: '{country}', desc: 'Destination or Origin Country' },
  { token: '{port}', desc: 'Discharge / Loading Port' },
  { token: '{tracking_link}', desc: 'Live Public Cargo Tracker URL' },
  { token: '{inquiry_notes}', desc: 'Specific Trade Notes' },
];

export default function CampaignsView({
  initialTab = 'campaigns'
}: {
  initialTab?: 'segments' | 'campaigns' | 'wizard' | 'templates' | 'inbox' | 'cadences'
}) {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  // Master Tab: 'segments' | 'campaigns' | 'wizard' | 'templates' | 'inbox' | 'cadences'
  const [activeTab, setActiveTab] = useState<'segments' | 'campaigns' | 'wizard' | 'templates' | 'inbox' | 'cadences'>(initialTab);

  // Segments state
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [showNewSegmentModal, setShowNewSegmentModal] = useState(false);
  const [inspectingSegment, setInspectingSegment] = useState<CustomerSegment | null>(null);
  const [inspectLeads, setInspectLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // New Segment Form
  const [newSegmentForm, setNewSegmentForm] = useState({
    name: '',
    description: '',
    lead_type: 'importer',
    countries: 'United Arab Emirates, Saudi Arabia',
    min_score: 50,
    tags: 'High Volume, Commercial',
  });

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<'All' | 'Active' | 'Draft' | 'Paused'>('All');
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  // Template Engine state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  // Template Form Editing
  const [tplName, setTplName] = useState('');
  const [tplChannel, setTplChannel] = useState<'Email' | 'WhatsApp' | 'SMS'>('Email');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [isSavingTpl, setIsSavingTpl] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview Sample
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  // Wizard / Create Campaign Form
  const [wizardData, setWizardData] = useState({
    name: '',
    channel: 'Email',
    segment_id: '',
    target_commodity: 'IR-64 Parboiled Rice 5% Broken',
    target_countries: 'United Arab Emirates, Saudi Arabia',
    template_subject: 'Spot Commercial Offer: Certified {commodity} CIF {port}',
    template_body: `Dear Sourcing Director at {company_name},

We are direct producers and exporters of high-grade {commodity}.

Immediate container shipment and SGS quality inspection available for destinations in {country}.

Current Indicative Offer:
- Commodity: {commodity}
- Destination Port: {port}
- Packing: Export standard PP bags with custom brand printing
- Certification: Phytosanitary & SGS Certificate of Origin

Would you like us to issue a formal Proforma Invoice and spec sheet?

Best regards,
Commercial Export Desk`,
  });

  // Enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [activeCampaignForEnroll, setActiveCampaignForEnroll] = useState<Campaign | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    country: '',
    lead_type: 'importer',
    segment_id: '',
  });
  const [enrolling, setEnrolling] = useState(false);

  // Universal Escape key listener closes all modals
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

  // Loaders
  const loadSegments = async () => {
    try {
      setLoadingSegments(true);
      const res = await fetchJson<{ segments: CustomerSegment[] }>('/campaigns/segments');
      setSegments(res.segments || []);
    } catch (e) {
      console.error('Failed to load segments', e);
    } finally {
      setLoadingSegments(false);
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

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetchJson<{ templates: MessageTemplate[] }>('/campaigns/templates');
      const tpls = res.templates || [];
      setTemplates(tpls);
      if (tpls.length > 0 && !selectedTemplate) {
        selectTemplate(tpls[0]);
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // SMTP Stopper State & Actions
  const [smtpStopper, setSmtpStopper] = useState<SmtpStopperStatus | null>(null);

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

  const selectTemplate = (tpl: MessageTemplate) => {
    setSelectedTemplate(tpl);
    setTplName(tpl.name);
    setTplChannel(tpl.channel);
    setTplSubject(tpl.subject || '');
    setTplBody(tpl.body);
  };

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

  // Live hydration
  const currentSample = SAMPLE_CUSTOMERS[selectedSampleIndex]?.data || SAMPLE_CUSTOMERS[0].data;
  const hydratedBody = tplBody.replace(/\{(\w+)\}/g, (match, p1) => {
    return (currentSample as any)[p1] !== undefined ? (currentSample as any)[p1] : match;
  });
  const hydratedSubject = tplSubject.replace(/\{(\w+)\}/g, (match, p1) => {
    return (currentSample as any)[p1] !== undefined ? (currentSample as any)[p1] : match;
  });

  // Create Segment
  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const countries = newSegmentForm.countries
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const tags = newSegmentForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

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

  // Launch Campaign from Wizard
  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardData.name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    try {
      const countries = wizardData.target_countries
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      // Find segment member count if chosen
      const seg = segments.find((s) => s.segment_id === wizardData.segment_id);
      const initialEnrollCount = seg?.member_count || 35;

      const res = await fetchJson<{ campaign: Campaign }>('/campaigns', {
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

  // Live Broadcast (Gmail SMTP Simulation with Stopper Protection)
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

  // Metrics summary
  const totalEnrolled = campaigns.reduce((acc, c) => acc + (c.enrolled_leads_count || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
  const totalReplied = campaigns.reduce((acc, c) => acc + (c.replied_count || 0), 0);
  const totalBounced = campaigns.reduce((acc, c) => acc + (c.bounced_count || 0), 0);
  const totalInterested = campaigns.reduce((acc, c) => acc + (c.interested_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 62;
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 22;

  const filteredCampaigns = campaigns.filter(
    (c) => campaignFilter === 'All' || c.status.toLowerCase() === campaignFilter.toLowerCase()
  );

  const filteredTemplates = templates.filter(
    (t) => filterChannel === 'All' || t.channel.toLowerCase() === filterChannel.toLowerCase()
  );

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Enterprise Outreach Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Enterprise Sequences • Audience Segments & SMTP</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Megaphone className="w-6 h-6 text-purple-400" />
            Campaign Outreach & Audience Suite
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Segment global buyers & suppliers, execute Gmail SMTP sequences, and draft omnichannel WhatsApp and Email templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openSettings('smtp')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            title="Configure Gmail SMTP in Settings"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gmail SMTP Config</span>
          </button>

          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Gmail SMTP Quota & Emergency Hard-Break Stopper Banner */}
      <SmtpStopperBanner
        status={smtpStopper}
        onHardBreak={handleHardBreak}
        onResume={handleResume}
        onResetCounter={handleResetCounter}
        onUpdateLimit={handleUpdateLimit}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Outreach Hub"
        subtitle="Sequences & Audience"
        items={[
          {
            id: 'campaigns',
            label: 'Active Sequences',
            icon: <BarChart3 className="w-4 h-4" />,
            badge: campaigns.length,
            href: '/campaigns',
            onClick: () => setActiveTab('campaigns'),
            active: activeTab === 'campaigns',
            desc: 'Live outbound outreach',
          },
          {
            id: 'inbox',
            label: 'Omnichannel AI Inbox',
            icon: <MessageSquare className="w-4 h-4 text-purple-400" />,
            href: '/campaigns/inbox',
            onClick: () => setActiveTab('inbox'),
            active: activeTab === 'inbox',
            desc: 'Centralized Gmail & WhatsApp CMS',
          },
          {
            id: 'cadences',
            label: 'Follow-Up Cadences',
            icon: <Clock className="w-4 h-4 text-emerald-400" />,
            href: '/campaigns/cadences',
            onClick: () => setActiveTab('cadences'),
            active: activeTab === 'cadences',
            desc: 'Multi-touch automated sequencing',
          },
          {
            id: 'segments',
            label: 'Audience Segments',
            icon: <Users className="w-4 h-4" />,
            badge: segments.length,
            href: '/campaigns/segments',
            onClick: () => setActiveTab('segments'),
            active: activeTab === 'segments',
            desc: 'Target buyer groups',
          },
          {
            id: 'wizard',
            label: 'Campaign Builder',
            icon: <Sparkles className="w-4 h-4 text-purple-400" />,
            href: '/campaigns/wizard',
            onClick: () => setActiveTab('wizard'),
            active: activeTab === 'wizard',
            desc: 'Draft & launch campaign',
          },
          {
            id: 'templates',
            label: 'Message Templates',
            icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
            badge: templates.length,
            href: '/campaigns/templates',
            active: activeTab === 'templates',
            desc: 'Multi-channel message drafts',
          },
          {
            id: 'smtp',
            label: 'Email SMTP Gateway',
            icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
            onClick: () => openSettings('smtp'),
            active: false,
            desc: 'Configure Gmail SMTP',
          },
        ]}
        activeId={activeTab}
      >

      {/* TAB: OMNICHANNEL AI INBOX */}
      {activeTab === 'inbox' && (
        <OmnichannelInboxView isLight={isLight} accentClasses={accentClasses} />
      )}

      {/* TAB: FOLLOW-UP CADENCES */}
      {activeTab === 'cadences' && (
        <CadencesView isLight={isLight} accentClasses={accentClasses} />
      )}

      {/* TAB 1: ACTIVE CAMPAIGNS HUB */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Total Campaigns</span>
              <div className="text-xl font-bold text-white mt-1">{campaigns.length}</div>
              <span className="text-[10px] text-slate-500">Across All Channels</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Dispatched (SMTP)</span>
              <div className="text-xl font-bold text-blue-400 mt-1">{totalSent}</div>
              <span className="text-[10px] text-slate-500">Live Delivery</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Opened</span>
              <div className="text-xl font-bold text-purple-400 mt-1">{totalOpened} <span className="text-xs font-normal text-slate-400">({avgOpenRate}%)</span></div>
              <span className="text-[10px] text-slate-500">Verified Read</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Direct Replied</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{totalReplied} <span className="text-xs font-normal text-slate-400">({avgReplyRate}%)</span></div>
              <span className="text-[10px] text-slate-500">Qualified Inbound</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Interested</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">{totalInterested}</div>
              <span className="text-[10px] text-slate-500">High Buy Intent</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Bounced</span>
              <div className="text-xl font-bold text-rose-400 mt-1">{totalBounced}</div>
              <span className="text-[10px] text-slate-500">Suppressed</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['All', 'Active', 'Draft', 'Paused'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setCampaignFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    campaignFilter === st
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400">
              Showing {filteredCampaigns.length} campaigns
            </div>
          </div>

          {/* Campaigns Grid */}
          {loadingCampaigns ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No campaigns found in this view</p>
              <p className="text-xs text-slate-500 mt-1">Launch your first automated outreach campaign using the builder wizard.</p>
              <button
                onClick={() => setActiveTab('wizard')}
                className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg}`}
              >
                Launch New Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCampaigns.map((c) => {
                const isEmail = c.channel.toLowerCase() === 'email';
                const isWA = c.channel.toLowerCase() === 'whatsapp';
                const isBroadcasting = broadcastingId === c.campaign_id;

                return (
                  <div
                    key={c.campaign_id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase flex items-center gap-1 ${
                              isEmail
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : isWA
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {isEmail && <Mail className="w-3 h-3" />}
                            {isWA && <Phone className="w-3 h-3" />}
                            {c.channel}
                          </span>
                          {isEmail && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                              Gmail SMTP
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">{c.campaign_id}</span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                            c.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : c.status === 'Paused'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      {/* Title & Specs */}
                      <h3 className={`text-base font-bold mt-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {c.name}
                      </h3>

                      <div className="mt-2 text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">Commodity: <strong className="text-slate-200">{c.target_commodity}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">Geographies: {c.target_countries?.join(', ') || 'Global'}</span>
                        </div>
                      </div>

                      {/* Performance Funnel Cards */}
                      <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-1.5 pt-3 border-t border-slate-800/60 text-center">
                        <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase font-mono block">Enrolled</span>
                          <span className="text-xs font-bold text-white">{c.enrolled_leads_count || 0}</span>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase font-mono block">Sent</span>
                          <span className="text-xs font-bold text-blue-400">{c.sent_count || 0}</span>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase font-mono block">Opened</span>
                          <span className="text-xs font-bold text-purple-400">{c.opened_count || 0}</span>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase font-mono block">Replied</span>
                          <span className="text-xs font-bold text-emerald-400">{c.replied_count || 0}</span>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase font-mono block">Interested</span>
                          <span className="text-xs font-bold text-cyan-400">{c.interested_count ?? Math.round((c.replied_count || 0) * 0.65)}</span>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 uppercase font-mono block">Bounced</span>
                          <span className="text-xs font-bold text-rose-400">{c.bounced_count ?? Math.max(0, Math.round((c.sent_count || 0) * 0.04))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveCampaignForEnroll(c);
                            setShowEnrollModal(true);
                          }}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          + Enroll Leads
                        </button>

                        <button
                          onClick={() => toggleCampaignStatus(c)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
                        >
                          {c.status === 'Active' ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                          {c.status === 'Active' ? 'Pause' : 'Resume'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBroadcast(c.campaign_id)}
                          disabled={isBroadcasting}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1 disabled:opacity-50"
                          title="Simulate immediate broadcast through Gmail SMTP"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isBroadcasting ? 'Sending...' : 'Broadcast'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCampaign(c.campaign_id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIENCE SEGMENTS & CUSTOMER GROUPS */}
      {activeTab === 'segments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Audience Segments & Targeted Customer Groups
              </h2>
              <p className="text-xs text-slate-400">
                Create and filter dynamic customer groupings based on import tonnage, bank qualification score, and target destinations.
              </p>
            </div>

            <button
              onClick={() => setShowNewSegmentModal(true)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5 cursor-pointer`}
            >
              <Plus className="w-4 h-4" />
              <span>Create Customer Segment</span>
            </button>
          </div>

          {/* Segment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map((seg) => (
              <div
                key={seg.segment_id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                      {seg.segment_id}
                    </span>
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {seg.member_count ?? 0} Matched Leads
                    </span>
                  </div>

                  <h3 className={`text-base font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {seg.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{seg.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {seg.tags?.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5 text-purple-400" />
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Lead Type:</span>
                      <strong className="text-slate-200 capitalize">
                        {seg.lead_type === 'wb_mill' ? 'Domestic Supplier' : 'Global Importer / Buyer'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Geographies:</span>
                      <span className="text-slate-300 truncate max-w-[200px]">
                        {seg.countries?.length > 0 ? seg.countries.join(', ') : 'All Countries'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Priority Score:</span>
                      <span className="font-mono text-emerald-400 font-bold">{seg.min_score}+</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <button
                    onClick={() => inspectSegmentLeads(seg)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Customer List</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setWizardData((prev) => ({
                          ...prev,
                          name: `Outreach to ${seg.name}`,
                          segment_id: seg.segment_id,
                          target_countries: seg.countries?.join(', ') || 'Global',
                        }));
                        setActiveTab('wizard');
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Launch Campaign</span>
                    </button>

                    <button
                      onClick={() => handleDeleteSegment(seg.segment_id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CAMPAIGN CREATION WIZARD */}
      {activeTab === 'wizard' && (
        <div className={`p-6 rounded-2xl border max-w-4xl mx-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="pb-4 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Automated Pipeline Outreach
              </span>
              <h2 className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Create Enterprise Campaign
              </h2>
              <p className="text-xs text-slate-400">
                Draft commercial offers with dynamic tokens and dispatch to targeted customer segments.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Gmail SMTP Ready
              </span>
            </div>
          </div>

          <form onSubmit={handleLaunchCampaign} className="space-y-4 mt-5 text-xs">
            {/* Step 1: Campaign Identity & Target Audience */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white block uppercase tracking-wider text-slate-400">
                1. Campaign Details & Audience Group
              </span>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Middle East Basmati & Non-Basmati Commercial Offer"
                  value={wizardData.name}
                  onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Audience Segment</label>
                  <select
                    value={wizardData.segment_id}
                    onChange={(e) => setWizardData({ ...wizardData, segment_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  >
                    <option value="">Custom Outreach (No Saved Segment)</option>
                    {segments.map((s) => (
                      <option key={s.segment_id} value={s.segment_id}>
                        {s.name} ({s.member_count ?? 0} leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Outreach Channel</label>
                  <select
                    value={wizardData.channel}
                    onChange={(e) => setWizardData({ ...wizardData, channel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  >
                    <option value="Email">Email (via Gmail SMTP Gateway)</option>
                    <option value="WhatsApp">WhatsApp (Official Meta Business API - Upcoming)</option>
                    <option value="SMS">SMS Gateway (Twilio / Fast2SMS - Upcoming)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Commodity Spec</label>
                  <input
                    type="text"
                    required
                    value={wizardData.target_commodity}
                    onChange={(e) => setWizardData({ ...wizardData, target_commodity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Countries (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={wizardData.target_countries}
                    onChange={(e) => setWizardData({ ...wizardData, target_countries: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Content & Merge Tokens */}
            <div className="space-y-3 pt-3 border-t border-slate-800/60">
              <span className="text-xs font-bold text-white block uppercase tracking-wider text-slate-400">
                2. Commercial Offer Draft & Merge Variables
              </span>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject Line</label>
                <input
                  type="text"
                  value={wizardData.template_subject}
                  onChange={(e) => setWizardData({ ...wizardData, template_subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Message Body</label>
                  <span className="text-[11px] text-slate-500">Insert dynamic variables:</span>
                </div>

                {/* Token Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TOKEN_SUGGESTIONS.map((tok) => (
                    <button
                      key={tok.token}
                      type="button"
                      onClick={() =>
                        setWizardData((prev) => ({
                          ...prev,
                          template_body: prev.template_body + ' ' + tok.token,
                        }))
                      }
                      className="text-[11px] font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded cursor-pointer transition"
                      title={tok.desc}
                    >
                      + {tok.token}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={8}
                  value={wizardData.template_body}
                  onChange={(e) => setWizardData({ ...wizardData, template_body: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-lg outline-none focus:border-emerald-500 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Launch Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className="text-slate-400 hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl text-white font-semibold ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-2`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Campaign & Auto-Enroll Leads</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MESSAGE TEMPLATE ENGINE & PHONE SIMULATOR */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Omnichannel Message Template Studio
              </h2>
              <p className="text-xs text-slate-400">
                Draft responsive templates with curly brace variable replacement, test against real customer dossiers, and preview on mobile devices.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNewTemplate}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} shadow-md transition flex items-center gap-1.5`}
              >
                <Plus className="w-4 h-4" />
                <span>New Template</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Template List */}
            <div className={`lg:col-span-3 p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Templates</span>
                <span className="text-[11px] font-mono text-slate-500">{filteredTemplates.length} Saved</span>
              </div>

              {/* Channel filter pills */}
              <div className="flex gap-1">
                {(['All', 'Email', 'WhatsApp', 'SMS'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setFilterChannel(ch)}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition ${
                      filterChannel === ch
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplate?.template_id === tpl.template_id;
                  return (
                    <div
                      key={tpl.template_id}
                      onClick={() => selectTemplate(tpl)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 shadow-sm'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tpl.channel}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{tpl.template_id}</span>
                      </div>
                      <h4 className="font-semibold text-white mt-1.5 line-clamp-1">{tpl.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tpl.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle Column: Editor */}
            <div className={`lg:col-span-5 p-5 rounded-2xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Template Editor</span>
                {selectedTemplate && (
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate.template_id)}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Template Name</label>
                  <input
                    type="text"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Target Channel</label>
                    <select
                      value={tplChannel}
                      onChange={(e) => setTplChannel(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                    >
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Subject (Email Only)</label>
                    <input
                      type="text"
                      disabled={tplChannel !== 'Email'}
                      value={tplSubject}
                      onChange={(e) => setTplSubject(e.target.value)}
                      placeholder={tplChannel === 'Email' ? 'Subject with {tokens}' : 'N/A for SMS/WhatsApp'}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500 disabled:opacity-40"
                    />
                  </div>
                </div>

                {/* Dynamic Token Palette */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-300 font-semibold">Click Token to Insert into Draft:</span>
                    {copiedToken && <span className="text-[10px] text-emerald-400 font-bold">Inserted!</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TOKEN_SUGGESTIONS.map((tok) => (
                      <button
                        key={tok.token}
                        type="button"
                        onClick={() => insertTokenIntoDraft(tok.token)}
                        className="text-[11px] font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tok.token}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Template Content Draft</label>
                  <textarea
                    ref={textareaRef}
                    rows={10}
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-lg outline-none focus:border-purple-500 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSavingTpl}
                    className={`px-5 py-2 rounded-xl text-white font-semibold ${accentClasses.bg} shadow-md transition flex items-center gap-2`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingTpl ? 'Saving...' : 'Save Template'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Device Simulator & Live Token Hydration */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  Live Device Preview
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                  Real-time Hydration
                </span>
              </div>

              {/* Sample Customer Switcher */}
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                  Hydrate Variables with Sample Lead:
                </label>
                <select
                  value={selectedSampleIndex}
                  onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-2.5 py-1.5 rounded-lg outline-none focus:border-purple-500"
                >
                  {SAMPLE_CUSTOMERS.map((s, idx) => (
                    <option key={idx} value={idx}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Device Frame */}
              <div className="mx-auto max-w-[340px] rounded-[32px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
                {/* Phone Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />

                {/* Screen Header */}
                <div className="p-2.5 rounded-t-xl bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-[10px]">
                      TP
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-[11px] truncate">{currentSample.company_name}</div>
                      <div className="text-[9px] text-slate-400">{currentSample.contact_name} &bull; {currentSample.country}</div>
                    </div>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold">Online</span>
                </div>

                {/* Screen Content */}
                <div className="p-3 bg-slate-900/60 min-h-[300px] max-h-[380px] overflow-y-auto space-y-2 text-xs">
                  {tplChannel === 'Email' && hydratedSubject && (
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-white font-semibold text-[11px]">
                      Subject: {hydratedSubject}
                    </div>
                  )}

                  <div className={`p-3 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                    tplChannel === 'WhatsApp'
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-100 rounded-tl-none'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    {hydratedBody}
                  </div>
                </div>

                {/* Footer simulation */}
                <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
                  Channel: {tplChannel} Gateway
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </PageLeftNav>

      {/* MODAL: CREATE NEW AUDIENCE SEGMENT */}
      {showNewSegmentModal && (
        <div
          onClick={() => setShowNewSegmentModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Users className="w-5 h-5 text-purple-400" />
                Create Targeted Audience Segment
              </h3>
              <button onClick={() => setShowNewSegmentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSegment} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Segment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GCC Top Tier Basmati Buyers"
                  value={newSegmentForm.name}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description / Audience Thesis</label>
                <input
                  type="text"
                  placeholder="e.g. Importers with verified bank credit in Dubai, Riyadh, and Doha"
                  value={newSegmentForm.description}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Directory Scope</label>
                  <select
                    value={newSegmentForm.lead_type}
                    onChange={(e) => setNewSegmentForm({ ...newSegmentForm, lead_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  >
                    <option value="importer">Global Importers & Buyers</option>
                    <option value="wb_mill">Verified Suppliers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Priority Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSegmentForm.min_score}
                    onChange={(e) => setNewSegmentForm({ ...newSegmentForm, min_score: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Geographies (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. United Arab Emirates, Saudi Arabia, Qatar"
                  value={newSegmentForm.countries}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, countries: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Audience Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. High Volume, Wholesale, Direct Supplier"
                  value={newSegmentForm.tags}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, tags: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowNewSegmentModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClasses.bg} shadow-md transition`}
                >
                  Save Segment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT SEGMENT LEADS DRAWER */}
      {inspectingSegment && (
        <div
          onClick={() => setInspectingSegment(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {inspectingSegment.segment_id}
                  </span>
                  <h3 className={`text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {inspectingSegment.name}
                  </h3>
                  <p className="text-xs text-slate-400">{inspectingSegment.description}</p>
                </div>
                <button onClick={() => setInspectingSegment(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Filtered Members ({inspectLeads.length})</span>
                  <span>Minimum Score: {inspectingSegment.min_score}+</span>
                </div>

                {loadingLeads ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading members...</div>
                ) : inspectLeads.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    No leads match this segment criteria yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {inspectLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">{lead.company_name}</div>
                          <div className="text-[11px] text-slate-400">
                            {lead.contact_person || 'Executive Buyer'} &bull; {lead.country}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Score: {lead.priority_score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 flex justify-end">
              <button
                onClick={() => setInspectingSegment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL LEADS INTO CAMPAIGN */}
      {showEnrollModal && activeCampaignForEnroll && (
        <div
          onClick={() => setShowEnrollModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Enroll Leads into {activeCampaignForEnroll.name}
              </h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Country Filter</label>
                <input
                  type="text"
                  placeholder="e.g. United Arab Emirates (leave blank for all)"
                  value={enrollForm.country}
                  onChange={(e) => setEnrollForm({ ...enrollForm, country: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Directory Scope</label>
                <select
                  value={enrollForm.lead_type}
                  onChange={(e) => setEnrollForm({ ...enrollForm, lead_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                >
                  <option value="importer">Global Importers & Buyers</option>
                  <option value="wb_mill">Verified Domestic Suppliers</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClasses.bg} shadow-md transition`}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Leads'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
