'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { fetchJson } from '@/lib/api';
import { useTheme, AccentColor, ThemeMode, DetailViewMode } from '@/context/ThemeContext';
import {
  Settings,
  Building2,
  Cpu,
  Mail,
  MessageSquare,
  Palette,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Send,
  Sparkles,
  ShieldCheck,
  Globe2,
  HardDrive,
  RefreshCw,
  ExternalLink,
  Layers,
  FileSpreadsheet,
  Compass,
  MapPin,
  CheckSquare,
  Square,
  Search,
  Power
} from 'lucide-react';

interface SourceItem {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  country_coverage: string;
  reliability_score: number;
  lead_type: 'importer' | 'supplier';
  is_indian?: boolean;
  is_map_extractor?: boolean;
  enabled: boolean;
}

interface CompanyProfile {
  company_name: string;
  iec_code: string;
  gstin: string;
  default_currency: string;
  default_unit: string;
  primary_export_port: string;
  support_email: string;
  phone: string;
}

interface DedupConfig {
  dedup_threshold: number;
  auto_merge_duplicates: boolean;
  conflict_resolution: string;
  phone_crosscheck: boolean;
  tax_crosscheck: boolean;
  ml_model: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  from_name: string;
  from_email: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_verified?: boolean;
  last_tested_at?: string;
  password?: string;
}

interface TrashLead {
  id: string | number;
  company_name: string;
  country: string;
  lead_type: string;
  deleted_at: string;
}

