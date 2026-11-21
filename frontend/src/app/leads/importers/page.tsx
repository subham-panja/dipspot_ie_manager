'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import CustomerDossier from '@/components/CustomerDossier';
import { fetchJson, API_BASE } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
  Globe,
  Building2,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  Sparkles,
  Download,
  Filter,
  CheckCircle,
  X,
  Compass,
  Star,
  MapPin,
  ShieldCheck,
  Tag,
  Ship,
  Package,
  MessageCircle,
  Trash2,
  ArrowUpDown,
  CheckSquare,
  Square,
  Save,
} from 'lucide-react';

interface Importer {
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
  website?: string;
  address?: string;
  matched_varieties?: string;
  hs_codes_applicable?: string;
  priority_score: number;
  import_capacity_mt?: number;
  annual_turnover_usd?: string;
  lead_type: string;
  deal_status?: string;
  verified_status: string;
  source_name?: string;
  source_url?: string;
  merge_count?: number;
  custom_label?: string;
  job_id?: number;
  created_at: string;
  shipment_volume?: string;
  importer_tier?: string;
  nearest_port?: string;
  customs_manifest_data?: string;
  whatsapp_outreach_url?: string;
  linkedin_search_url?: string;
  google_maps_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_company_url?: string;
}

interface ImportersResponse {
  importers?: Importer[];
  leads?: Importer[];
  total: number;
  page: number;
  pages: number;
  aggregations: {
    total_importers: number;
    high_priority_count: number;
    countries_count?: number;
    avg_priority_score?: number;
    top_countries: { country: string; count: number }[];
  };
}

function GlobalImportersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  // URL Query Parameters
  const urlCustomLabel = searchParams?.get('custom_label') || '';
  const urlJobId = searchParams?.get('job_id') || '';
  const urlCountry = searchParams?.get('country') || '';

  const [importers, setImporters] = useState<Importer[]>([]);
  const [aggregations, setAggregations] = useState<ImportersResponse['aggregations'] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [country, setCountry] = useState(urlCountry || '');
  const [port, setPort] = useState(searchParams?.get('port') || '');
  const [tier, setTier] = useState(searchParams?.get('tier') || '');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score_desc');

  // Multi-Select Checkboxes (Twenty CRM Style)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [convertCustomer, setConvertCustomer] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState({
    company_name: '',
    country: 'United Arab Emirates',
    city_or_hub: 'Dubai',
    nearest_port: 'Jebel Ali Port (AEJEA)',
    shipment_volume: '1-3 Containers / mo (25-75 MT)',
    contact_person: '',
    phones: '',
    emails: '',
    website: '',
    matched_varieties: 'IR-64 Parboiled Rice; 1121 Basmati Rice',
    address: '',
    deal_status: 'unassigned',
  });

  const [dealForm, setDealForm] = useState({
    title: '',
    commodity: 'IR-64 Parboiled Rice 5% Broken',
    quantity_mt: 250,
    incoterm: 'CIF Jebel Ali Port',
    payment_terms: '100% L/C at Sight',
  });

  // Universal Escape key closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCustomer(null);
        setConvertCustomer(null);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadImporters = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('per_page', '15');
      params.append('sort_by', sortBy);
      const effectiveCountry = country || urlCountry;
      if (effectiveCountry) params.append('country', effectiveCountry);
      if (port) params.append('port', port);
      if (tier) params.append('tier', tier);
      if (minScore) params.append('min_score', String(minScore));
      if (search.trim()) params.append('search', search.trim());
      if (urlCustomLabel) params.append('custom_label', urlCustomLabel);
      if (urlJobId) params.append('job_id', urlJobId);

      const res = await fetchJson<ImportersResponse>(`/leads/importers?${params.toString()}`);
      setImporters(res.importers || res.leads || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setPages(res.pages || 1);
      if (res.aggregations) {
        setAggregations(res.aggregations);
      }
    } catch (e) {
      console.error('Failed to load importers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImporters(page);
  }, [page, country, port, tier, minScore, sortBy, urlCustomLabel, urlJobId, urlCountry]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadImporters(1);
  };

  // Build Dynamic Filtered Export URL (CSV or JSON)
  const buildExportUrl = (fmt = 'csv', selectedOnly = false) => {
    const params = new URLSearchParams();
    params.append('lead_type', 'importer');
    params.append('format', fmt);
    if (selectedOnly && selectedIds.size > 0) {
      params.append('ids', Array.from(selectedIds).join(','));
    } else {
      const effectiveCountry = country || urlCountry;
      if (effectiveCountry) params.append('country', effectiveCountry);
      if (port) params.append('port', port);
      if (tier) params.append('tier', tier);
      if (minScore) params.append('min_score', String(minScore));
      if (search.trim()) params.append('search', search.trim());
      if (urlCustomLabel) params.append('custom_label', urlCustomLabel);
      if (urlJobId) params.append('job_id', urlJobId);
      params.append('sort_by', sortBy);
    }
    return `${API_BASE}/leads/export/${fmt}?${params.toString()}`;
  };

  // Multi-Select Checkbox Handlers (Twenty CRM pattern)
  const handleToggleSelectAll = () => {
    if (selectedIds.size === importers.length && importers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(importers.map((i) => i.id)));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk Actions
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await fetchJson('/leads/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          deal_status: status,
        }),
      });
      alert(`Updated ${selectedIds.size} leads to deal stage: ${status}`);
      setSelectedIds(new Set());
      loadImporters(page);
    } catch (err: any) {
      alert('Failed to bulk update: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected leads?`)) return;
    try {
      await fetchJson('/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
        }),
      });
      alert(`Successfully deleted ${selectedIds.size} leads`);
      setSelectedIds(new Set());
      loadImporters(page);
    } catch (err: any) {
      alert('Failed to bulk delete: ' + err.message);
    }
  };

  // Manual Lead Creation
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.company_name.trim()) {
      alert('Company legal name is required');
      return;
    }
    try {
      setCreatingLead(true);
      await fetchJson('/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...newLeadForm,
          lead_type: 'importer',
          priority_score: 92,
        }),
      });
      alert(`Verified importer '${newLeadForm.company_name}' saved to directory!`);
      setIsAddModalOpen(false);
      setNewLeadForm({
        company_name: '',
        country: 'United Arab Emirates',
        city_or_hub: 'Dubai',
        nearest_port: 'Jebel Ali Port (AEJEA)',
        shipment_volume: '1-3 Containers / mo (25-75 MT)',
        contact_person: '',
        phones: '',
        emails: '',
        website: '',
        matched_varieties: 'IR-64 Parboiled Rice; 1121 Basmati Rice',
        address: '',
        deal_status: 'unassigned',
      });
      loadImporters(1);
    } catch (err: any) {
      alert('Failed to create lead: ' + err.message);
    } finally {
      setCreatingLead(false);
    }
  };

  const handleConvertDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertCustomer) return;
    try {
      await fetchJson('/pipeline/deals', {
        method: 'POST',
        body: JSON.stringify({
          title: dealForm.title || `${dealForm.quantity_mt} MT ${dealForm.commodity} - ${convertCustomer.company_name}`,
          company_name: convertCustomer.company_name,
          country: convertCustomer.country,
          commodity: dealForm.commodity,
          quantity_mt: Number(dealForm.quantity_mt),
          incoterm: dealForm.incoterm,
          payment_terms: dealForm.payment_terms,
          stage_id: 'inquiry',
          note: `Converted from verified importer directory lead #${convertCustomer.id}`,
        }),
      });
      alert(`Customer deal created successfully! Moved to Pipeline Kanban.`);
      setConvertCustomer(null);
    } catch (err: any) {
      alert('Failed to convert to deal: ' + err.message);
    }
  };

  // Sub-Navigation Items
  const navItems: PageSubNavItem[] = [
    {
      id: 'importers',
      label: 'All Importers & Buyers',
      icon: <Globe className="w-4 h-4" />,
      badge: total,
      onClick: () => { setTier(''); setPort(''); setCountry(''); setPage(1); },
      active: !tier && !port,
      desc: 'Global wholesale buyers',
    },
    {
      id: 'customs_sme',
      label: 'Customs Manifests (1-3 FCL)',
      icon: <Ship className="w-4 h-4 text-cyan-400" />,
      onClick: () => { setTier('sme'); setPage(1); },
      active: tier === 'sme',
      desc: 'SME buyers (no conglomerates)',
    },
    {
      id: 'port_jebel_ali',
      label: '🇦🇪 Jebel Ali Port (UAE)',
      icon: <Ship className="w-4 h-4 text-blue-400" />,
      onClick: () => { setPort('Jebel Ali'); setPage(1); },
      active: port === 'Jebel Ali',
      desc: 'Dubai & Northern Emirates',
    },
    {
      id: 'port_kbs',
      label: '🇧🇭 Khalifa Bin Salman',
      icon: <Ship className="w-4 h-4 text-rose-400" />,
      onClick: () => { setPort('Khalifa Bin Salman'); setPage(1); },
      active: port === 'Khalifa Bin Salman',
      desc: 'Bahrain Milled Rice Consignees',
    },
    {
      id: 'port_dammam',
      label: '🇸🇦 King Abdulaziz (Dammam)',
      icon: <Ship className="w-4 h-4 text-emerald-400" />,
      onClick: () => { setPort('Dammam'); setPage(1); },
      active: port === 'Dammam',
      desc: 'Saudi Eastern Province',
    },
    {
      id: 'port_mombasa',
      label: '🇰🇪 Port of Mombasa',
      icon: <Ship className="w-4 h-4 text-amber-400" />,
      onClick: () => { setPort('Mombasa'); setPage(1); },
      active: port === 'Mombasa',
      desc: 'Kenya & East Africa Hub',
    },
    {
      id: 'suppliers',
      label: 'Verified Suppliers',
      icon: <Building2 className="w-4 h-4" />,
      href: '/leads/suppliers',
      active: false,
      desc: 'Domestic processing facilities',
    },
    {
      id: 'tier1',
      label: 'Tier 1 Priority (80+)',
      icon: <Star className="w-4 h-4 text-emerald-400" />,
      onClick: () => { setMinScore(80); setPage(1); },
      active: minScore === 80,
      desc: 'Pre-qualified active RFQs',
    },
    {
      id: 'crawler',
      label: 'Lead Crawler Engine',
      icon: <Compass className="w-4 h-4 text-purple-400" />,
      href: '/crawler',
      active: false,
      desc: 'Harvest fresh trade leads',
    },
  ];

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Directory Hub
            </span>
            <span className="text-xs text-slate-400 font-mono">Global Buyer Registry</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Globe className="w-6 h-6 text-blue-400" />
            Global Importers & Wholesale Buyers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified international buyers with trade volume, geocoded map coordinates, and direct contact desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Manual Lead Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>

          <Link
            href="/crawler"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Crawler</span>
          </Link>

          {/* Filtered Export Buttons */}
          <a
            href={buildExportUrl('csv')}
            target="_blank"
            rel="noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            title="Download CSV matching current filters"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </a>

          <a
            href={buildExportUrl('json')}
            target="_blank"
            rel="noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            title="Download JSON matching current filters"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Directory Scope"
        subtitle="Filter & Category Index"
        items={navItems}
        activeId="importers"
      >
        {/* Importer Summary Metric Cards */}
        {aggregations && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Total Importers</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{aggregations.total_importers}</div>
              <div className="text-[10px] text-slate-500">Verified buyers</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Tier 1 Qualified</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{aggregations.high_priority_count}</div>
              <div className="text-[10px] text-slate-500">Score 80+</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Destination Markets</div>
              <div className="text-xl font-bold text-white mt-1">{aggregations.countries_count} Countries</div>
              <div className="text-[10px] text-slate-500">GCC, SE Asia & Global</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Primary Market</div>
              <div className="text-sm font-bold text-slate-200 mt-1.5 truncate">
                {aggregations.top_countries[0]?.country || 'United Arab Emirates'}
              </div>
              <div className="text-[10px] text-slate-500">
                {aggregations.top_countries[0]?.count || 0} buyers
              </div>
            </div>
          </div>
        )}

        {/* Active Filter from Crawl Run Banner */}
        {(urlCustomLabel || urlJobId || urlCountry) && (
          <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-400">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-200">Active Crawl Filter:</span>
              {urlCustomLabel && (
                <span className="font-bold text-white bg-blue-500/25 px-2.5 py-0.5 rounded border border-blue-500/30">
                  {urlCustomLabel}
                </span>
              )}
              {urlJobId && (
                <span className="text-slate-400 font-mono text-[11px]">
                  (Job #{urlJobId})
                </span>
              )}
              {urlCountry && (
                <span className="text-slate-300">
                  &bull; Geography: <strong className="text-white">{urlCountry}</strong>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push('/leads/importers')}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ml-auto sm:ml-0"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        {/* Multi-Filter & Search Bar (Twenty CRM Inspired) */}
        <div className={`p-3 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="">All Geographies</option>
              <option value="United Arab Emirates">United Arab Emirates (Dubai)</option>
              <option value="Saudi Arabia">Saudi Arabia (Riyadh, Dammam)</option>
              <option value="Qatar">Qatar (Doha)</option>
              <option value="Oman">Oman (Muscat)</option>
              <option value="Kuwait">Kuwait</option>
              <option value="Bahrain">Bahrain</option>
            </select>

            <select
              value={minScore}
              onChange={(e) => { setMinScore(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="">All Score Tiers</option>
              <option value="80">Score 80+ (Tier 1)</option>
              <option value="60">Score 60+ (Active)</option>
            </select>

            <select
              value={port}
              onChange={(e) => { setPort(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="">All Discharge Ports</option>
              <option value="Jebel Ali">🇦🇪 Jebel Ali Port (UAE)</option>
              <option value="Khalifa Bin Salman">🇧🇭 Khalifa Bin Salman (Bahrain)</option>
              <option value="Dammam">🇸🇦 King Abdulaziz Port / Dammam</option>
              <option value="Mombasa">🇰🇪 Port of Mombasa (Kenya)</option>
              <option value="Lome">🇹🇬 Autonomous Port of Lomé (Togo)</option>
            </select>

            <select
              value={tier}
              onChange={(e) => { setTier(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none font-semibold ${
                tier === 'sme' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : (isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200')
              }`}
            >
              <option value="">All Consignment Sizes</option>
              <option value="sme">🎯 SME Importers (1-3 Containers / mo)</option>
            </select>

            {/* Twenty-CRM Multi-Column Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none font-medium ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-blue-400'
              }`}
            >
              <option value="score_desc">Sort: Priority Score (High-Low)</option>
              <option value="score_asc">Sort: Priority Score (Low-High)</option>
              <option value="name_asc">Sort: Company Name (A - Z)</option>
              <option value="name_desc">Sort: Company Name (Z - A)</option>
              <option value="date_desc">Sort: Newest First</option>
              <option value="volume_desc">Sort: Annual Volume High</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, contact, commodity..."
              className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
                  : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500'
              }`}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </form>
        </div>

        {/* Twenty-CRM Sticky Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-4 z-30 bg-slate-900 border border-blue-500/50 shadow-2xl rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {selectedIds.size}
              </span>
              <span className="font-semibold">{selectedIds.size} Leads Selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={buildExportUrl('csv', true)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 text-xs text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Selected (CSV)</span>
              </a>

              <a
                href={buildExportUrl('json', true)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 text-xs text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Selected (JSON)</span>
              </a>

              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkStatusUpdate(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none"
              >
                <option value="" disabled>Set Deal Stage...</option>
                <option value="inquiry">Stage: Inquiry</option>
                <option value="qualified">Stage: Qualified</option>
                <option value="negotiation">Stage: Negotiation</option>
                <option value="won">Stage: Contract Won</option>
              </select>

              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/40 flex items-center gap-1.5 text-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-slate-400 hover:text-white transition"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Importers Table with Checkboxes & Multi-Column Sorting */}
        <div className={`rounded-xl overflow-hidden border shadow-sm transition ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-semibold tracking-wider uppercase text-[10px] ${
                  isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={importers.length > 0 && selectedIds.size === importers.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')}>
                    <div className="flex items-center gap-1">
                      <span>Importer Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Port &amp; Country</th>
                  <th className="py-3 px-3">Key Contact</th>
                  <th className="py-3 px-3">Direct Phone</th>
                  <th className="py-3 px-3">Target Goods</th>
                  <th className="py-3 px-2 text-center cursor-pointer select-none" onClick={() => setSortBy(sortBy === 'score_desc' ? 'score_asc' : 'score_desc')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Score</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading verified buyers...
                    </td>
                  </tr>
                ) : importers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No importers found matching criteria.
                    </td>
                  </tr>
                ) : (
                  importers.map((cust) => {
                    const isSelected = selectedIds.has(cust.id);
                    return (
                      <tr
                        key={cust.id}
                        className={`transition ${isSelected ? 'bg-blue-500/10' : (isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40')}`}
                      >
                        <td className="py-3 px-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(cust.id)}
                            className="rounded border-slate-700 bg-slate-900 text-blue-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div
                              onClick={() => setSelectedCustomer(cust)}
                              className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                                isLight ? 'text-slate-900 hover:text-blue-600' : 'text-white hover:text-blue-400'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{cust.company_name}</span>
                              <span title="Verified Trade Entity">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {cust.shipment_volume && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-medium">
                                  <Ship className="w-2.5 h-2.5 shrink-0" />
                                  <span>{cust.shipment_volume}</span>
                                </div>
                              )}

                              {/* Social OSINT Badges (theHarvester & Apify style) */}
                              {cust.twitter_url && (
                                <a
                                  href={cust.twitter_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-sky-400 hover:text-sky-300 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 flex items-center gap-1"
                                  title="Twitter / X Corporate Handle"
                                >
                                  <span>𝕏 Profile</span>
                                </a>
                              )}

                              {cust.linkedin_search_url && (
                                <a
                                  href={cust.linkedin_search_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-[#0a66c2] hover:underline font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1"
                                  title="Find Purchase Manager on LinkedIn"
                                >
                                  <span>in Search</span>
                                </a>
                              )}

                              {cust.google_maps_url && (
                                <a
                                  href={cust.google_maps_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-emerald-400 hover:underline font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"
                                  title="View on Google Maps"
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>Map POI</span>
                                </a>
                              )}
                            </div>

                            {cust.website && (
                              <a
                                href={cust.website.startsWith('http') ? cust.website : `https://${cust.website}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-[180px]">{cust.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                              </a>
                            )}
                            {cust.custom_label && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-slate-500" />
                                <span>{cust.custom_label}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          <div className="font-medium text-slate-200">
                            {cust.city ? `${cust.city}, ` : (cust.city_or_hub ? `${cust.city_or_hub}, ` : '')}{cust.country}
                          </div>
                          {cust.nearest_port && (
                            <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5 truncate max-w-[190px]" title={cust.nearest_port}>
                              <Ship className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{cust.nearest_port.split("(")[0].trim()}</span>
                            </div>
                          )}
                          {cust.address && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={cust.address}>
                              {cust.address}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-200">
                            {cust.contact_person || 'Purchase Manager'}
                          </div>
                          {(cust.email || cust.emails) && (
                            <a
                              href={`mailto:${(cust.email || cust.emails || '').split(';')[0].trim()}`}
                              className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 truncate max-w-[180px] mt-0.5"
                            >
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{(cust.email || cust.emails || '').split(';')[0].trim()}</span>
                            </a>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-300">
                          {(cust.phone || cust.phones) ? (
                            <div>
                              <div className="flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{(cust.phone || cust.phones || '').split(';')[0].trim()}</span>
                              </div>
                              {cust.whatsapp_outreach_url && (
                                <a
                                  href={cust.whatsapp_outreach_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition w-fit font-sans"
                                  title="Message on WhatsApp with pre-filled CIF quote intro"
                                >
                                  <MessageCircle className="w-3 h-3 shrink-0" />
                                  <span>WhatsApp Buyer</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">N/A</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-300 max-w-[200px]" title={cust.matched_varieties}>
                          <div className="truncate font-medium">{cust.matched_varieties || 'Commodity Grains'}</div>
                          {cust.hs_codes_applicable && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              HS: {cust.hs_codes_applicable}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            cust.priority_score >= 80
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : cust.priority_score >= 60
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {cust.priority_score}
                          </span>
                          {(cust.merge_count || 1) > 1 && (
                            <div className="text-[9px] text-blue-400 font-bold mt-0.5">
                              Merged x{cust.merge_count}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                            >
                              Dossier
                            </button>
                            <button
                              onClick={() => {
                                setConvertCustomer(cust);
                                setDealForm((prev) => ({
                                  ...prev,
                                  title: `500 MT Supply Contract - ${cust.company_name}`,
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${accentClasses.bg} shadow-sm transition`}
                            >
                              + Deal
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-slate-800/40 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing Page {page} of {pages} ({total} Total Importers)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-300 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-300 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </PageLeftNav>

      {/* Manual Lead Creation Modal */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Plus className="w-5 h-5 text-blue-400" />
                Add Verified International Importer
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Futtaim Trading LLC"
                  value={newLeadForm.company_name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Country</label>
                  <input
                    type="text"
                    value={newLeadForm.country}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City / Commercial Hub</label>
                  <input
                    type="text"
                    value={newLeadForm.city_or_hub}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, city_or_hub: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nearest Discharge Port</label>
                  <input
                    type="text"
                    value={newLeadForm.nearest_port}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, nearest_port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Monthly Inbound Volume</label>
                  <input
                    type="text"
                    value={newLeadForm.shipment_volume}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, shipment_volume: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Key Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mansoor (Purchase Manager)"
                    value={newLeadForm.contact_person}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contact_person: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +971 4 295 1111"
                    value={newLeadForm.phones}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phones: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Verified Email</label>
                  <input
                    type="email"
                    placeholder="e.g. trade@alfuttaim.ae"
                    value={newLeadForm.emails}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, emails: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Corporate Website</label>
                  <input
                    type="text"
                    placeholder="e.g. www.alfuttaim.com"
                    value={newLeadForm.website}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, website: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Commodity / Target Varieties</label>
                <input
                  type="text"
                  value={newLeadForm.matched_varieties}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, matched_varieties: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLead}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition flex items-center gap-1.5"
                >
                  {creatingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{creatingLead ? 'Saving...' : 'Save Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Deal Modal with Backdrop Click to Close */}
      {convertCustomer && (
        <div
          onClick={() => setConvertCustomer(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Convert Importer to Pipeline Deal
              </h3>
              <button onClick={() => setConvertCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertDealSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Importer</label>
                <input
                  type="text"
                  disabled
                  value={convertCustomer.company_name}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-lg cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Commodity Spec</label>
                  <input
                    type="text"
                    required
                    value={dealForm.commodity}
                    onChange={(e) => setDealForm({ ...dealForm, commodity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantity (MT)</label>
                  <input
                    type="number"
                    required
                    value={dealForm.quantity_mt}
                    onChange={(e) => setDealForm({ ...dealForm, quantity_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Incoterms</label>
                  <input
                    type="text"
                    value={dealForm.incoterm}
                    onChange={(e) => setDealForm({ ...dealForm, incoterm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={dealForm.payment_terms}
                    onChange={(e) => setDealForm({ ...dealForm, payment_terms: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setConvertCustomer(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClasses.bg} shadow-md transition`}
                >
                  Add to Funnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Dossier Modal with Interactive Google Map */}
      <CustomerDossier
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onConvertToDeal={(c) => {
          setSelectedCustomer(null);
          setConvertCustomer(c || selectedCustomer);
        }}
      />
    </Shell>
  );
}

export default function GlobalImportersPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="py-24 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            Loading Global Importers &amp; Trade Desks...
          </div>
        </Shell>
      }
    >
      <GlobalImportersContent />
    </Suspense>
  );
}
