'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import CustomerDossier from '@/components/CustomerDossier';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
  Compass,
  Play,
  RotateCw,
  CheckCircle2,
  Globe,
  Building2,
  Users,
  Search,
  Sparkles,
  ArrowRight,
  Filter,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  AlertTriangle,
  FileCheck2,
  MapPin,
  ExternalLink,
  BookOpen,
  Database,
  History,
  Tag,
  Check,
  Trash2,
  Edit,
  RefreshCw
} from 'lucide-react';

interface HarvestedLead {
  id: number;
  company_name: string;
  country: string;
  city?: string;
  city_or_hub?: string;
  contact_person?: string;
  phone?: string;
  phones?: string;
  email?: string;
  emails?: string;
  matched_varieties?: string;
  priority_score: number;
  lead_type: string;
  duplicate_probability?: number;
  duplicate_status?: 'unique' | 'partial_match' | 'duplicate' | 'merged';
  source_name?: string;
  source_url?: string;
  source_category?: string;
  source_reliability?: number;
  custom_label?: string;
  extraction_notes?: string;
  merge_count?: number;
  created_at: string;
}

interface TradeSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  country_coverage: string;
  reliability_score: number;
  lead_type: 'importer' | 'supplier';
  is_indian?: boolean;
}

interface ExtractionRecord {
  _id: string;
  job_id: string;
  custom_label: string;
  extraction_notes?: string;
  lead_type: string;
  country: string;
  commodity: string;
  depth: number;
  inserted_count: number;
  merged_count: number;
  total_processed: number;
  created_at: string;
  status: string;
}

interface LiveDashboardStats {
  total_leads?: number;
  importers_count?: number;
  wb_mills_count?: number;
}