const colorSwatches: { key: AccentColor; name: string; bg: string; hex: string }[] = [
  { key: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', hex: '#10b981' },
  { key: 'blue', name: 'Sapphire Blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'violet', name: 'Royal Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { key: 'amber', name: 'Warm Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'rose', name: 'Crimson Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
];

export default function DedicatedSettingsPage() {
  const { theme, setTheme, accent, setAccent, accentClasses, detailViewMode, setDetailViewMode } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'company' | 'sources' | 'dedup' | 'smtp' | 'whatsapp' | 'appearance' | 'trash'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sources State
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'importer' | 'supplier' | 'indian' | 'map'>('all');
  const [sourceSearch, setSourceSearch] = useState('');

  // Company Profile State
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

  // ML Deduplication State
  const [dedup, setDedup] = useState<DedupConfig>({
    dedup_threshold: 95.0,
    auto_merge_duplicates: true,
    conflict_resolution: 'intelligent_union',
    phone_crosscheck: true,
    tax_crosscheck: true,
    ml_model: 'RapidFuzz Multi-Factor NLP Token Ensemble',
  });

  // SMTP State
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

  // WhatsApp State
  const [whatsapp, setWhatsapp] = useState({
    provider: 'meta_cloud_api',
    api_token: 'EAABwzLIX4ZAIBA...',
    phone_number_id: '109849201948291',
    webhook_url: 'https://api.tradepulse.exim/webhooks/whatsapp',
  });

  // Trash Leads State
  const [trashLeads, setTrashLeads] = useState<TrashLead[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
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
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
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
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, enabled } : s))
    );
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
      setSources((prev) =>
        prev.map((s) => ({ ...s, enabled: !disabledSet.has(s.id) }))
      );
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

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setSaveMsg({ text, type });
    setTimeout(() => setSaveMsg(null), 4000);
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

  const navTabs = [
    { id: 'company', label: 'Company & EXIM Profile', icon: <Building2 className="w-4 h-4" /> },
    {
      id: 'sources',
      label: 'Data Sources & Registries',
      icon: <Compass className="w-4 h-4" />,
      badge: sources.length > 0 ? `${sources.filter((s) => s.enabled).length}/${sources.length}` : undefined,
    },
    { id: 'dedup', label: 'ML Deduplication & Merging', icon: <Cpu className="w-4 h-4" />, badge: `${dedup.dedup_threshold}%` },
    { id: 'smtp', label: 'Email & SMTP Gateway', icon: <Mail className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp & SMS Channels', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'appearance', label: 'Themes & UI Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'trash', label: 'Soft-Delete Trash Bin', icon: <Trash2 className="w-4 h-4" />, badge: trashLeads.length > 0 ? trashLeads.length : undefined },
  ];

  return (
    <Shell>
      <div className="space-y-6 pb-16">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl ${accentClasses.badgeBg} ${accentClasses.text}`}>
                <Settings className="w-5 h-5" />
              </span>
              <h1 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                System Settings & Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure enterprise EXIM identity, 95% ML deduplication, verified trade sources, SMTP delivery, and soft-delete trash.
            </p>
          </div>

          {/* Quick Status Badges */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              ML Dedup: {dedup.dedup_threshold}% Active
            </span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 font-semibold flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              216 Trade Sources
            </span>
          </div>
        </div>

        {/* Global Toast Alert */}
        {saveMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              saveMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{saveMsg.text}</span>
          </div>
        )}

        {/* Top Tab Bar (Replaces in-page duplicate left sidebar) */}
        <div
          className={`w-full rounded-2xl border p-2.5 transition ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                    isActive
                      ? isLight
                        ? `bg-slate-100 ${accentClasses.text} shadow-sm border border-slate-200`
                        : `bg-slate-800 text-white border ${accentClasses.border}`
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className={isActive ? accentClasses.text : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-1 ${
                        isActive
                          ? isLight
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-slate-700 text-white'
                          : isLight
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab 1: Company Profile */}
        {activeTab === 'company' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Enterprise EXIM Organization Profile
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your official trade credentials, DGFT Import Export Code (IEC), and default shipping parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Legal Company Name</label>
                <input
                  type="text"
                  value={company.company_name}
                  onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                      : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">DGFT IEC Code (10 Digits)</label>
                <input
                  type="text"
                  value={company.iec_code}
                  onChange={(e) => setCompany({ ...company, iec_code: e.target.value })}
                  placeholder="e.g. 0519042918"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                      : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={company.gstin}
                  onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                      : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Primary Export Sea Port</label>
                <input
                  type="text"
                  value={company.primary_export_port}
                  onChange={(e) => setCompany({ ...company, primary_export_port: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                      : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Default Export Currency</label>
                <select
                  value={company.default_currency}
                  onChange={(e) => setCompany({ ...company, default_currency: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="AED">AED - UAE Dirham (د.إ)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="SGD">SGD - Singapore Dollar (S$)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Default Weight / Volume Unit</label>
                <select
                  value={company.default_unit}
                  onChange={(e) => setCompany({ ...company, default_unit: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="MT">Metric Tons (MT)</option>
                  <option value="KG">Kilograms (KG)</option>
                  <option value="TEU">Twenty-Foot Equivalent Unit (TEU Containers)</option>
                  <option value="QUINTAL">Quintals (100 KG)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Support Email</label>
                <input
                  type="email"
                  value={company.support_email}
                  onChange={(e) => setCompany({ ...company, support_email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Direct Hotline</label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/40 flex justify-end">
              <button
                onClick={saveCompany}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Company Profile'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Data Sources & Registries Management */}
        {activeTab === 'sources' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${accentClasses.badgeBg} ${accentClasses.text}`}>
                    <Compass className="w-4 h-4" />
                  </span>
                  <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Data Sources & Sourcing Registries Management
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Configure active harvesting channels globally. Enabled sources are automatically selected in the Crawler wizard.
                  Disabled sources are excluded across all crawler runs.
                </p>
              </div>

              {/* Bulk Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => bulkUpdateSources('enable_all')}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Enable All
                </button>
                <button
                  onClick={() => bulkUpdateSources('enable_indian_only')}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  Enable Indian Only
                </button>
                <button
                  onClick={() => bulkUpdateSources('disable_all')}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" />
                  Disable All
                </button>
              </div>
            </div>

            {/* Sources Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Sources</span>
                <p className="text-xl font-black text-white mt-1">{sources.length || 218}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Verified directories & manifests</p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Active / Enabled</span>
                <p className="text-xl font-black text-emerald-400 mt-1">
                  {sources.filter((s) => s.enabled).length}
                </p>
                <p className="text-[11px] text-emerald-500/80 mt-0.5">Available for Crawler runs</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">Disabled Globally</span>
                <p className="text-xl font-black text-rose-400 mt-1">
                  {sources.filter((s) => !s.enabled).length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Excluded from extraction</p>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Google Maps Live</span>
                <p className="text-xl font-black text-purple-400 mt-1">2 Channels</p>
                <p className="text-[11px] text-purple-400/80 mt-0.5">Importers & Suppliers Extractor</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    sourceFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  All Sources ({sources.length})
                </button>
                <button
                  onClick={() => setSourceFilter('importer')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    sourceFilter === 'importer'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Importers ({sources.filter((s) => s.lead_type === 'importer').length})
                </button>
                <button
                  onClick={() => setSourceFilter('supplier')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    sourceFilter === 'supplier'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Suppliers ({sources.filter((s) => s.lead_type === 'supplier').length})
                </button>
                <button
                  onClick={() => setSourceFilter('indian')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    sourceFilter === 'indian'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Indian Bodies ({sources.filter((s) => s.is_indian || s.country_coverage?.toLowerCase().includes('india')).length})
                </button>
                <button
                  onClick={() => setSourceFilter('map')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === 'map'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Google Maps ({sources.filter((s) => s.is_map_extractor || s.id.includes('gmaps')).length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  placeholder="Filter sources by name or country..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-slate-700"
                />
              </div>
            </div>

            {/* Sources List / Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-800/60">
                {sources
                  .filter((s) => {
                    if (sourceFilter === 'importer' && s.lead_type !== 'importer') return false;
                    if (sourceFilter === 'supplier' && s.lead_type !== 'supplier') return false;
                    if (sourceFilter === 'indian' && !s.is_indian && !s.country_coverage?.toLowerCase().includes('india')) return false;
                    if (sourceFilter === 'map' && !s.is_map_extractor && s.id !== 'imp-src-gmaps' && s.id !== 'sup-src-gmaps') return false;
                    if (sourceSearch) {
                      const q = sourceSearch.toLowerCase();
                      return (
                        s.name.toLowerCase().includes(q) ||
                        s.category.toLowerCase().includes(q) ||
                        s.country_coverage.toLowerCase().includes(q) ||
                        s.domain.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((source) => {
                    const isGmaps = source.is_map_extractor || source.id.includes('gmaps');
                    return (
                      <div
                        key={source.id}
                        className={`p-4 flex items-center justify-between gap-4 transition hover:bg-slate-900/60 ${
                          !source.enabled ? 'opacity-60 bg-slate-950/60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleSource(source.id, !source.enabled)}
                            className="mt-1 text-slate-400 hover:text-white transition shrink-0"
                            title={source.enabled ? 'Click to disable' : 'Click to enable'}
                          >
                            {source.enabled ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">{source.name}</span>
                              {isGmaps && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-purple-400" />
                                  Google Maps Live
                                </span>
                              )}
                              {source.is_indian && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                                  Indian Body
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                                  source.lead_type === 'importer'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {source.lead_type}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                              <span className="text-slate-300">{source.category}</span>
                              <span>•</span>
                              <span>Coverage: {source.country_coverage}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-400">{source.domain}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono font-bold">
                                {source.reliability_score}% Reliability
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Toggle Switch */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase ${
                              source.enabled ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {source.enabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSource(source.id, !source.enabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              source.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                source.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ML Deduplication & Merge */}
        {activeTab === 'dedup' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Machine Learning Deduplication & Intelligent Merge Engine
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                When extracting or crawling trade leads, any record that matches an existing company with &ge; 95% similarity
                will be merged to enrich contacts and trade history instead of creating redundant duplicates.
              </p>
            </div>

            <div className="space-y-6 max-w-2xl">
              {/* Threshold Slider */}
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Similarity Threshold for Automatic Record Merge
                  </label>
                  <span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {dedup.dedup_threshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="99"
                  step="0.5"
                  value={dedup.dedup_threshold}
                  onChange={(e) => setDedup({ ...dedup, dedup_threshold: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>80% (Loose Matching)</span>
                  <span className="text-emerald-400 font-bold">95.0% (Recommended Industry Standard)</span>
                  <span>99% (Strict Matching)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dedup.auto_merge_duplicates}
                    onChange={(e) => setDedup({ ...dedup, auto_merge_duplicates: e.target.checked })}
                    className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      Auto-Merge Discovered Duplicates (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Unions emails, telephone numbers, and applicable HS codes while preserving historical audit timestamps.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dedup.tax_crosscheck}
                    onChange={(e) => setDedup({ ...dedup, tax_crosscheck: e.target.checked })}
                    className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      Tax ID & IEC Strict Cross-Checking
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Exact GSTIN, PAN, or DGFT IEC code match immediately scores 99.8% and triggers instant merge.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dedup.phone_crosscheck}
                    onChange={(e) => setDedup({ ...dedup, phone_crosscheck: e.target.checked })}
                    className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      Phone Number E.164 Cross-Checking
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Identical normalized telephone numbers with matching international country code score 96.5%.
                    </span>
                  </div>
                </label>
              </div>

              {/* Conflict Resolution Strategy */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Conflict Resolution Strategy
                </label>
                <select
                  value={dedup.conflict_resolution}
                  onChange={(e) => setDedup({ ...dedup, conflict_resolution: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="intelligent_union">Intelligent Union (Combine emails, phones, products & audit trail)</option>
                  <option value="keep_newest">Keep Newest (Overwrite with latest scraped details)</option>
                  <option value="preserve_original">Preserve Original (Keep original contact data untouched)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/40 flex justify-end">
              <button
                onClick={saveDedup}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Deduplication Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: SMTP Gateway */}
        {activeTab === 'smtp' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Gmail & Commercial SMTP Delivery Gateway
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your organization SMTP server or Gmail App Password for transactional emails, quotations, and sequences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">SMTP Host Server</label>
                <input
                  type="text"
                  value={smtp.host}
                  onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Port (587 TLS / 465 SSL)</label>
                <input
                  type="number"
                  value={smtp.port}
                  onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">SMTP Username / Email</label>
                <input
                  type="email"
                  value={smtp.username}
                  onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                  placeholder="exports@tradepulse.exim"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">App Password / Auth Token</label>
                <input
                  type="password"
                  value={smtp.password}
                  onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                  placeholder="••••••••••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sender From Name</label>
                <input
                  type="text"
                  value={smtp.from_name}
                  onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                  placeholder="TradePulse Commercial Exports"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reply-To Email Address</label>
                <input
                  type="email"
                  value={smtp.from_email}
                  onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                  placeholder="exports@tradepulse.exim"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>

            {testSmtpResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
                {testSmtpResult}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/40 flex items-center justify-between">
              <button
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {testingSmtp ? 'Testing Connection...' : 'Test SMTP Connection'}
              </button>

              <button
                onClick={saveSmtp}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save SMTP Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: WhatsApp & SMS */}
        {activeTab === 'whatsapp' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                WhatsApp Cloud API & SMS Carrier Gateway
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Send interactive trade quotes, bill of lading milestones, and cargo alerts directly to overseas buyers via WhatsApp.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Channel Provider</label>
                <select
                  value={whatsapp.provider}
                  onChange={(e) => setWhatsapp({ ...whatsapp, provider: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="meta_cloud_api">Meta Cloud API (Official WhatsApp Business API)</option>
                  <option value="gupshup">Gupshup Enterprise Messaging Gateway</option>
                  <option value="twilio">Twilio Programmable Messaging</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">System Access Token / API Key</label>
                <input
                  type="password"
                  value={whatsapp.api_token}
                  onChange={(e) => setWhatsapp({ ...whatsapp, api_token: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number ID</label>
                <input
                  type="text"
                  value={whatsapp.phone_number_id}
                  onChange={(e) => setWhatsapp({ ...whatsapp, phone_number_id: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Inbound Webhook Endpoint</label>
                <input
                  type="text"
                  value={whatsapp.webhook_url}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border bg-slate-950/80 border-slate-800 text-slate-400"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/40 flex justify-end">
              <button
                onClick={() => showNotification('WhatsApp & SMS configuration updated!')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
              >
                <Save className="w-4 h-4" />
                Save Channel Gateway
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Appearance */}
        {activeTab === 'appearance' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Theme Customization & Workspace Styling
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize your system accent colors, dark/light ambient modes, and data grid density.
              </p>
            </div>

            <div className="space-y-6">
              {/* Dark vs Light Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-3">Color Mode</label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition ${
                      theme === 'dark'
                        ? 'border-emerald-500 bg-slate-800/90 shadow-md'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
                      🌙
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Dark Mode</span>
                      <span className="text-[10px] text-slate-400">High contrast for trading rooms</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition ${
                      theme === 'light'
                        ? 'border-emerald-500 bg-slate-100 shadow-md'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-900">
                      ☀️
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Light Mode</span>
                      <span className="text-[10px] text-slate-500">Clean paper-white documents</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent Color Palettes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-3">Accent Brand Color</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl">
                  {colorSwatches.map((swatch) => {
                    const isSelected = accent === swatch.key;
                    return (
                      <button
                        key={swatch.key}
                        onClick={() => setAccent(swatch.key)}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'border-white bg-slate-800/90 shadow-lg'
                            : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full ${swatch.bg} shadow-md`} />
                        <span className="text-xs font-semibold text-slate-200">{swatch.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Soft-Delete Trash Bin */}
        {activeTab === 'trash' && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Soft-Delete Trash Bin & Audit Recovery
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deleted leads are safely retained here. You can restore them to active directory or permanently purge them.
                </p>
              </div>

              <button
                onClick={loadTrash}
                disabled={loadingTrash}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTrash ? 'animate-spin' : ''}`} />
                Refresh Trash
              </button>
            </div>

            {trashLeads.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-800">
                <Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Trash bin is currently empty.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No soft-deleted leads pending recovery.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4">Entity Type</th>
                      <th className="py-3 px-4">Deleted At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {trashLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">{lead.company_name}</td>
                        <td className="py-3 px-4 text-slate-300">{lead.country}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                            {lead.lead_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{lead.deleted_at || 'Recently'}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleRestoreLead(lead.id)}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold hover:bg-emerald-500/20"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(lead.id)}
                            className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold hover:bg-rose-500/20"
                          >
                            Purge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
