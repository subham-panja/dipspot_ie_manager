'use client';

import React, { useState, useEffect, useRef } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import { fetchJson } from '@/lib/api';
import {
  Smartphone,
  Mail,
  MessageSquare,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  ArrowRight,
  ArrowLeft,
  Tag,
  ChevronDown,
  RefreshCw,
  FileText,
  ShieldCheck,
  Eye,
  X,
  Inbox,
  Check,
  BarChart3,
  Users,
  Settings2,
  Building2,
  Globe,
  Sliders,
  Share2
} from 'lucide-react';

export interface MessageTemplate {
  _id?: string;
  template_id: string;
  name: string;
  category?: string;
  channel: 'Email' | 'WhatsApp' | 'SMS';
  subject?: string;
  body: string;
  variables: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DispatchRecord {
  _id?: string;
  dispatch_id: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  status: string;
  mode?: string;
  host?: string;
  port?: number;
  segments?: number;
  chars?: number;
  sent_at: string;
}

interface LeadSample {
  company_name: string;
  contact_person: string;
  commodity: string;
  country: string;
  nearest_port: string;
  emails?: string;
  phones?: string;
}

const TOKEN_SUGGESTIONS = [
  { token: '{company_name}', desc: 'Company or Buyer Name' },
  { token: '{contact_name}', desc: 'Key Decision Maker' },
  { token: '{commodity}', desc: 'Target Commodity Spec' },
  { token: '{country}', desc: 'Destination Country' },
  { token: '{port}', desc: 'Discharge / Loading Port' },
  { token: '{quantity_mt}', desc: 'Consignment Volume in MT' },
  { token: '{price_per_mt}', desc: 'Indicative Price per MT' },
  { token: '{incoterm}', desc: 'Incoterm (CIF / FOB)' },
  { token: '{payment_terms}', desc: 'Banking Terms (100% L/C at Sight)' },
  { token: '{tracking_link}', desc: 'Public Cargo Tracker URL' },
  { token: '{today_date}', desc: 'Current Trade Date' },
  { token: '{validity_days}', desc: 'Quote Validity Window' },
];

const PREBUILT_SNIPPETS = [
  {
    label: 'Specs Table',
    snippet: '\n\nCOMMODITY SPECIFICATIONS:\n• Quality: Sortex 100% Cleaned, Silky Polished\n• Moisture: Max 14.0% | Broken Grains: Max 5.0%\n• Packing: 50kg Heavy-Duty Export PP Bags\n• Surveyor: Pre-shipment Certificate by SGS / Bureau Veritas\n',
  },
  {
    label: 'L/C Payment Clause',
    snippet: '\n\nPAYMENT & CONTRACT TERMS:\n• Payment: 100% Irrevocable Letter of Credit (L/C) at Sight from Tier-1 Bank\n• Tolerance: +/- 5% in Quantity & Credit Value (UCP 600 Art. 30b)\n• Shipment Window: 14 business days from authenticated L/C receipt\n',
  },
  {
    label: 'Tracking Portal CTA',
    snippet: '\n\nLIVE CONSIGNMENT PROGRESSION:\nYou can monitor vessel GPS positions, CFS gate-in, and B/L issuance directly at:\n{tracking_link}\n',
  },
  {
    label: 'Quality Guarantee',
    snippet: '\n\nAPEDA & EXPORT ACCREDITATION:\nAll export lots conform strictly to APEDA, DGFT, and ISO 22000 quality standards with phytosanitary and fumigation quarantine clearance.\n',
  },
];

const DEFAULT_SAMPLE_LEAD: LeadSample = {
  company_name: 'Al-Dhiyafa Foodstuff Trading LLC',
  contact_person: 'Tariq Mansoor',
  commodity: 'IR-64 Parboiled Rice 5% Broken',
  country: 'United Arab Emirates',
  nearest_port: 'Jebel Ali Port (AEJEA)',
  emails: 'procurement@al-dhiyafa-uae.com',
  phones: '+971 4 223 8810',
};

export default function CampaignTemplatesStudioPage() {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'library' | 'studio'>('library');

  // Templates Data
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'All' | 'Email' | 'WhatsApp' | 'SMS'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Currently Editing Template in Studio
  const [activeTemplate, setActiveTemplate] = useState<MessageTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('Soft Offer');
  const [tplChannel, setTplChannel] = useState<'Email' | 'WhatsApp' | 'SMS'>('Email');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Real Database Leads for Simulation
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

  // Device Preview Type in Studio
  const [previewDevice, setPreviewDevice] = useState<'desktop_email' | 'mobile_email' | 'whatsapp' | 'sms'>('desktop_email');

  // Real Test Dispatch State
  const [testRecipient, setTestRecipient] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{
    success: boolean;
    mode: string;
    message: string;
    dispatch_id?: string;
  } | null>(null);

  // Quick Test Modal (from library view)
  const [quickTestTemplate, setQuickTestTemplate] = useState<MessageTemplate | null>(null);

  // Dispatched Outbox Log Modal
  const [showOutboxModal, setShowOutboxModal] = useState(false);
  const [outboxRecords, setOutboxRecords] = useState<DispatchRecord[]>([]);
  const [loadingOutbox, setLoadingOutbox] = useState(false);

  // SMTP Live Status Check
  const [smtpStatus, setSmtpStatus] = useState<{ host?: string; is_verified?: boolean; has_password?: boolean } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Templates, Real Leads, and SMTP status on mount
  useEffect(() => {
    loadTemplates();
    loadRealLeads();
    loadSmtpStatus();
    loadDispatches();
  }, []);

  // Universal Escape key listener
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

  const selectTemplateForStudio = (tpl: MessageTemplate) => {
    setActiveTemplate(tpl);
    setTplName(tpl.name);
    setTplCategory(tpl.category || 'Soft Offer');
    setTplChannel(tpl.channel);
    setTplSubject(tpl.subject || '');
    setTplBody(tpl.body);
    setDispatchFeedback(null);

    // Sync preview device with channel
    if (tpl.channel === 'WhatsApp') setPreviewDevice('whatsapp');
    else if (tpl.channel === 'SMS') setPreviewDevice('sms');
    else setPreviewDevice('desktop_email');

    // Default recipient from lead
    const currentLead = realLeads[selectedLeadIndex] || DEFAULT_SAMPLE_LEAD;
    setTestRecipient(tpl.channel === 'Email' ? currentLead.emails || '' : currentLead.phones || '');
  };

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
        // Update existing in MongoDB
        await fetchJson(`/campaigns/templates/${activeTemplate.template_id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        // Create new in MongoDB
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

  // Real Test Dispatch Execution
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

      // Refresh outbox log
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

  // Compute live hydrated body and subject for studio preview
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

  // Calculate SMS metrics
  const smsCharCount = hydratedBody.length;
  const smsSegments = smsCharCount <= 160 ? 1 : Math.ceil(smsCharCount / 153);

  // Filter templates for library gallery
  const categoriesList = ['All', 'Soft Offer', 'Cold Outreach', 'Shipping Update', 'L/C Advising', 'Price Revision', 'Quick Quote'];

  const filteredTemplates = templates.filter((t) => {
    if (selectedChannel !== 'All' && t.channel !== selectedChannel) return false;
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchSubj = (t.subject || '').toLowerCase().includes(q);
      const matchBody = t.body.toLowerCase().includes(q);
      const matchId = t.template_id.toLowerCase().includes(q);
      return matchName || matchSubj || matchBody || matchId;
    }
    return true;
  });

  // PageLeftNav setup
  const navItems: PageSubNavItem[] = [
    {
      id: 'campaigns',
      label: 'Active Sequences',
      icon: <BarChart3 className="w-4 h-4 text-slate-400" />,
      href: '/campaigns',
      active: false,
      desc: 'Live outbound outreach',
    },
    {
      id: 'segments',
      label: 'Audience Segments',
      icon: <Users className="w-4 h-4 text-slate-400" />,
      href: '/campaigns/segments',
      active: false,
      desc: 'Target buyer groups',
    },
    {
      id: 'wizard',
      label: 'Campaign Builder',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      href: '/campaigns/wizard',
      active: false,
      desc: 'Draft & launch campaign',
    },
    {
      id: 'templates',
      label: 'Message Templates',
      icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
      badge: templates.length,
      href: '/campaigns/templates',
      active: true,
      desc: 'Multi-channel message drafts',
    },
    {
      id: 'smtp',
      label: 'Email SMTP Gateway',
      icon: <ShieldCheck className="w-4 h-4 text-blue-400" />,
      onClick: () => openSettings('smtp'),
      active: false,
      desc: 'Configure Gmail SMTP',
    },
  ];

  return (
    <Shell>
      <PageLeftNav
        title="Outreach Hub"
        subtitle="Sequences & Audience"
        items={navItems}
        activeId="templates"
      >
        <div className="space-y-6 w-full">
          {/* Top Studio Header */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Omnichannel Template Studio
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {templates.length} Production Templates
                </span>
              </div>
              <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Smartphone className="w-6 h-6 text-emerald-400" />
                Message & Email Template Studio
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Draft, customize, and pre-test high-converting commercial offers, dispatch notices, and L/C alerts across Email, WhatsApp, and SMS.
              </p>
            </div>

            {/* Quick Actions & SMTP Live Status */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowOutboxModal(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-blue-400" />
                <span>Outbox Dispatches ({outboxRecords.length})</span>
              </button>

              <button
                onClick={handleResetDefaults}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title="Restore default industry templates"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restore Defaults</span>
              </button>

              {viewMode === 'studio' ? (
                <button
                  onClick={() => setViewMode('library')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Template Library</span>
                </button>
              ) : (
                <button
                  onClick={handleCreateNew}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} flex items-center gap-1.5 shadow-md transition`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Template</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Total Templates</span>
              <div className="text-xl font-bold text-white mt-1">{templates.length}</div>
              <span className="text-[10px] text-slate-500">Stored in Database</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Supported Channels</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">3 Channels</div>
              <span className="text-[10px] text-slate-500">Email, WhatsApp, SMS</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Real Dispatches Sent</span>
              <div className="text-xl font-bold text-blue-400 mt-1">{outboxRecords.length}</div>
              <span className="text-[10px] text-slate-500">Logged in Outbox</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Gateway Relay</span>
              <div className="text-sm font-bold text-purple-400 mt-1 flex items-center gap-1.5 truncate">
                {smtpStatus?.has_password ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Live SMTP Ready
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Sandbox Relay
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 cursor-pointer hover:underline" onClick={() => openSettings('smtp')}>
                Configure Gmail SMTP &rarr;
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODE A: TEMPLATE LIBRARY & GALLERY VIEW                                  */}
          {/* ========================================================================= */}
          {viewMode === 'library' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                }`}
              >
                {/* Channel Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {(['All', 'Email', 'WhatsApp', 'SMS'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedChannel === ch
                          ? `${accentClasses.badge} shadow-sm`
                          : isLight
                          ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ch === 'All' ? 'All Channels' : ch}
                    </button>
                  ))}
                </div>

                {/* Category Dropdown & Search */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search templates or tokens..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 pr-3 py-1.5 rounded-lg text-xs border w-48 lg:w-64 ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Template Cards Grid (Spacious 2-column or 3-column layout) */}
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading templates library...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No templates match the current filter</p>
                  <p className="text-xs text-slate-500 mt-1">Try switching channel or resetting search filters.</p>
                  <button
                    onClick={handleResetDefaults}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white"
                  >
                    Reload Default Templates
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.template_id}
                      className={`p-5 rounded-2xl border flex flex-col justify-between transition group hover:shadow-lg ${
                        isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                              tpl.channel === 'Email'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : tpl.channel === 'WhatsApp'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {tpl.channel === 'Email' && <Mail className="w-3 h-3" />}
                            {tpl.channel === 'WhatsApp' && <MessageSquare className="w-3 h-3" />}
                            {tpl.channel === 'SMS' && <Smartphone className="w-3 h-3" />}
                            {tpl.channel}
                          </span>

                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                            {tpl.category || 'General'}
                          </span>
                        </div>

                        {/* Title & Monospace ID */}
                        <h3 className={`text-sm font-bold line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {tpl.name}
                        </h3>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{tpl.template_id}</div>

                        {/* Email Subject preview if applicable */}
                        {tpl.channel === 'Email' && tpl.subject && (
                          <div className="mt-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs">
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Subject:</span>
                            <span className="text-slate-200 font-medium line-clamp-1">{tpl.subject}</span>
                          </div>
                        )}

                        {/* Body Snippet */}
                        <p className="mt-3 text-xs text-slate-400 line-clamp-4 leading-relaxed whitespace-pre-line font-sans">
                          {tpl.body}
                        </p>

                        {/* Variables Pills */}
                        {tpl.variables && tpl.variables.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1">
                            {tpl.variables.slice(0, 4).map((v) => (
                              <span key={v} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {v}
                              </span>
                            ))}
                            {tpl.variables.length > 4 && (
                              <span className="text-[9px] font-mono text-slate-500 px-1">
                                +{tpl.variables.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDuplicateTemplate(tpl)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                            title="Duplicate Template"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.template_id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition"
                            title="Delete Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQuickTestTemplate(tpl)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
                          >
                            <Send className="w-3 h-3 text-emerald-400" />
                            <span>Test</span>
                          </button>

                          <button
                            onClick={() => handleOpenStudio(tpl)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${accentClasses.btn} flex items-center gap-1 transition shadow-sm`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit in Studio</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE B: FULL-PAGE SPLIT TEMPLATE STUDIO WORKSPACE                         */}
          {/* ========================================================================= */}
          {viewMode === 'studio' && activeTemplate && (
            <div className="space-y-4">
              {/* Studio Breadcrumb & Action Toolbar */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('library')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Template Studio</span>
                      <span className="text-xs text-slate-600">/</span>
                      <span className="text-xs font-bold text-white">{tplName || 'Untitled Template'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{activeTemplate.template_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {dispatchFeedback && (
                    <div
                      className={`text-xs px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${
                        dispatchFeedback.success
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {dispatchFeedback.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span className="truncate max-w-xs">{dispatchFeedback.message}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} flex items-center gap-1.5 shadow-md transition`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
                  </button>
                </div>
              </div>

              {/* Spacious Two-Column Split Screen Studio */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* =================================================================== */}
                {/* LEFT WORKSPACE: FULL EDITOR (7 columns / ~58% width)               */}
                {/* =================================================================== */}
                <div
                  className={`lg:col-span-7 p-6 rounded-2xl border space-y-5 ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      Template Composition Studio
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">
                      Target Channel: <strong className="text-emerald-400">{tplChannel}</strong>
                    </span>
                  </div>

                  {/* Title & Category Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Template Name</label>
                      <input
                        type="text"
                        value={tplName}
                        onChange={(e) => setTplName(e.target.value)}
                        placeholder="e.g. FOB Spot Quotation (Rice & Grain)"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Commercial Category</label>
                      <select
                        value={tplCategory}
                        onChange={(e) => setTplCategory(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
                        }`}
                      >
                        {categoriesList.filter((c) => c !== 'All').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Channel Radio Tabs */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Outbound Channel</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Email', 'WhatsApp', 'SMS'] as const).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            setTplChannel(ch);
                            if (ch === 'WhatsApp') setPreviewDevice('whatsapp');
                            else if (ch === 'SMS') setPreviewDevice('sms');
                            else setPreviewDevice('desktop_email');
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                            tplChannel === ch
                              ? `${accentClasses.badge} shadow-sm font-bold`
                              : isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {ch === 'Email' && <Mail className="w-3.5 h-3.5" />}
                          {ch === 'WhatsApp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
                          {ch === 'SMS' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{ch}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email-Only Subject Line */}
                  {tplChannel === 'Email' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">
                          Email Subject Line <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Merge variables supported</span>
                      </div>
                      <input
                        type="text"
                        value={tplSubject}
                        onChange={(e) => setTplSubject(e.target.value)}
                        placeholder="e.g. Spot Commercial Offer: Certified {commodity} CIF {port}"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                  )}

                  {/* Channel-Specific Hints */}
                  {tplChannel === 'WhatsApp' && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp Formatting Guide:
                      </div>
                      <p className="text-[11px] text-emerald-200/80">
                        Use <code className="bg-emerald-950/60 px-1 rounded">*bold*</code>, <code className="bg-emerald-950/60 px-1 rounded">_italics_</code>, <code className="bg-emerald-950/60 px-1 rounded">~strikethrough~</code>, and emojis.
                      </p>
                    </div>
                  )}

                  {tplChannel === 'SMS' && (
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>GSM Segment Calculator:</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold">
                        {smsCharCount} Chars &bull; {smsSegments} SMS Segment{smsSegments > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Dynamic Merge Variable Chips Toolbar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Dynamic Merge Variables (Click to Insert):
                      </span>
                      {copiedToken && (
                        <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                          Inserted {copiedToken}!
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TOKEN_SUGGESTIONS.map((t) => (
                        <button
                          key={t.token}
                          type="button"
                          onClick={() => insertTokenIntoDraft(t.token)}
                          className="px-2 py-1 rounded-lg text-[11px] font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition flex items-center gap-1"
                          title={t.desc}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{t.token}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fast Snippet Insertion Toolbar */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Quick Pre-Built Trade Paragraphs:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PREBUILT_SNIPPETS.map((snip) => (
                        <button
                          key={snip.label}
                          type="button"
                          onClick={() => insertSnippetIntoDraft(snip.snippet)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          + {snip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Spacious Editor Textarea */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Message Draft Body</span>
                      <span className="font-mono text-[11px]">{tplBody.length} characters &bull; {tplBody.split(/\s+/).filter(Boolean).length} words</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      rows={14}
                      value={tplBody}
                      onChange={(e) => setTplBody(e.target.value)}
                      placeholder="Write your trade message draft with {variable_tokens}..."
                      className={`w-full p-4 rounded-xl border font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/30 transition ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  {/* Bottom Studio Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(activeTemplate.template_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/20 transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Template</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewMode('library')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={isSaving}
                        className={`px-5 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} shadow-md transition flex items-center gap-1.5`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* =================================================================== */}
                {/* RIGHT WORKSPACE: LIVE SIMULATION & REAL TEST DISPATCH (5 columns)   */}
                {/* =================================================================== */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Lead Selector for Realistic Data Hydration */}
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        Hydrate with Real Lead
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowOverrideInputs(!showOverrideInputs)}
                        className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{showOverrideInputs ? 'Hide Custom Overrides' : 'Custom Test Values'}</span>
                      </button>
                    </div>

                    <select
                      value={selectedLeadIndex}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setSelectedLeadIndex(idx);
                        const lead = realLeads[idx];
                        if (lead) {
                          setTestRecipient(tplChannel === 'Email' ? lead.emails || '' : lead.phones || '');
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      {realLeads.map((lead, idx) => (
                        <option key={idx} value={idx}>
                          {lead.company_name} ({lead.country})
                        </option>
                      ))}
                    </select>

                    {/* Collapsible Custom Overrides */}
                    {showOverrideInputs && (
                      <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Quantity Spec:</label>
                          <input
                            type="text"
                            value={customLeadOverrides.quantity_mt}
                            onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, quantity_mt: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Price Spec:</label>
                          <input
                            type="text"
                            value={customLeadOverrides.price_per_mt}
                            onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, price_per_mt: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Incoterm:</label>
                          <input
                            type="text"
                            value={customLeadOverrides.incoterm}
                            onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, incoterm: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Payment Terms:</label>
                          <input
                            type="text"
                            value={customLeadOverrides.payment_terms}
                            onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, payment_terms: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Device Previewer Card */}
                  <div
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {/* Device Selector Tabs */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        Live Device Preview
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop_email')}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            previewDevice === 'desktop_email' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Desktop Email Client"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile_email')}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            previewDevice === 'mobile_email' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mobile Smartphone Email"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('whatsapp')}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            previewDevice === 'whatsapp' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                          title="WhatsApp Business"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('sms')}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            previewDevice === 'sms' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                          title="SMS Message"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 1. Desktop Email View */}
                    {previewDevice === 'desktop_email' && (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
                        {/* Desktop Window Titlebar */}
                        <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Mail Preview &bull; {activeLead.company_name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">250 OK</span>
                        </div>

                        {/* Email Client Header */}
                        <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 space-y-1 text-xs">
                          <div className="flex items-baseline gap-2">
                            <span className="text-slate-500 font-semibold w-12 text-right">From:</span>
                            <span className="text-slate-200 font-medium">TradePulse Export Desk &lt;exports@tradepulse.exim&gt;</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-slate-500 font-semibold w-12 text-right">To:</span>
                            <span className="text-slate-300 font-medium">
                              {activeLead.contact_person} &lt;{activeLead.emails || 'procurement@buyer.com'}&gt;
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 pt-1 border-t border-slate-800/40">
                            <span className="text-slate-500 font-semibold w-12 text-right">Subject:</span>
                            <span className="text-white font-bold">{hydratedSubject || 'No Subject'}</span>
                          </div>
                        </div>

                        {/* Email Body Area */}
                        <div className="p-4 text-xs font-sans text-slate-200 whitespace-pre-line leading-relaxed max-h-[380px] overflow-y-auto bg-slate-950">
                          {hydratedBody}
                        </div>
                      </div>
                    )}

                    {/* 2. Mobile Smartphone Email View */}
                    {previewDevice === 'mobile_email' && (
                      <div className="mx-auto max-w-[340px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
                        <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />
                        <div className="p-2.5 bg-slate-900 rounded-t-xl border-b border-slate-800 flex items-center justify-between text-xs text-white">
                          <span className="font-bold text-[11px] truncate">{activeLead.company_name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">10:42 AM</span>
                        </div>
                        <div className="p-2 bg-slate-900/60 border-b border-slate-800 text-[11px]">
                          <div className="font-bold text-white line-clamp-1">{hydratedSubject || 'Subject'}</div>
                          <div className="text-[10px] text-slate-400 truncate">From: exports@tradepulse.exim</div>
                        </div>
                        <div className="p-3 bg-slate-900/40 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-[320px] overflow-y-auto">
                          {hydratedBody}
                        </div>
                      </div>
                    )}

                    {/* 3. WhatsApp Business Chat View */}
                    {previewDevice === 'whatsapp' && (
                      <div className="mx-auto max-w-[340px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
                        <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />
                        {/* WhatsApp Header */}
                        <div className="p-2.5 bg-emerald-900/60 rounded-t-xl border-b border-emerald-800/40 flex items-center justify-between text-xs text-white">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px]">
                              TP
                            </div>
                            <div className="truncate">
                              <div className="font-bold text-[11px] truncate">{activeLead.company_name}</div>
                              <div className="text-[9px] text-emerald-300">Online</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-300">Verified</span>
                        </div>

                        {/* WhatsApp Message Bubble */}
                        <div className="p-3 bg-slate-900/80 min-h-[300px] max-h-[360px] overflow-y-auto space-y-2">
                          <div className="p-3 rounded-2xl rounded-tl-none bg-emerald-950/60 border border-emerald-800/50 text-emerald-100 text-xs whitespace-pre-line leading-relaxed shadow-md">
                            {hydratedBody}
                            <div className="mt-1 text-right text-[9px] text-emerald-400 font-mono flex items-center justify-end gap-1">
                              <span>10:45 AM</span>
                              <span className="text-cyan-400 font-bold">&check;&check;</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. SMS Text View */}
                    {previewDevice === 'sms' && (
                      <div className="mx-auto max-w-[340px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
                        <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />
                        <div className="p-2.5 bg-slate-900 rounded-t-xl border-b border-slate-800 text-center text-xs text-white">
                          <div className="font-bold text-[11px]">{activeLead.contact_person}</div>
                          <div className="text-[9px] text-slate-400">{activeLead.phones || '+971 50 123 4567'}</div>
                        </div>
                        <div className="p-3 bg-slate-900/60 min-h-[260px] max-h-[320px] overflow-y-auto space-y-2">
                          <div className="p-3 rounded-2xl rounded-tl-none bg-blue-950/60 border border-blue-800/50 text-blue-100 text-xs whitespace-pre-line leading-relaxed shadow-sm">
                            {hydratedBody}
                            <div className="mt-1 text-right text-[9px] text-blue-300 font-mono">Delivered SMS</div>
                          </div>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-b-xl border-t border-slate-800 text-center text-[10px] text-slate-400 font-mono">
                          {smsCharCount} Chars &bull; {smsSegments} Segment(s)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real Test Dispatch Box */}
                  <div
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        Real Test Dispatch Console
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Live API</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Dispatches this hydrated template through your configured Gmail SMTP gateway or sandbox API outbox.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Test Recipient ({tplChannel === 'Email' ? 'Email Address' : 'Phone / Mobile No.'}):
                      </label>
                      <input
                        type="text"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder={tplChannel === 'Email' ? 'buyer@company.com' : '+971501234567'}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => handleExecuteTestDispatch()}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} shadow-md transition flex items-center justify-center gap-2`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatching ? 'Transmitting Dispatch...' : `Send Test ${tplChannel} Now`}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: QUICK TEST SEND (From Library View) */}
        {quickTestTemplate && (
          <div
            onClick={() => setQuickTestTemplate(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Quick Test Dispatch</h3>
                </div>
                <button onClick={() => setQuickTestTemplate(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Template:</span>
                  <span className="font-bold text-white">{quickTestTemplate.name}</span>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Send Test To:</label>
                  <input
                    type="text"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder={quickTestTemplate.channel === 'Email' ? 'procurement@client.com' : '+971501234567'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setQuickTestTemplate(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDispatching}
                  onClick={() => handleExecuteTestDispatch(quickTestTemplate)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn}`}
                >
                  {isDispatching ? 'Transmitting...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DISPATCHED OUTBOX LOG DRAWER */}
        {showOutboxModal && (
          <div
            onClick={() => setShowOutboxModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Dispatched Outbox Log ({outboxRecords.length})</h3>
                </div>
                <button onClick={() => setShowOutboxModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Live audit trail of test messages and broadcasts processed by the gateway engine.
              </p>

              {loadingOutbox ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading outbox logs...</div>
              ) : outboxRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No dispatches recorded yet. Use the Test Send console in the studio to generate live logs.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {outboxRecords.map((r) => (
                    <div
                      key={r.dispatch_id || r._id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                              r.channel === 'Email'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : r.channel === 'WhatsApp'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {r.channel}
                          </span>
                          <span className="font-semibold text-white">{r.recipient}</span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(r.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                          {new Date(r.sent_at).toLocaleDateString()}
                        </span>
                      </div>

                      {r.subject && (
                        <div className="text-[11px] text-slate-300 font-medium truncate">
                          Subject: {r.subject}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/50 p-2 rounded-lg font-mono whitespace-pre-wrap">
                        {r.body}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                        <span className="font-mono">ID: {r.dispatch_id}</span>
                        <span className="text-emerald-400 font-medium">{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowOutboxModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </PageLeftNav>
    </Shell>
  );
}
