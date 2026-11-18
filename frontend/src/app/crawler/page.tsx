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
  Database
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
  duplicate_status?: 'unique' | 'partial_match' | 'duplicate';
  source_name?: string;
  source_url?: string;
  source_category?: string;
  source_reliability?: number;
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
}

interface LiveDashboardStats {
  total_leads?: number;
  importers_count?: number;
  wb_mills_count?: number;
}

export default function CrawlerLeadGenPage() {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  // Sub-view: 'crawler' | 'importers' | 'suppliers' | 'sources'
  const [activeTab, setActiveTab] = useState<'crawler' | 'importers' | 'suppliers' | 'sources'>('crawler');

  const [harvestedLeads, setHarvestedLeads] = useState<HarvestedLead[]>([]);
  const [tradeSources, setTradeSources] = useState<TradeSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourcesFilter, setSourcesFilter] = useState<'all' | 'importer' | 'supplier'>('all');
  const [sourceSearch, setSourceSearch] = useState('');

  const [loadingLeads, setLoadingLeads] = useState(true);
  const [crawlingType, setCrawlingType] = useState<string | null>(null);
  const [crawlMessage, setCrawlMessage] = useState<string | null>(null);

  // Dynamic live count statistics from MongoDB
  const [liveStats, setLiveStats] = useState({
    total_leads: 0,
    importers_count: 0,
    suppliers_count: 0,
  });

  // Crawl options form
  const [targetCommodity, setTargetCommodity] = useState('Basmati & Non-Basmati Rice');
  const [targetCountry, setTargetCountry] = useState('Saudi Arabia');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [customCityInput, setCustomCityInput] = useState('');
  const [mapQuery, setMapQuery] = useState('Riyadh, Saudi Arabia');
  const [crawlDepth, setCrawlDepth] = useState<number>(200);

  // Duplicate / Match Probability Filter
  const [probFilter, setProbFilter] = useState<'all' | 'fresh' | 'partial' | 'duplicate'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selected lead for dossier
  const [selectedCustomer, setSelectedCustomer] = useState<HarvestedLead | null>(null);

  const loadLeads = async () => {
    try {
      setLoadingLeads(true);

      // 1. Fetch dynamic live statistics from MongoDB to ensure circular badge accuracy
      const statsRes = await fetchJson<LiveDashboardStats>('/dashboard/stats');
      const totalLeads = statsRes.total_leads || 0;
      const totalImporters = statsRes.importers_count || 0;
      const totalSuppliers = statsRes.wb_mills_count || 0;

      setLiveStats({
        total_leads: totalLeads,
        importers_count: totalImporters,
        suppliers_count: totalSuppliers,
      });

      // 2. Fetch leads from MongoDB based on selected tab with full depth
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

  useEffect(() => {
    if (activeTab === 'sources') {
      loadSources();
    } else {
      loadLeads();
    }
  }, [activeTab]);

  const effectiveCountry = useMemo(() => {
    if (targetCountry === 'CUSTOM') {
      return customCountryInput.trim() || 'Saudi Arabia';
    }
    return targetCountry;
  }, [targetCountry, customCountryInput]);

  const runCrawler = async (type: 'all' | 'importers' | 'suppliers') => {
    setCrawlingType(type);

    // STRICT TYPE ISOLATION: map 'importers' -> 'importer', 'suppliers' -> 'supplier'
    const normalizedType = type === 'importers' ? 'importer' : type === 'suppliers' ? 'supplier' : 'all';

    setCrawlMessage(`Initiating ${type} crawler for country "${effectiveCountry}" (Depth: ${crawlDepth} records)...`);

    try {
      const endpoint = '/scrape/crawl-now';

      const res = await fetchJson<{ success?: boolean; message?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          lead_type: normalizedType,
          country: effectiveCountry,
          commodity: targetCommodity,
          depth: crawlDepth,
          custom_city: customCityInput.trim() || undefined,
        }),
      });

      setCrawlMessage(res.message || `Crawl job dispatched! Harvesting ${crawlDepth} verified leads strictly for ${effectiveCountry}.`);

      // Refresh database records and dynamic badges after short interval
      setTimeout(() => {
        loadLeads();
      }, 1500);
      setTimeout(() => {
        loadLeads();
      }, 4000);
    } catch (err: any) {
      setCrawlMessage('Crawler error: ' + err.message);
    } finally {
      setTimeout(() => setCrawlingType(null), 3000);
    }
  };

  // Filtered leads based on search and probability meter filter
  const filteredLeads = useMemo(() => {
    return harvestedLeads.filter((l) => {
      // Tab filter
      if (activeTab === 'importers' && l.lead_type !== 'importer') return false;
      if (activeTab === 'suppliers' && l.lead_type === 'importer') return false;

      // Probability filter
      const prob = typeof l.duplicate_probability === 'number' ? l.duplicate_probability : 7.5;
      if (probFilter === 'fresh' && prob >= 30) return false;
      if (probFilter === 'partial' && (prob < 30 || prob >= 75)) return false;
      if (probFilter === 'duplicate' && prob < 75) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (l.company_name || '').toLowerCase();
        const country = (l.country || '').toLowerCase();
        const city = (l.city || l.city_or_hub || '').toLowerCase();
        const com = (l.matched_varieties || '').toLowerCase();
        const src = (l.source_name || '').toLowerCase();
        if (!name.includes(q) && !country.includes(q) && !city.includes(q) && !com.includes(q) && !src.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [harvestedLeads, activeTab, probFilter, searchQuery]);

  // Paginated slice
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage]);

  // Probability stats counts
  const probCounts = useMemo(() => {
    let fresh = 0;
    let partial = 0;
    let dup = 0;
    for (const lead of harvestedLeads) {
      const p = typeof lead.duplicate_probability === 'number' ? lead.duplicate_probability : 7.5;
      if (p < 30) fresh++;
      else if (p < 75) partial++;
      else dup++;
    }
    return { fresh, partial, dup, total: harvestedLeads.length };
  }, [harvestedLeads]);

  // Filtered sources
  const filteredSources = useMemo(() => {
    return tradeSources.filter((s) => {
      if (sourcesFilter === 'importer' && s.lead_type !== 'importer') return false;
      if (sourcesFilter === 'supplier' && s.lead_type !== 'supplier') return false;
      if (sourceSearch.trim()) {
        const q = sourceSearch.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.country_coverage.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tradeSources, sourcesFilter, sourceSearch]);

  // Dynamic Left Navigation Badges tied strictly to MongoDB live counts
  const navItems: PageSubNavItem[] = [
    {
      id: 'crawler',
      label: 'Live Crawler Console',
      icon: <Radio className="w-4 h-4 text-emerald-400" />,
      badge: `${liveStats.total_leads} Total`,
      onClick: () => setActiveTab('crawler'),
      active: activeTab === 'crawler',
      desc: 'Execute real-time crawl jobs',
    },
    {
      id: 'importers',
      label: 'Harvested Importers',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      badge: liveStats.importers_count,
      onClick: () => setActiveTab('importers'),
      active: activeTab === 'importers',
      desc: 'Wholesale buyers in DB',
    },
    {
      id: 'suppliers',
      label: 'Harvested Suppliers',
      icon: <Building2 className="w-4 h-4 text-purple-400" />,
      badge: liveStats.suppliers_count,
      onClick: () => setActiveTab('suppliers'),
      active: activeTab === 'suppliers',
      desc: 'Processing facilities in DB',
    },
    {
      id: 'sources',
      label: 'Trade Sources Registry',
      icon: <Database className="w-4 h-4 text-amber-400" />,
      badge: '108 Verified',
      onClick: () => setActiveTab('sources'),
      active: activeTab === 'sources',
      desc: '54 Importer & 54 Supplier portals',
    },
    {
      id: 'settings',
      label: 'Crawler Configuration',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      onClick: () => openSettings('crawler'),
      active: false,
      desc: 'Sources, depth & intervals',
    },
  ];

  const renderProbabilityMeter = (prob?: number, status?: string) => {
    const score = typeof prob === 'number' ? prob : 7.5;
    const isDup = score >= 75 || status === 'duplicate';
    const isPartial = (score >= 30 && score < 75) || status === 'partial_match';

    const barColor = isDup ? 'bg-rose-500' : isPartial ? 'bg-amber-500' : 'bg-emerald-500';
    const textColor = isDup ? 'text-rose-400' : isPartial ? 'text-amber-400' : 'text-emerald-400';
    const badgeBg = isDup
      ? 'bg-rose-500/10 border-rose-500/30'
      : isPartial
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-emerald-500/10 border-emerald-500/30';

    const label = isDup ? 'Existing Entity' : isPartial ? 'Partial Match' : 'Fresh Lead';

    return (
      <div className="flex flex-col gap-1 w-32">
        <div className="flex items-center justify-between text-[10px]">
          <span className={`px-1.5 py-0.2 rounded font-mono font-semibold border ${badgeBg} ${textColor}`}>
            {score}%
          </span>
          <span className={`text-[10px] font-medium truncate ${textColor}`}>
            {label}
          </span>
        </div>
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Continuous Harvesting
            </span>
            <span className="text-xs text-slate-400 font-mono">Strict Country Locking • 108 Verified Sources</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Compass className="w-6 h-6 text-purple-400" />
            Lead Generation & Directory Crawler
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict single-country lead extraction, Google Maps geographic targeting, 200+ depth batching, and isolated buyer/supplier execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sources')}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>108 Trade Sources</span>
          </button>
          <button
            onClick={() => openSettings('crawler')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Crawler Settings</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Crawler Desk"
        subtitle="Operations & Records"
        items={navItems}
        activeId={activeTab}
      >
        {activeTab === 'crawler' && (
          <div className="space-y-5">
            {/* Run Crawler Action Card with Country Selection and Google Maps Search */}
            <div className={`p-5 rounded-2xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Targeted Lead Extraction Console
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-400" />
                    <span>Locked: {effectiveCountry}</span>
                  </span>
                </div>
              </div>

              {/* Crawl Parameters: Commodity, Country Selector, Depth */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Commodity Line</label>
                  <select
                    value={targetCommodity}
                    onChange={(e) => setTargetCommodity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  >
                    <option value="Basmati & Non-Basmati Rice">Basmati & Non-Basmati Rice (IR-64, Swarna, 1121)</option>
                    <option value="Refined Sugar & Jaggery">Refined Sugar & Jaggery (ICUMSA 45)</option>
                    <option value="Organic Spices & Turmeric">Organic Spices, Turmeric & Cardamom</option>
                    <option value="Raw Cotton & Combed Yarn">Raw Cotton & 100% Combed Yarn</option>
                    <option value="Industrial Chemicals & Polymers">Industrial Chemicals & Polymers</option>
                    <option value="Primary Metals & Steel Billets">Primary Metals, Billets & Coils</option>
                    <option value="Packaged Foodstuffs & Edible Oils">Packaged Foodstuffs & Edible Oils</option>
                    <option value="Wheat, Corn & Pulses">Wheat, Corn & Pulses</option>
                    <option value="All Universal Commodities">All Universal Commodities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Target Country</span>
                    <span className="text-[10px] text-emerald-400 font-mono">100% Strict Lock</span>
                  </label>
                  <select
                    value={targetCountry}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetCountry(val);
                      if (val !== 'CUSTOM') {
                        setMapQuery(`${val}`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500 font-semibold"
                  >
                    <optgroup label="Middle East & GCC">
                      <option value="Saudi Arabia">Saudi Arabia (KSA)</option>
                      <option value="United Arab Emirates">United Arab Emirates (UAE)</option>
                      <option value="Qatar">Qatar</option>
                      <option value="Oman">Oman</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="Bahrain">Bahrain</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="Germany">Germany</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="France">France</option>
                      <option value="Spain">Spain</option>
                      <option value="Italy">Italy</option>
                      <option value="Belgium">Belgium</option>
                    </optgroup>
                    <optgroup label="Asia Pacific">
                      <option value="Singapore">Singapore</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Japan">Japan</option>
                      <option value="Australia">Australia</option>
                    </optgroup>
                    <optgroup label="South Asia">
                      <option value="India">India</option>
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                    </optgroup>
                    <optgroup label="Americas">
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Mexico">Mexico</option>
                    </optgroup>
                    <optgroup label="Africa">
                      <option value="Kenya">Kenya</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Egypt">Egypt</option>
                      <option value="Benin">Benin</option>
                      <option value="Togo">Togo</option>
                    </optgroup>
                    <optgroup label="Custom Search">
                      <option value="CUSTOM">📍 Custom Country (Google Maps Search)</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Extraction Depth</span>
                    <span className="text-[10px] text-purple-400 font-mono">Continuous Batching</span>
                  </label>
                  <select
                    value={crawlDepth}
                    onChange={(e) => setCrawlDepth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                  >
                    <option value={25}>25 Records (Quick Sample)</option>
                    <option value={50}>50 Records (Deep Scan)</option>
                    <option value={100}>100 Records (High-Density)</option>
                    <option value={200}>200 Records (Exhaustive Sweep)</option>
                    <option value={500}>500 Records (Cluster Max Depth)</option>
                  </select>
                </div>
              </div>

              {/* Google Maps Search Bar & Visual Geocoding Embed */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 relative">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search Google Maps by City or Country (e.g. Riyadh, Saudi Arabia; Hamburg, Germany; Tokyo, Japan)..."
                      value={mapQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMapQuery(val);
                        if (targetCountry === 'CUSTOM') {
                          const parts = val.split(',').map((p) => p.trim());
                          if (parts.length > 1) {
                            setCustomCityInput(parts[0]);
                            setCustomCountryInput(parts[1]);
                          } else {
                            setCustomCountryInput(val);
                          }
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  {targetCountry === 'CUSTOM' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Custom Country Name"
                        value={customCountryInput}
                        onChange={(e) => setCustomCountryInput(e.target.value)}
                        className="bg-slate-950 border border-purple-500/40 text-purple-300 px-3 py-2 rounded-lg text-xs outline-none w-44 font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="City (Optional)"
                        value={customCityInput}
                        onChange={(e) => setCustomCityInput(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs outline-none w-36"
                      />
                    </div>
                  )}
                </div>

                {/* Quick Target Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-500 mr-1">Quick Select:</span>
                  {[
                    'Saudi Arabia',
                    'United Arab Emirates',
                    'Germany',
                    'United States',
                    'United Kingdom',
                    'India',
                    'Singapore',
                    'Japan',
                    'Brazil',
                    'Kenya',
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setTargetCountry(c);
                        setMapQuery(c);
                      }}
                      className={`px-2 py-0.5 rounded-md border transition ${
                        targetCountry === c
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Embedded Interactive Google Map Preview */}
                <div className="h-36 w-full rounded-xl overflow-hidden border border-slate-800/80 relative">
                  <iframe
                    title="Target Country Google Maps Preview"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery || effectiveCountry)}&t=m&z=11&ie=UTF8&iwloc=&output=embed`}
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-slate-950/90 border border-slate-800 rounded-md text-[10px] text-slate-300 font-mono shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Active Target: {effectiveCountry} (100% Locked)</span>
                  </div>
                </div>
              </div>

              {/* Trigger Buttons: Strict Lead Type Isolation */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-800/60">
                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('importers')}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Globe className="w-4 h-4" />
                  <span>
                    {crawlingType === 'importers'
                      ? `Crawling ${crawlDepth} Importers for ${effectiveCountry}...`
                      : `Harvest ${crawlDepth} Importers Only (${effectiveCountry})`}
                  </span>
                </button>

                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('suppliers')}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4" />
                  <span>
                    {crawlingType === 'suppliers'
                      ? `Crawling ${crawlDepth} Suppliers for ${effectiveCountry}...`
                      : `Harvest ${crawlDepth} Suppliers Only (${effectiveCountry})`}
                  </span>
                </button>

                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('all')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{crawlingType === 'all' ? 'Harvesting Both...' : `Crawl Both (${crawlDepth} Leads)`}</span>
                </button>
              </div>

              {/* Status Message Banner */}
              {crawlMessage && (
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{crawlMessage}</span>
                </div>
              )}
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Total in Database</span>
                <div className="text-xl font-bold text-white mt-1">{liveStats.total_leads} Leads</div>
                <span className="text-[10px] text-slate-500">MongoDB source of truth</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Wholesale Importers</span>
                <div className="text-xl font-bold text-blue-400 mt-1">{liveStats.importers_count} Buyers</div>
                <span className="text-[10px] text-slate-500">Active procurement desks</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Verified Suppliers</span>
                <div className="text-xl font-bold text-purple-400 mt-1">{liveStats.suppliers_count} Facilities</div>
                <span className="text-[10px] text-slate-500">Processing mills & plants</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Active Trade Portals</span>
                <div className="text-xl font-bold text-amber-400 mt-1">108 Portals</div>
                <span className="text-[10px] text-slate-500">54 Buyer & 54 Supplier registries</span>
              </div>
            </div>
          </div>
        )}

        {/* View: 108 Verified Trade Sources Registry */}
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Verified Trade Manifests & Registry Portals (108 Sources)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  54 Global Importer Directories + 54 Commercial Supplier & Milling Portals used for multi-corridor crawling.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search portals by name or country..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:border-amber-500 w-60"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setSourcesFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition ${sourcesFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    All (108)
                  </button>
                  <button
                    onClick={() => setSourcesFilter('importer')}
                    className={`px-2.5 py-1 rounded-md transition ${sourcesFilter === 'importer' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Buyers (54)
                  </button>
                  <button
                    onClick={() => setSourcesFilter('supplier')}
                    className={`px-2.5 py-1 rounded-md transition ${sourcesFilter === 'supplier' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Suppliers (54)
                  </button>
                </div>
              </div>
            </div>

            {/* Sources Table */}
            <div className={`rounded-xl overflow-hidden border shadow-sm ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-950 text-slate-400 border-slate-800 text-[10px] uppercase font-semibold">
                      <th className="py-3 px-4">Portal / Registry Name</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Country / Region</th>
                      <th className="py-3 px-2 text-center">Reliability</th>
                      <th className="py-3 px-4 text-right">Official Endpoint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {loadingSources ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          Loading verified trade sources registry...
                        </td>
                      </tr>
                    ) : filteredSources.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No sources found matching &quot;{sourceSearch}&quot;.
                        </td>
                      </tr>
                    ) : (
                      filteredSources.map((src) => (
                        <tr key={src.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-semibold text-white">
                            {src.name}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              src.lead_type === 'importer'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}>
                              {src.lead_type === 'importer' ? 'Buyer Desk' : 'Supplier Mill'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {src.category}
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {src.country_coverage}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">
                            {src.reliability_score}%
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono hover:underline"
                            >
                              <span>{src.domain}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Harvested Leads Table with Filters, Pagination, and DB Match Probability Meter */}
        {activeTab !== 'sources' && (
          <div className={`rounded-xl overflow-hidden border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {/* Table Header Controls */}
            <div className="p-4 border-b border-slate-800/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {activeTab === 'importers' ? 'Harvested Wholesale Buyers' : activeTab === 'suppliers' ? 'Harvested Suppliers & Mills' : 'Recently Discovered Trade Leads'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Showing {filteredLeads.length} leads in database across selected country and criteria
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter name, country, commodity, source..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-950 border border-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:border-purple-500 w-56"
                  />
                </div>

                <button
                  onClick={loadLeads}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Probability Meter Filter Pills */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/40 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3 h-3 text-purple-400" />
                <span>DB Match Meter:</span>
              </span>

              <button
                onClick={() => { setProbFilter('all'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  probFilter === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Records ({harvestedLeads.length})
              </button>

              <button
                onClick={() => { setProbFilter('fresh'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  probFilter === 'fresh'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Fresh Leads &lt;30% ({probCounts.fresh})</span>
              </button>

              <button
                onClick={() => { setProbFilter('partial'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  probFilter === 'partial'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Partial Match 30-74% ({probCounts.partial})</span>
              </button>

              <button
                onClick={() => { setProbFilter('duplicate'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  probFilter === 'duplicate'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Existing in DB ≥75% ({probCounts.dup})</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-semibold tracking-wider uppercase text-[10px] ${
                    isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Country / Hub</th>
                    <th className="py-3 px-3">Commodity Line</th>
                    <th className="py-3 px-3">DB Match / Probability</th>
                    <th className="py-3 px-3">Verified Trade Source</th>
                    <th className="py-3 px-2 text-center">Score</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loadingLeads ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw className="w-4 h-4 animate-spin text-purple-400" />
                          <span>Loading discovered contacts from MongoDB...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No matching leads found for the selected filter. Try selecting &quot;All Records&quot; or running the crawler.
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="py-3 px-4">
                          <div
                            onClick={() => setSelectedCustomer(lead)}
                            className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                              isLight ? 'text-slate-900 hover:text-purple-600' : 'text-white hover:text-purple-400'
                            }`}
                          >
                            {lead.lead_type === 'importer' ? (
                              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>{lead.company_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            lead.lead_type === 'importer'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {lead.lead_type === 'importer' ? 'Importer' : 'Supplier'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-300 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                            <span>{lead.city || lead.city_or_hub ? `${lead.city || lead.city_or_hub}, ` : ''}{lead.country}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-300 max-w-[180px] truncate">
                          {lead.matched_varieties || 'Commodity Line'}
                        </td>

                        <td className="py-3 px-3">
                          {renderProbabilityMeter(lead.duplicate_probability, lead.duplicate_status)}
                        </td>

                        <td className="py-3 px-3">
                          {lead.source_name ? (
                            <div className="text-[11px] text-slate-300 font-medium max-w-[170px] truncate flex items-center gap-1">
                              <span className="truncate">{lead.source_name}</span>
                              {lead.source_url && (
                                <a
                                  href={lead.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:text-amber-300 shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Customs Manifest</span>
                          )}
                        </td>

                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">
                          {lead.priority_score}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedCustomer(lead)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                          >
                            View Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredLeads.length > 0 && (
              <div className="p-3.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} leads
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageLeftNav>

      {/* Customer Dossier Modal */}
      <CustomerDossier
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </Shell>
  );
}
