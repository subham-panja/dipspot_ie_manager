'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, AccentColor, ThemeMode, DetailViewMode, SettingsTab } from '@/context/ThemeContext';
import { fetchJson } from '@/lib/api';
import {
  X,
  Settings,
  Palette,
  Mail,
  Globe,
  Sliders,
  DollarSign,
  GitBranch,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Save,
  RotateCcw,
  Plus,
  Play,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Smartphone,
  Cpu
} from 'lucide-react';

interface Stage {
  stage_id: string;
  name: string;
  order: number;
  color?: string;
  description?: string;
  is_terminal?: boolean;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  masked_password?: string;
  has_password?: boolean;
  from_name: string;
  from_email: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_verified?: boolean;
  last_tested_at?: string;
  channels_status?: Record<string, string>;
}

interface CrawlerSource {
  id: string;
  name: string;
  active: boolean;
  type: string;
}

interface CrawlerConfig {
  sources: CrawlerSource[];
  target_commodities: string[];
  target_countries: string[];
  crawl_depth_pages: number;
  infinite_pagination: boolean;
  auto_enrichment: boolean;
  request_delay_seconds: number;
  timeout_seconds: number;
}

interface CompetitorQuote {
  quote_id: string;
  competitor_name: string;
  commodity: string;
  category: string;
  origin_country: string;
  fob_price_usd_mt: number;
  cif_price_usd_mt: number;
  destination_port: string;
  packaging: string;
  payment_terms: string;
  our_price_usd_mt: number;
  spread_usd: number;
  price_advantage: string;
  verified_date: string;
  notes: string;
}