export default function CrawlerLeadGenPage() {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  // Sub-views: 'wizard' | 'importers' | 'suppliers' | 'sources' | 'history'
  const [activeTab, setActiveTab] = useState<'wizard' | 'importers' | 'suppliers' | 'sources' | 'history'>('wizard');

  const [harvestedLeads, setHarvestedLeads] = useState<HarvestedLead[]>([]);
  const [tradeSources, setTradeSources] = useState<TradeSource[]>([]);
  const [extractionHistory, setExtractionHistory] = useState<ExtractionRecord[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sourcesFilter, setSourcesFilter] = useState<'all' | 'importer' | 'supplier' | 'indian'>('all');
  const [sourceSearch, setSourceSearch] = useState('');

  const [loadingLeads, setLoadingLeads] = useState(true);
  const [crawlingType, setCrawlingType] = useState<string | null>(null);
  const [crawlMessage, setCrawlMessage] = useState<string | null>(null);
  const [crawlProgress, setCrawlProgress] = useState<number>(0);

  // Dynamic live count statistics from MongoDB
  const [liveStats, setLiveStats] = useState({
    total_leads: 0,
    importers_count: 0,
    suppliers_count: 0,
  });

  // Guided Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetEntityType, setTargetEntityType] = useState<'importer' | 'supplier'>('importer');
  const [targetCountry, setTargetCountry] = useState('Saudi Arabia');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [customCityInput, setCustomCityInput] = useState('');
  const [mapQuery, setMapQuery] = useState('Riyadh, Saudi Arabia');
  const [targetCommodity, setTargetCommodity] = useState('Basmati & Non-Basmati Rice');
  const [targetHsCodes, setTargetHsCodes] = useState('10063010; 10063019');
  const [crawlDepth, setCrawlDepth] = useState<number>(200);
  const [customLabel, setCustomLabel] = useState('Q1-Gulf-Outreach');
  const [extractionNotes, setExtractionNotes] = useState('Sourcing high-volume wholesale buyers for immediate export contracting');
  const [indianSupplierFocus, setIndianSupplierFocus] = useState(true);

  // Filters & Search
  const [probFilter, setProbFilter] = useState<'all' | 'fresh' | 'partial' | 'duplicate'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selected lead for dossier
  const [selectedCustomer, setSelectedCustomer] = useState<HarvestedLead | null>(null);

  const loadLeads = async () => {
    try {
      setLoadingLeads(true);
      const statsRes = await fetchJson<LiveDashboardStats>('/dashboard/stats');
      setLiveStats({
        total_leads: statsRes.total_leads || 0,
        importers_count: statsRes.importers_count || 0,
        suppliers_count: statsRes.wb_mills_count || 0,
      });

      let endpoint = '/leads?per_page=250';
      if (activeTab === 'importers') endpoint = '/leads/importers?per_page=250';
      if (activeTab === 'suppliers') endpoint = '/leads/suppliers?per_page=250';

      const res = await fetchJson<{
        leads?: HarvestedLead[];
        importers?: HarvestedLead[];
        suppliers?: HarvestedLead[];
      }>(endpoint);

      const items = res.leads || res.importers || res.suppliers || [];
      setHarvestedLeads(items);
      setCurrentPage(1);
    } catch (e) {
      console.error('Failed to load leads from MongoDB', e);
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const res = await fetchJson<{ sources: TradeSource[] }>('/crawler/sources');
      setTradeSources(res.sources || []);
    } catch (e) {
      console.error('Failed to load trade sources registry', e);
    } finally {
      setLoadingSources(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetchJson<{ history: ExtractionRecord[] }>('/crawler/history');
      setExtractionHistory(res.history || []);
    } catch (e) {
      console.error('Failed to load extraction history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sources') loadSources();
    else if (activeTab === 'history') loadHistory();
    else loadLeads();
  }, [activeTab]);

  const effectiveCountry = useMemo(() => {
    if (targetCountry === 'CUSTOM') {
      return customCountryInput.trim() || 'Saudi Arabia';
    }
    return targetCountry;
  }, [targetCountry, customCountryInput]);

  const runGuidedExtraction = async () => {
    setCrawlingType(targetEntityType);
    setCrawlProgress(15);
    setCrawlMessage(`Step 1/3: Initializing ${targetEntityType === 'importer' ? 'Global Importer' : 'Supplier'} Crawler for ${effectiveCountry}...`);

    try {
      const endpoint = '/scrape/crawl-now';

      setTimeout(() => setCrawlProgress(45), 600);
      setTimeout(() => {
        setCrawlProgress(75);
        setCrawlMessage(`Step 2/3: Querying trade registries & executing 95% ML similarity deduplication...`);
      }, 1500);

      const res = await fetchJson<{ success?: boolean; message?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          lead_type: targetEntityType,
          country: effectiveCountry,
          commodity: targetCommodity,
          depth: crawlDepth,
          custom_city: customCityInput.trim() || undefined,
          custom_label: customLabel.trim() || 'Standard Harvest',
          extraction_notes: extractionNotes.trim() || undefined,
        }),
      });

      setCrawlProgress(100);
      setCrawlMessage(res.message || `Extraction complete! Processed ${crawlDepth} verified leads strictly for ${effectiveCountry}.`);

      setTimeout(() => {
        loadLeads();
        loadHistory();
      }, 2000);
    } catch (err: any) {
      setCrawlMessage('Crawler error: ' + err.message);
    } finally {
      setTimeout(() => {
        setCrawlingType(null);
        setCrawlProgress(0);
      }, 4000);
    }
  };

  const handleDeleteLead = async (id: number) => {
    if (!confirm('Move this lead to the Soft-Delete Trash Bin?')) return;
    try {
      await fetchJson(`/leads/${id}`, { method: 'DELETE' });
      setHarvestedLeads((prev) => prev.filter((l) => l.id !== id));
      loadLeads();
    } catch (err: any) {
      alert('Failed to delete lead: ' + err.message);
    }
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return harvestedLeads.filter((l) => {
      if (activeTab === 'importers' && l.lead_type !== 'importer') return false;
      if (activeTab === 'suppliers' && l.lead_type === 'importer') return false;

      // Custom label filter
      if (labelFilter !== 'all' && l.custom_label !== labelFilter) return false;

      // Probability filter
      const prob = typeof l.duplicate_probability === 'number' ? l.duplicate_probability : 7.5;
      if (probFilter === 'fresh' && prob >= 30) return false;
      if (probFilter === 'partial' && (prob < 30 || prob >= 75)) return false;
      if (probFilter === 'duplicate' && prob < 75) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (l.company_name || '').toLowerCase();
        const country = (l.country || '').toLowerCase();
        const city = (l.city || l.city_or_hub || '').toLowerCase();
        const com = (l.matched_varieties || '').toLowerCase();
        const src = (l.source_name || '').toLowerCase();
        const lbl = (l.custom_label || '').toLowerCase();
        if (!name.includes(q) && !country.includes(q) && !city.includes(q) && !com.includes(q) && !src.includes(q) && !lbl.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [harvestedLeads, activeTab, probFilter, searchQuery, labelFilter]);

  // Paginated slice
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage]);

  // Sources filtered
  const filteredSources = useMemo(() => {
    return tradeSources.filter((s) => {
      if (sourcesFilter === 'importer' && s.lead_type !== 'importer') return false;
      if (sourcesFilter === 'supplier' && s.lead_type !== 'supplier') return false;
      if (sourcesFilter === 'indian' && !s.is_indian && !s.country_coverage.toLowerCase().includes('india')) return false;
      if (sourceSearch.trim()) {
        const q = sourceSearch.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.country_coverage.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tradeSources, sourcesFilter, sourceSearch]);

  const navItems: PageSubNavItem[] = [
    {
      id: 'wizard',
      label: 'Guided Extraction Wizard',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      badge: 'Step-by-Step',
      onClick: () => setActiveTab('wizard'),
      active: activeTab === 'wizard',
      desc: 'Pipeline lead generation',
    },
    {
      id: 'importers',
      label: 'Verified Importers',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      badge: liveStats.importers_count,
      onClick: () => setActiveTab('importers'),
      active: activeTab === 'importers',
      desc: 'Wholesale buyers in DB',
    },
    {
      id: 'suppliers',
      label: 'Verified Suppliers',
      icon: <Building2 className="w-4 h-4 text-emerald-400" />,
      badge: liveStats.suppliers_count,
      onClick: () => setActiveTab('suppliers'),
      active: activeTab === 'suppliers',
      desc: 'Export processing mills',
    },
    {
      id: 'history',
      label: 'Extraction History & Audits',
      icon: <History className="w-4 h-4 text-amber-400" />,
      badge: extractionHistory.length > 0 ? extractionHistory.length : undefined,
      onClick: () => setActiveTab('history'),
      active: activeTab === 'history',
      desc: 'Custom run audit logs',
    },
    {
      id: 'sources',
      label: 'Trade Sources Registry',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      badge: '216 Sources',
      onClick: () => setActiveTab('sources'),
      active: activeTab === 'sources',
      desc: '108 Buyer & 108 Mill registries',
    },
  ];

  return (
    <Shell>
      <div className="space-y-6 pb-16">
        {/* Top Header */}
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
                Continuous Harvesting Pipeline
              </span>
              <span className="text-xs text-slate-400 font-mono">
                95% ML Dedup Active • 216 Verified Registries
              </span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Compass className="w-6 h-6 text-purple-400" />
              Lead Generation & Extraction Pipeline
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-step guided sourcing with custom labels, Google Maps coordinates search, 95% ML deduplication, and continuous DB harvesting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sources')}
              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>216 Trade Sources</span>
            </button>
            <Link
              href="/settings"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Horizontal Navigation Header Bar */}
        <PageLeftNav
          title="Lead Desk"
          subtitle="Pipeline & Registries"
          items={navItems}
          activeId={activeTab}
        >
          {/* TAB 1: GUIDED EXTRACTION WIZARD */}
          {activeTab === 'wizard' && (
            <div className="space-y-6">
              {/* Step Indicators */}
              <div
                className={`p-4 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { step: 1, title: 'Target & Territory', subtitle: 'Type & Coordinates' },
                    { step: 2, title: 'Commodity & HS Code', subtitle: 'Product Specification' },
                    { step: 3, title: 'Verified Registries', subtitle: '216 Sources & Indian Focus' },
                    { step: 4, title: 'Audit Label & Launch', subtitle: 'Custom Tag & Depth' },
                  ].map((s) => {
                    const isCurrent = wizardStep === s.step;
                    const isDone = wizardStep > s.step;
                    return (
                      <button
                        key={s.step}
                        onClick={() => setWizardStep(s.step as any)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isCurrent
                            ? 'border-purple-500 bg-purple-500/10 shadow-sm'
                            : isDone
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                              isCurrent
                                ? 'bg-purple-500 text-white'
                                : isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isDone ? <Check className="w-3 h-3" /> : s.step}
                          </span>
                          <span className={`text-xs font-bold truncate ${isCurrent ? 'text-purple-400' : isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {s.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 pl-7 truncate">{s.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 1: Entity Type & Territory */}
              {wizardStep === 1 && (
                <div
                  className={`p-6 rounded-2xl border space-y-6 ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Step 1: Choose Entity Type & Geographic Location
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select whether you want to discover Global Buyers or Certified Mills, and lock the target territory.
                    </p>
                  </div>

                  {/* Entity Type Toggle */}
                  <div className="grid grid-cols-2 gap-4 max-w-xl">
                    <button
                      type="button"
                      onClick={() => setTargetEntityType('importer')}
                      className={`p-4 rounded-xl border text-left transition flex items-center gap-3 ${
                        targetEntityType === 'importer'
                          ? 'border-blue-500 bg-blue-500/10 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40'
                      }`}
                    >
                      <Globe className="w-6 h-6 text-blue-400" />
                      <div>
                        <span className="text-xs font-bold text-white block">Global Importers / Buyers</span>
                        <span className="text-[11px] text-slate-400">Wholesale procurement & trade tenders</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetEntityType('supplier')}
                      className={`p-4 rounded-xl border text-left transition flex items-center gap-3 ${
                        targetEntityType === 'supplier'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40'
                      }`}
                    >
                      <Building2 className="w-6 h-6 text-emerald-400" />
                      <div>
                        <span className="text-xs font-bold text-white block">Certified Suppliers / Mills</span>
                        <span className="text-[11px] text-slate-400">Commercial processing facilities & producers</span>
                      </div>
                    </button>
                  </div>

                  {/* Country Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Target Country (35+ Major Trading Nations)
                      </label>
                      <select
                        value={targetCountry}
                        onChange={(e) => setTargetCountry(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3.5 py-2.5 rounded-xl outline-none focus:border-purple-500"
                      >
                        <optgroup label="Middle East & GCC">
                          <option value="Saudi Arabia">Saudi Arabia (Jeddah, Riyadh, Dammam)</option>
                          <option value="United Arab Emirates">United Arab Emirates (Dubai, Jebel Ali)</option>
                          <option value="Qatar">Qatar (Doha, Hamad Port)</option>
                          <option value="Oman">Oman (Muscat, Sohar)</option>
                          <option value="Kuwait">Kuwait (Shuwaikh Port)</option>
                          <option value="Bahrain">Bahrain (Manama, Khalifa Port)</option>
                        </optgroup>
                        <optgroup label="South Asia (Premier Supplier Hubs)">
                          <option value="India">India (Burdwan, Kolkata, Kakinada, Mundra, Karnal)</option>
                          <option value="Bangladesh">Bangladesh (Chittagong, Dhaka)</option>
                          <option value="Sri Lanka">Sri Lanka (Colombo Port)</option>
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="Germany">Germany (Hamburg, Bremen)</option>
                          <option value="Netherlands">Netherlands (Port of Rotterdam)</option>
                          <option value="Belgium">Belgium (Port of Antwerp-Bruges)</option>
                          <option value="United Kingdom">United Kingdom (London Gateway, Felixstowe)</option>
                          <option value="France">France (Le Havre, Marseille)</option>
                          <option value="Italy">Italy (Genoa, Trieste)</option>
                          <option value="Spain">Spain (Valencia, Barcelona)</option>
                        </optgroup>
                        <optgroup label="Southeast & East Asia">
                          <option value="Singapore">Singapore (Jurong Port)</option>
                          <option value="Vietnam">Vietnam (Cat Lai, Haiphong)</option>
                          <option value="Thailand">Thailand (Laem Chabang, Bangkok)</option>
                          <option value="Philippines">Philippines (Port of Manila)</option>
                          <option value="Indonesia">Indonesia (Tanjung Priok)</option>
                          <option value="Malaysia">Malaysia (Port Klang)</option>
                          <option value="Japan">Japan (Yokohama, Tokyo)</option>
                          <option value="South Korea">South Korea (Busan Port)</option>
                        </optgroup>
                        <optgroup label="Africa">
                          <option value="Togo">Togo (Autonomous Port of Lomé)</option>
                          <option value="Nigeria">Nigeria (Apapa Port, Tin Can Island)</option>
                          <option value="Kenya">Kenya (Kilindini Harbour Mombasa)</option>
                          <option value="South Africa">South Africa (Durban, Cape Town)</option>
                          <option value="Ghana">Ghana (Tema Port, Takoradi)</option>
                          <option value="Senegal">Senegal (Port of Dakar)</option>
                          <option value="Benin">Benin (Port of Cotonou)</option>
                          <option value="Ivory Coast">Ivory Coast (Abidjan Autonomous Port)</option>
                        </optgroup>
                        <optgroup label="Americas">
                          <option value="United States">United States (Los Angeles, New York/NJ)</option>
                          <option value="Canada">Canada (Vancouver, Montreal)</option>
                          <option value="Brazil">Brazil (Port of Santos)</option>
                          <option value="Mexico">Mexico (Manzanillo, Veracruz)</option>
                        </optgroup>
                        <option value="CUSTOM">Custom Country / Region (Powered by Google Maps)</option>
                      </select>
                    </div>

                    {targetCountry === 'CUSTOM' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-purple-400 mb-1.5">
                          Custom Location Search (Google Maps Integrated)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Lomé, Togo or Reykjavik, Iceland"
                            value={customCountryInput}
                            onChange={(e) => setCustomCountryInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-purple-500/50 text-xs text-white px-3.5 py-2.5 rounded-xl outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Specific City (Optional)"
                            value={customCityInput}
                            onChange={(e) => setCustomCityInput(e.target.value)}
                            className="w-40 bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => setWizardStep(2)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
                    >
                      <span>Next: Select Commodity</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Commodity & HS Code */}
              {wizardStep === 2 && (
                <div
                  className={`p-6 rounded-2xl border space-y-6 ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Step 2: Commodity & Harmonized System (HS) Codes
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Specify the trade merchandise, grain grade, or agricultural commodity to filter relevant tenders.
                    </p>
                  </div>

                  {/* Commodity Quick Select Pills */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Quick Select Commodity</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Basmati Rice (1121, Traditional)', hs: '10063020' },
                        { label: 'IR-64 Parboiled Non-Basmati Rice', hs: '10063010; 10063019' },
                        { label: 'Swarna / Miniket Bulk Cargo', hs: '10063090' },
                        { label: 'Organic Turmeric & Spices', hs: '09103020; 090411' },
                        { label: 'Raw Cotton & 100% Combed Yarn', hs: '520100; 520523' },
                        { label: 'Refined Cane Sugar (ICUMSA 45)', hs: '170199' },
                        { label: 'Industrial Steel Billets & Wire Rods', hs: '720711; 721391' },
                        { label: 'Wheat, Yellow Corn & Pulses', hs: '100199; 100590' },
                      ].map((item) => {
                        const isSelected = targetCommodity === item.label;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setTargetCommodity(item.label);
                              setTargetHsCodes(item.hs);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                              isSelected
                                ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Custom Commodity Specification</label>
                      <input
                        type="text"
                        value={targetCommodity}
                        onChange={(e) => setTargetCommodity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3.5 py-2.5 rounded-xl outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Applicable HS Codes</label>
                      <input
                        type="text"
                        value={targetHsCodes}
                        onChange={(e) => setTargetHsCodes(e.target.value)}
                        placeholder="e.g. 10063010; 10063019"
                        className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-white px-3.5 py-2.5 rounded-xl outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
                    >
                      <span>Next: Trade Registries</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Trade Sources & Indian Focus */}
              {wizardStep === 3 && (
                <div
                  className={`p-6 rounded-2xl border space-y-6 ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Step 3: Verified Trade Registries & Sourcing Engines
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target over 216 verified trade sources (108 Importers and 108 Suppliers), with dedicated focus on Indian export bodies.
                    </p>
                  </div>

                  {/* Highlights Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                      <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">108 Buyer Registries</span>
                      <p className="text-xs font-semibold text-white mt-1">UN Comtrade, Panjiva, Port Customs</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Customs manifest bills of lading across 35+ countries.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">77 Indian Export Bodies</span>
                      <p className="text-xs font-semibold text-white mt-1">APEDA, FIEO, EEPC, AIREA, Rice Millers</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Primary Indian producers, state agro boards, and verified mills.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                      <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Multi-Factor ML Merge</span>
                      <p className="text-xs font-semibold text-white mt-1">95% Deduplication Engine</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Auto-merges duplicate contacts, enriching phone and email trails.</p>
                    </div>
                  </div>

                  {/* Indian Supplier Priority Toggle */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indianSupplierFocus}
                      onChange={(e) => setIndianSupplierFocus(e.target.checked)}
                      className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-300 block">
                        Prioritize Indian Supplier Registries (APEDA, FIEO, AIREA, Spices Board)
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Heavily routes extraction through accredited Indian export promotion councils and state millers associations.
                      </span>
                    </div>
                  </label>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
                    >
                      <span>Next: Custom Label & Launch</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Custom Label, Audit Notes & Depth Launch */}
              {wizardStep === 4 && (
                <div
                  className={`p-6 rounded-2xl border space-y-6 ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Step 4: Custom Audit Labeling & Extraction Launch
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assign a distinct campaign label so you can track why these leads were harvested and audit their progression.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        Custom Campaign Label (Required for Audit History)
                      </label>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g. Q1-Gulf-Basmati-Outreach"
                        className="w-full bg-slate-950 border border-purple-500/60 text-xs font-mono text-white px-3.5 py-2.5 rounded-xl outline-none"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Every harvested lead will be tagged with this label for easy funnel filtering.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Extraction Depth (Continuous Batch Size)
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[25, 50, 100, 200, 500].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setCrawlDepth(d)}
                            className={`py-2 rounded-xl text-xs font-mono font-bold transition border ${
                              crawlDepth === d
                                ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Select batch volume. Extractions above 95% similarity will be intelligently merged.
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Extraction Objective Notes & Sourcing Context
                      </label>
                      <textarea
                        rows={2}
                        value={extractionNotes}
                        onChange={(e) => setExtractionNotes(e.target.value)}
                        placeholder="e.g. Sourcing 250-500 MT parboiled buyers in UAE for upcoming autumn harvest season"
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3.5 py-2 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Role:</span>
                      <span className="font-bold text-white uppercase">{targetEntityType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Territory:</span>
                      <span className="font-bold text-white">{effectiveCountry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Commodity Line:</span>
                      <span className="font-bold text-white">{targetCommodity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Harvest Depth:</span>
                      <span className="font-bold text-emerald-400 font-mono">{crawlDepth} Records</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Custom Audit Label:</span>
                      <span className="font-bold text-purple-400 font-mono">{customLabel}</span>
                    </div>
                  </div>

                  {/* Extraction Progress Animation */}
                  {crawlingType && (
                    <div className="space-y-2 p-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                        <span>{crawlMessage}</span>
                        <span className="font-mono">{crawlProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${crawlProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={runGuidedExtraction}
                      disabled={!!crawlingType}
                      className={`px-6 py-3 rounded-xl text-xs font-black text-white uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-purple-500/20 ${accentClasses.btn}`}
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{crawlingType ? 'Extracting Leads...' : `Launch Extraction (${crawlDepth} Leads)`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTRACTION HISTORY & AUDIT LOGS */}
          {activeTab === 'history' && (
            <div
              className={`p-6 rounded-2xl border space-y-6 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Extraction History & Campaign Audit Trail
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Historical record of every continuous extraction job with custom labels, unique additions, and 95%+ duplicate merges.
                  </p>
                </div>
                <button
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {extractionHistory.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-800">
                  <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No extraction history logged yet.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Run a crawl using the Guided Wizard to generate your first audit run.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Custom Campaign Label</th>
                        <th className="py-3 px-4">Role & Country</th>
                        <th className="py-3 px-4">Commodity</th>
                        <th className="py-3 px-4 text-center">Batch Depth</th>
                        <th className="py-3 px-4 text-center">New Leads</th>
                        <th className="py-3 px-4 text-center">95%+ Merged</th>
                        <th className="py-3 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {extractionHistory.map((rec) => (
                        <tr key={rec._id || rec.job_id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400">
                              {rec.custom_label || 'Standard Outreach'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">
                            <span className="capitalize">{rec.lead_type}</span> &bull; {rec.country}
                          </td>
                          <td className="py-3 px-4 text-slate-300 truncate max-w-xs">{rec.commodity}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-300">{rec.depth || rec.total_processed}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                            +{rec.inserted_count}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">
                            {rec.merged_count || 0}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                            {rec.created_at ? rec.created_at.slice(0, 16).replace('T', ' ') : 'Recently'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3 & 4: HARVESTED LEADS TABLE (IMPORTERS & SUPPLIERS) */}
          {(activeTab === 'importers' || activeTab === 'suppliers') && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search company, country, commodity, or custom label..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Duplicate Filter */}
                  <select
                    value={probFilter}
                    onChange={(e) => setProbFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-2 rounded-xl outline-none"
                  >
                    <option value="all">All Match Scores</option>
                    <option value="fresh">Fresh Discovery (&lt;30%)</option>
                    <option value="partial">Partial Match (30%-75%)</option>
                    <option value="duplicate">95%+ Merged / Existing</option>
                  </select>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Showing {paginatedLeads.length} of {filteredLeads.length} leads
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4">Territory / Port</th>
                      <th className="py-3 px-4">Commodity</th>
                      <th className="py-3 px-4">Trade Source</th>
                      <th className="py-3 px-4">Custom Campaign Tag</th>
                      <th className="py-3 px-4">Dedup Probability</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {paginatedLeads.map((lead) => {
                      const prob = typeof lead.duplicate_probability === 'number' ? lead.duplicate_probability : 7.5;
                      const isMerged = lead.merge_count && lead.merge_count > 1;
                      return (
                        <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedCustomer(lead)}
                              className="font-bold text-white hover:text-purple-400 transition text-left block"
                            >
                              {lead.company_name}
                            </button>
                            <span className="text-[10px] text-slate-400 block">{lead.contact_person || 'Procurement Office'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-200">{lead.country}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{lead.city_or_hub || lead.city}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-[160px] truncate">
                            {lead.matched_varieties}
                          </td>
                          <td className="py-3 px-4">
                            <a
                              href={lead.source_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate max-w-[130px]">{lead.source_name || 'Verified Registry'}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300">
                              {lead.custom_label || 'Standard Outreach'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  prob >= 75
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : prob >= 30
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {prob}%
                              </span>
                              {isMerged && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Merged x{lead.merge_count}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedCustomer(lead)}
                              className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 text-[11px] font-bold"
                            >
                              Dossier
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400"
                              title="Soft delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: 216 TRADE SOURCES REGISTRY */}
          {activeTab === 'sources' && (
            <div
              className={`p-6 rounded-2xl border space-y-6 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Verified Trade Sources Registry (216 Portals & Promotion Councils)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    108 Verified Global Importer Registries and 108 Supplier Registries, with 77 Indian Export Promotion Councils & Boards.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { id: 'all', label: 'All 216 Sources' },
                    { id: 'importer', label: 'Importers (108)' },
                    { id: 'supplier', label: 'Suppliers (108)' },
                    { id: 'indian', label: 'Indian Councils (77)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSourcesFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        sourcesFilter === f.id
                          ? 'bg-amber-500 text-white border-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="max-w-md">
                <input
                  type="text"
                  placeholder="Search 216 sources by name, category, or country..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Sources Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredSources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                          {src.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                          {src.reliability_score}% Reliable
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-2 leading-tight">{src.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Coverage: {src.country_coverage}</p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-slate-500">{src.lead_type}</span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Visit Registry</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PageLeftNav>

        {/* Selected Customer Dossier Modal */}
        {selectedCustomer && (
          <CustomerDossier
            customer={selectedCustomer as any}
            onClose={() => {
              setSelectedCustomer(null);
              loadLeads();
            }}
          />
        )}
      </div>
    </Shell>
  );
}
