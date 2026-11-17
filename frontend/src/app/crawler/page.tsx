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
  FileCheck2
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
  created_at: string;
}

interface LiveDashboardStats {
  total_leads?: number;
  importers_count?: number;
  wb_mills_count?: number;
}

export default function CrawlerLeadGenPage() {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  // Sub-view: 'crawler' | 'importers' | 'suppliers'
  const [activeTab, setActiveTab] = useState<'crawler' | 'importers' | 'suppliers'>('crawler');

  const [harvestedLeads, setHarvestedLeads] = useState<HarvestedLead[]>([]);
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
  const [targetCommodity, setTargetCommodity] = useState('All Universal Commodities');
  const [targetRegion, setTargetRegion] = useState('GCC & Middle East (UAE, Saudi, Qatar)');
  const [crawlDepth, setCrawlDepth] = useState<number>(30);

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
      let endpoint = '/leads?per_page=150';
      if (activeTab === 'importers') endpoint = '/leads/importers?per_page=150';
      if (activeTab === 'suppliers') endpoint = '/leads/suppliers?per_page=150';

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

  useEffect(() => {
    loadLeads();
  }, [activeTab]);

  const runCrawler = async (type: 'all' | 'importers' | 'suppliers') => {
    setCrawlingType(type);
    setCrawlMessage(`Initiating ${type} crawler for region "${targetRegion}" (Depth: ${crawlDepth} records)...`);

    try {
      const endpoint = '/scrape/crawl-now';

      const res = await fetchJson<{ success?: boolean; message?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          lead_type: type,
          commodity: targetCommodity,
          region: targetRegion,
          depth: crawlDepth,
        }),
      });

      setCrawlMessage(res.message || `Crawl job dispatched! Continuously harvesting ${crawlDepth} verified leads into database.`);

      // Refresh database records and dynamic badges after slight interval
      setTimeout(() => {
        loadLeads();
      }, 1200);
      setTimeout(() => {
        loadLeads();
      }, 3500);
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
        if (!name.includes(q) && !country.includes(q) && !city.includes(q) && !com.includes(q)) {
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
            <span className="text-xs text-slate-400 font-mono">Unlimited Depth Multi-Directory Engine</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Compass className="w-6 h-6 text-purple-400" />
            Lead Generation & Directory Crawler
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict region-constrained discovery, unlimited crawl depth, and intelligent deduplication probability scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            {/* Run Crawler Action Card */}
            <div className={`p-5 rounded-2xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Continuous Harvesting Console
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    MongoDB Synchronized
                  </span>
                </div>
              </div>

              {/* Crawl Parameters: Commodity, Region, Depth */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Commodity Line</label>
                  <select
                    value={targetCommodity}
                    onChange={(e) => setTargetCommodity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  >
                    <option value="All Universal Commodities">All Universal Commodities (Agro, Spices, Grains, Sugar)</option>
                    <option value="Basmati & Non-Basmati Rice">Basmati & Non-Basmati Rice (IR-64, Swarna, 1121)</option>
                    <option value="Refined Sugar & Jaggery">Refined Sugar & Jaggery (ICUMSA 45)</option>
                    <option value="Wheat, Corn & Pulses">Wheat, Corn & Pulses</option>
                    <option value="Spices & Condiments">Spices & Condiments (Turmeric, Chilli, Cumin)</option>
                    <option value="Textiles & Cotton Yarn">Textiles & Cotton Yarn</option>
                    <option value="Industrial Chemicals & Polymers">Industrial Chemicals & Polymers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Destination / Region</label>
                  <select
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  >
                    <option value="GCC & Middle East (UAE, Saudi, Qatar)">GCC & Middle East (UAE, Saudi Arabia, Qatar, Oman)</option>
                    <option value="Southeast Asia (Singapore, Malaysia, Indonesia)">Southeast Asia (Singapore, Malaysia, Indonesia, Vietnam)</option>
                    <option value="European Union (Rotterdam, Hamburg)">European Union (Rotterdam, Hamburg, Antwerp, UK)</option>
                    <option value="East & West Africa">East & West Africa (Benin, Togo, Kenya, Nigeria)</option>
                    <option value="Americas (Houston, Los Angeles, Santos)">Americas (USA, Brazil, Canada, Mexico)</option>
                    <option value="South Asia & India (Subcontinent)">South Asia & India (Kolkata, Mumbai, Mundra, BD)</option>
                    <option value="Global Sourcing Desks">Global Sourcing Desks (Worldwide)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Harvesting Depth</span>
                    <span className="text-[10px] text-purple-400 font-mono">Unlimited Continuous</span>
                  </label>
                  <select
                    value={crawlDepth}
                    onChange={(e) => setCrawlDepth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                  >
                    <option value={25}>25 Records (Standard Cluster Depth)</option>
                    <option value={50}>50 Records (Deep Regional Harvesting)</option>
                    <option value={100}>100 Records (High-Density Extraction)</option>
                    <option value={200}>200 Records (Exhaustive Directory Sweep)</option>
                  </select>
                </div>
              </div>

              {/* Trigger Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-800/60">
                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('all')}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-2 disabled:opacity-50`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{crawlingType === 'all' ? `Harvesting ${crawlDepth} Leads...` : `Crawl ${crawlDepth} Leads (All Types)`}</span>
                </button>

                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('importers')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>{crawlingType === 'importers' ? 'Crawling Buyers...' : `Harvest ${crawlDepth} Importers Only`}</span>
                </button>

                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('suppliers')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{crawlingType === 'suppliers' ? 'Crawling Suppliers...' : `Harvest ${crawlDepth} Suppliers Only`}</span>
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
                <span className="text-[10px] text-slate-500">Active sourcing desks</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Verified Suppliers</span>
                <div className="text-xl font-bold text-purple-400 mt-1">{liveStats.suppliers_count} Facilities</div>
                <span className="text-[10px] text-slate-500">Primary processing mills</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Fresh Discovery Rate</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {probCounts.total > 0 ? Math.round((probCounts.fresh / probCounts.total) * 100) : 100}%
                </div>
                <span className="text-[10px] text-slate-500">Unique entities in DB</span>
              </div>
            </div>
          </div>
        )}

        {/* Harvested Leads Table with Filters, Pagination, and DB Match Probability Meter */}
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
                Showing {filteredLeads.length} leads in database across selected region and probability criteria
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter name, country, commodity..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:border-purple-500 w-52"
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
                  <th className="py-3 px-3">DB Match / Probability Meter</th>
                  <th className="py-3 px-2 text-center">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loadingLeads ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin text-purple-400" />
                        <span>Loading discovered contacts from MongoDB...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
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

                      <td className="py-3 px-3 text-slate-400">
                        {lead.city || lead.city_or_hub ? `${lead.city || lead.city_or_hub}, ` : ''}{lead.country}
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate">
                        {lead.matched_varieties || 'Commodity Line'}
                      </td>

                      <td className="py-3 px-3">
                        {renderProbabilityMeter(lead.duplicate_probability, lead.duplicate_status)}
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
      </PageLeftNav>

      {/* Customer Dossier Modal */}
      <CustomerDossier
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </Shell>
  );
}