const colorSwatches: { key: AccentColor; name: string; bg: string; hex: string }[] = [
  { key: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', hex: '#10b981' },
  { key: 'blue', name: 'Sapphire Blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'violet', name: 'Royal Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { key: 'amber', name: 'Warm Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'rose', name: 'Crimson Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
];

export default function GlobalSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    detailViewMode,
    setDetailViewMode,
    settingsTab,
    setSettingsTab,
    accentClasses,
  } = useTheme();

  const isLight = theme === 'light';

  // Sub-tab selection
  const [activeTab, setActiveTab] = useState<SettingsTab>(settingsTab || 'appearance');

  // Smtp State
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: 'smtp.gmail.com',
    port: 587,
    username: 'exports@tradepulse.exim',
    password: '',
    from_name: 'TradePulse Commercial Exports',
    from_email: 'exports@tradepulse.exim',
    use_tls: true,
    use_ssl: false,
    is_verified: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatusMsg, setSmtpStatusMsg] = useState('');

  // Crawler State
  const [crawler, setCrawler] = useState<CrawlerConfig | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatusMsg, setCrawlStatusMsg] = useState('');

  // Competitor Pricing State
  const [quotes, setQuotes] = useState<CompetitorQuote[]>([]);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [newQuote, setNewQuote] = useState({
    competitor_name: '',
    commodity: 'Non-Basmati Parboiled Grain',
    category: 'Agricultural Grains',
    origin_country: 'India',
    fob_price_usd_mt: 445,
    cif_price_usd_mt: 490,
    our_price_usd_mt: 438,
    destination_port: 'Jebel Ali Port (AEJEA)',
    payment_terms: '100% LC at Sight',
    notes: 'Direct commercial quote',
  });

  // Stages State
  const [pipelineStages, setPipelineStages] = useState<Stage[]>([]);
  const [shipmentStages, setShipmentStages] = useState<Stage[]>([]);

  // Load Settings Data
  const loadSettingsData = async () => {
    try {
      const [smtpRes, crawlerRes, pricingRes, pipeRes, shipRes] = await Promise.all([
        fetchJson<{ smtp: SmtpConfig }>('/config/smtp').catch(() => ({ smtp: null as any })),
        fetchJson<{ crawler: CrawlerConfig }>('/config/crawler').catch(() => ({ crawler: null as any })),
        fetchJson<{ quotes: CompetitorQuote[] }>('/intelligence/competitor-pricing').catch(() => ({ quotes: [] })),
        fetchJson<{ stages: Stage[] }>('/pipeline/stages').catch(() => ({ stages: [] })),
        fetchJson<{ stages: Stage[] }>('/shipments/stages').catch(() => ({ stages: [] })),
      ]);

      if (smtpRes?.smtp) setSmtp(smtpRes.smtp);
      if (crawlerRes?.crawler) setCrawler(crawlerRes.crawler);
      if (pricingRes?.quotes) setQuotes(pricingRes.quotes);
      if (pipeRes?.stages) setPipelineStages(pipeRes.stages);
      if (shipRes?.stages) setShipmentStages(shipRes.stages);
    } catch (e) {
      console.error('Failed to load settings data', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(settingsTab);
      loadSettingsData();
    }
  }, [isOpen, settingsTab]);

  // Escape key handler to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Actions
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchJson<{ smtp: SmtpConfig; message: string }>('/config/smtp', {
        method: 'PATCH',
        body: JSON.stringify(smtp),
      });
      setSmtp(res.smtp);
      setSmtpStatusMsg('Gmail SMTP preferences saved successfully!');
      setTimeout(() => setSmtpStatusMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to save SMTP: ' + err.message);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpStatusMsg('');
    try {
      const res = await fetchJson<{ success: boolean; message: string }>('/config/smtp/test', {
        method: 'POST',
        body: JSON.stringify({ recipient: smtp.from_email }),
      });
      setSmtpStatusMsg(res.message);
      setSmtp((prev) => ({ ...prev, is_verified: true, last_tested_at: new Date().toISOString() }));
      setTimeout(() => setSmtpStatusMsg(''), 6000);
    } catch (err: any) {
      alert('SMTP test failed: ' + err.message);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveCrawler = async () => {
    if (!crawler) return;
    try {
      const res = await fetchJson<{ crawler: CrawlerConfig; message: string }>('/config/crawler', {
        method: 'PATCH',
        body: JSON.stringify(crawler),
      });
      setCrawler(res.crawler);
      setCrawlStatusMsg('Crawler sources and commodities saved!');
      setTimeout(() => setCrawlStatusMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to save crawler settings: ' + err.message);
    }
  };

  const handleTriggerInstantCrawl = async (leadType: string = 'all') => {
    setIsCrawling(true);
    setCrawlStatusMsg('');
    try {
      const res = await fetchJson<{ message: string }>('/scrape/crawl-now', {
        method: 'POST',
        body: JSON.stringify({ lead_type: leadType }),
      });
      setCrawlStatusMsg(res.message || 'Crawl job successfully queued in background!');
      setTimeout(() => setCrawlStatusMsg(''), 5000);
    } catch (err: any) {
      alert('Failed to trigger crawler: ' + err.message);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleAddCompetitorQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/intelligence/competitor-pricing', {
        method: 'POST',
        body: JSON.stringify(newQuote),
      });
      setShowAddQuoteModal(false);
      loadSettingsData();
    } catch (err: any) {
      alert('Failed to add competitor quote: ' + err.message);
    }
  };

  const handleDeleteCompetitorQuote = async (quoteId: string) => {
    if (!confirm(`Delete competitor quote ${quoteId}?`)) return;
    try {
      await fetchJson(`/intelligence/competitor-pricing/${quoteId}`, { method: 'DELETE' });
      loadSettingsData();
    } catch (err: any) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 transition-all"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${accentClasses.gradient} flex items-center justify-center text-white shadow-md`}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Global System Preferences & Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Centralized control for styling, Gmail SMTP, automated directory crawlers, and competitor intelligence.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-800/40 px-5 text-xs font-semibold overflow-x-auto gap-5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'appearance'
                ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Theme & Layout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smtp')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'smtp'
                ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-400" />
            <span>Gmail SMTP Gateway</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crawler')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'crawler'
                ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Directory Crawlers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'pricing'
                ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Competitor Pricing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'stages'
                ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Lifecycle Stages</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* TAB 1: THEME & LAYOUT */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* Theme Mode */}
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Interface Mode
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select your primary interface contrast preference.
                </p>

                <div className="grid grid-cols-2 gap-3 max-w-sm mt-2.5">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                      theme === 'dark'
                        ? `border-2 ${accentClasses.border} bg-slate-950 text-white shadow-md`
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-300">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Dark Mode</div>
                      <div className="text-[10px] text-slate-400">High contrast slate</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                      theme === 'light'
                        ? `border-2 ${accentClasses.border} bg-white text-slate-900 shadow-md`
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-amber-600">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Light Mode</div>
                      <div className="text-[10px] text-slate-500">Crisp modern white</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent Color Palette */}
              <div className="pt-3 border-t border-slate-800/40">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Brand Accent Highlight
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Applied to buttons, badges, navigation borders, and active tabs.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2.5">
                  {colorSwatches.map((swatch) => {
                    const isSelected = accent === swatch.key;
                    return (
                      <button
                        key={swatch.key}
                        type="button"
                        onClick={() => setAccent(swatch.key)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                          isSelected
                            ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-100' : 'bg-slate-800/80 shadow-md'}`
                            : isLight
                            ? 'border-slate-200 bg-white hover:bg-slate-50'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${swatch.bg} shadow-md flex items-center justify-center text-white`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {swatch.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Profile Dossier Presentation Style */}
              <div className="pt-3 border-t border-slate-800/40">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Customer Profile & Location Dossier Presentation
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure how the customer intelligence dossier (with Google Maps & contact intelligence) opens when clicking any company name.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setDetailViewMode('right_drawer')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      detailViewMode === 'right_drawer'
                        ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/80 shadow-lg'}`
                        : isLight
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-cyan-400">
                      <span>Right Flyout Drawer</span>
                      {detailViewMode === 'right_drawer' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20">Active</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Slides out smoothly from the right edge. Keeps directory tables visible behind.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailViewMode('modal')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      detailViewMode === 'modal'
                        ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/80 shadow-lg'}`
                        : isLight
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-purple-400">
                      <span>Centered Modal</span>
                      {detailViewMode === 'modal' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20">Active</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Centered focused popup with dark blurred background.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailViewMode('left_drawer')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      detailViewMode === 'left_drawer'
                        ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/80 shadow-lg'}`
                        : isLight
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-amber-400">
                      <span>Left Flyout Drawer</span>
                      {detailViewMode === 'left_drawer' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20">Active</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Slides out from the left navigation boundary.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GMAIL SMTP GATEWAY */}
          {activeTab === 'smtp' && (
            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Primary Outbound Gateway: <strong>Gmail SMTP</strong> is active. Use your standard Google Workspace or Gmail App Password.
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {smtp.is_verified ? 'Verified Active' : 'Pending Verification'}
                </span>
              </div>

              {smtpStatusMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{smtpStatusMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">SMTP Server Host</label>
                  <input
                    type="text"
                    value={smtp.host}
                    onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Port</label>
                  <input
                    type="number"
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Gmail Username / Account Email</label>
                  <input
                    type="text"
                    value={smtp.username}
                    onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">App Password (16-character Google Pass)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={smtp.masked_password || 'Enter Google App Password...'}
                      value={smtp.password || ''}
                      onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                      className={`w-full p-2.5 pr-10 rounded-xl border outline-none font-mono ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Sender Display Name</label>
                  <input
                    type="text"
                    value={smtp.from_name}
                    onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">From Reply Email</label>
                  <input
                    type="email"
                    value={smtp.from_email}
                    onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* Encryption & Other Channels */}
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 space-y-2">
                <div className="font-bold text-slate-300 text-xs">Omnichannel Gateway Status:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <div className="font-bold">✉️ Email Channel</div>
                    <div className="text-[10px] text-emerald-300">Active (Gmail SMTP)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <div className="font-bold">💬 WhatsApp Gateway</div>
                    <div className="text-[10px] text-amber-300">Upcoming / In Development</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400">
                    <div className="font-bold">📱 SMS Carrier</div>
                    <div className="text-[10px] text-slate-400">Upcoming / Carrier Webhook</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  disabled={testingSmtp}
                  onClick={handleTestSmtp}
                  className="px-4 py-2 rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{testingSmtp ? 'Testing Handshake...' : 'Test SMTP Connection'}</span>
                </button>

                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition ${accentClasses.btn}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save SMTP Configuration</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DIRECTORY CRAWLERS */}
          {activeTab === 'crawler' && crawler && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Unlimited Automated Directory Crawlers
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clicking &quot;Trigger Instant Crawl&quot; discovers incremental new international contacts without artificial caps.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isCrawling}
                    onClick={() => handleTriggerInstantCrawl('all')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isCrawling ? 'Crawling...' : 'Crawl All Sources Now'}</span>
                  </button>
                </div>
              </div>

              {crawlStatusMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{crawlStatusMsg}</span>
                </div>
              )}

              {/* Active Crawler Sources Checkboxes */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Configured Directory Sources</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {crawler.sources.map((src, idx) => (
                    <label
                      key={src.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        src.active
                          ? isLight
                            ? 'bg-slate-100 border-slate-300'
                            : 'bg-slate-900 border-slate-700'
                          : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={src.active}
                          onChange={(e) => {
                            const next = [...crawler.sources];
                            next[idx].active = e.target.checked;
                            setCrawler({ ...crawler, sources: next });
                          }}
                          className="rounded border-slate-700"
                        />
                        <span className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                          {src.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-slate-400">{src.type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Universal Target Commodities */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Universal Target Commodities for Crawling (Comma Separated)
                </label>
                <textarea
                  rows={3}
                  value={crawler.target_commodities.join(', ')}
                  onChange={(e) =>
                    setCrawler({
                      ...crawler,
                      target_commodities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium leading-relaxed ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              {/* Crawler Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Pages Scrape Depth</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={crawler.crawl_depth_pages}
                    onChange={(e) => setCrawler({ ...crawler, crawl_depth_pages: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Request Delay (sec)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={crawler.request_delay_seconds}
                    onChange={(e) => setCrawler({ ...crawler, request_delay_seconds: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Network Timeout (sec)</label>
                  <input
                    type="number"
                    value={crawler.timeout_seconds}
                    onChange={(e) => setCrawler({ ...crawler, timeout_seconds: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveCrawler}
                  className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition ${accentClasses.btn}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Crawler Parameters</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: COMPETITOR PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Competitor Pricing Matrix & Benchmark Radar
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configured-based pricing intelligence comparing competitor FOB & CIF spot offers against TradePulse quotes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddQuoteModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Competitor Quote</span>
                </button>
              </div>

              {/* Competitor Quotes Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className={`text-[10px] uppercase font-semibold border-b ${
                    isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Competitor</th>
                      <th className="py-2.5 px-3">Commodity & Origin</th>
                      <th className="py-2.5 px-3">Competitor Price ($/MT)</th>
                      <th className="py-2.5 px-3">Our Price ($/MT)</th>
                      <th className="py-2.5 px-3">Spread & Advantage</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {quotes.map((q) => (
                      <tr key={q.quote_id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          <div>{q.competitor_name}</div>
                          <div className="text-[10px] text-slate-400">{q.destination_port}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-300 font-medium">{q.commodity}</div>
                          <div className="text-[10px] text-slate-400">{q.origin_country} &bull; {q.payment_terms}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                          <div>FOB: ${q.fob_price_usd_mt}</div>
                          <div className="text-[10px] text-slate-400">CIF: ${q.cif_price_usd_mt}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          ${q.our_price_usd_mt}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.spread_usd <= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {q.spread_usd <= 0 ? `-$${Math.abs(q.spread_usd)} / MT` : `+$${q.spread_usd} / MT`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCompetitorQuote(q.quote_id)}
                            className="text-slate-400 hover:text-rose-400 p-1"
                            title="Delete Quote"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Competitor Quote Form Modal */}
              {showAddQuoteModal && (
                <div
                  onClick={() => setShowAddQuoteModal(false)}
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                      <h4 className="text-sm font-bold text-slate-200">Record Competitor Spot Offer</h4>
                      <button onClick={() => setShowAddQuoteModal(false)} className="text-slate-400 hover:text-slate-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddCompetitorQuote} className="mt-3 space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Competitor Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Olam International / KRBL"
                          value={newQuote.competitor_name}
                          onChange={(e) => setNewQuote({ ...newQuote, competitor_name: e.target.value })}
                          className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Commodity</label>
                          <input
                            type="text"
                            value={newQuote.commodity}
                            onChange={(e) => setNewQuote({ ...newQuote, commodity: e.target.value })}
                            className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Origin Country</label>
                          <input
                            type="text"
                            value={newQuote.origin_country}
                            onChange={(e) => setNewQuote({ ...newQuote, origin_country: e.target.value })}
                            className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Competitor FOB Price ($/MT)</label>
                          <input
                            type="number"
                            value={newQuote.fob_price_usd_mt}
                            onChange={(e) => setNewQuote({ ...newQuote, fob_price_usd_mt: Number(e.target.value) })}
                            className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Our Counter Price ($/MT)</label>
                          <input
                            type="number"
                            value={newQuote.our_price_usd_mt}
                            onChange={(e) => setNewQuote({ ...newQuote, our_price_usd_mt: Number(e.target.value) })}
                            className="w-full p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddQuoteModal(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                        >
                          Save Quote
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LIFECYCLE STAGES */}
          {activeTab === 'stages' && (
            <div className="space-y-5">
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Sales Pipeline Stages (Kanban Funnel)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {pipelineStages.map((st) => (
                    <div key={st.stage_id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color || '#3b82f6' }} />
                      <div className="truncate font-semibold text-xs text-slate-200">{st.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/40">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Cargo & Ocean Freight Master Milestones
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {shipmentStages.map((st) => (
                    <div key={st.stage_id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                      <div className="truncate font-semibold text-xs text-slate-200">{st.name}</div>
                      <span className="text-[10px] font-mono text-cyan-400">Step {st.order}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

