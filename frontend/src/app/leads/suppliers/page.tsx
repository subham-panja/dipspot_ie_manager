'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import Link from 'next/link';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { fetchJson, API_BASE } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import CustomerDossier from '@/components/CustomerDossier';
import {
  Globe,
  Search,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle,
  Download,
  Loader2,
  Kanban,
  Factory,
  ExternalLink,
  X,
  Compass,
  Star,
  Phone,
  Mail,
  Filter,
  Tag,
  Plus,
  Trash2,
  ArrowUpDown,
  Save,
} from 'lucide-react';

interface SuppliersApiResponse {
  suppliers: any[];
  total: number;
  page: number;
  pages: number;
  aggregations: {
    total_suppliers: number;
    verified_gst_count: number;
    top_districts: { district: string; count: number }[];
  };
}

function VerifiedSuppliersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  // URL Query Parameters from Crawler
  const urlCustomLabel = searchParams?.get('custom_label') || '';
  const urlJobId = searchParams?.get('job_id') || '';
  const urlCountry = searchParams?.get('country') || '';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [aggregations, setAggregations] = useState<SuppliersApiResponse['aggregations'] | null>(null);

  // Strict route filtration state
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [commodity, setCommodity] = useState('');
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('score_desc');
  const [loading, setLoading] = useState(true);

  // Multi-Select Checkboxes (Twenty CRM Style)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Customer Dossier view
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Lead to Deal Modal (Procurement / Supply Contract)
  const [convertCustomer, setConvertCustomer] = useState<any | null>(null);
  const [convertForm, setConvertForm] = useState({
    title: '',
    commodity: '',
    quantity_mt: 500,
    incoterm: 'FOB Kolkata / Haldia Port',
    payment_terms: 'Irrevocable LC / CAD',
    stage_id: 'inquiry',
  });

  // Manual Supplier Creation Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({
    company_name: '',
    country: 'India',
    state: 'West Bengal',
    district: 'Burdwan',
    city_or_hub: 'Burdwan Agro Cluster',
    contact_person: '',
    phones: '',
    emails: '',
    website: '',
    gstin: '',
    matched_varieties: 'Sortex IR-64 Parboiled Rice; Swarna Raw Rice',
    address: '',
    deal_status: 'unassigned',
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

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      if (commodity) params.append('commodity', commodity);
      if (search) params.append('search', search);
      if (minScore !== '') params.append('min_score', String(minScore));
      if (urlCountry) params.append('country', urlCountry);
      if (urlCustomLabel) params.append('custom_label', urlCustomLabel);
      if (urlJobId) params.append('job_id', urlJobId);
      params.append('sort_by', sortBy);
      params.append('page', String(page));
      params.append('per_page', '15');

      const data = await fetchJson<SuppliersApiResponse>(`/leads/suppliers?${params.toString()}`);
      setSuppliers(data.suppliers || (data as any).leads || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setAggregations(data.aggregations || null);
    } catch (e) {
      console.error('Failed to load suppliers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [district, state, commodity, minScore, sortBy, page, urlCustomLabel, urlJobId, urlCountry]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSuppliers();
  };

  const handleResetFilters = () => {
    setDistrict('');
    setState('');
    setCommodity('');
    setSearch('');
    setMinScore('');
    setSortBy('score_desc');
    setPage(1);
  };

  // Build Dynamic Filtered Export URL (CSV or JSON)
  const buildExportUrl = (fmt = 'csv', selectedOnly = false) => {
    const params = new URLSearchParams();
    params.append('lead_type', 'wb_mill');
    params.append('format', fmt);
    if (selectedOnly && selectedIds.size > 0) {
      params.append('ids', Array.from(selectedIds).join(','));
    } else {
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      if (commodity) params.append('commodity', commodity);
      if (search) params.append('search', search);
      if (minScore !== '') params.append('min_score', String(minScore));
      if (urlCountry) params.append('country', urlCountry);
      if (urlCustomLabel) params.append('custom_label', urlCustomLabel);
      if (urlJobId) params.append('job_id', urlJobId);
      params.append('sort_by', sortBy);
    }
    return `http://localhost:5001/api/leads/export/${fmt}?${params.toString()}`;
  };

  // Multi-Select Checkboxes Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === suppliers.length && suppliers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suppliers.map((s) => s.id)));
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
      alert(`Updated ${selectedIds.size} suppliers to status: ${status}`);
      setSelectedIds(new Set());
      loadSuppliers();
    } catch (err: any) {
      alert('Failed to bulk update: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected suppliers?`)) return;
    try {
      await fetchJson('/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
        }),
      });
      alert(`Successfully deleted ${selectedIds.size} suppliers`);
      setSelectedIds(new Set());
      loadSuppliers();
    } catch (err: any) {
      alert('Failed to bulk delete: ' + err.message);
    }
  };

  // Manual Supplier Creation
  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.company_name.trim()) {
      alert('Supplier facility name is required');
      return;
    }
    try {
      setCreatingLead(true);
      await fetchJson('/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...newSupplierForm,
          lead_type: 'wb_mill',
          priority_score: 94,
        }),
      });
      alert(`Verified processing mill '${newSupplierForm.company_name}' registered!`);
      setIsAddModalOpen(false);
      setNewSupplierForm({
        company_name: '',
        country: 'India',
        state: 'West Bengal',
        district: 'Burdwan',
        city_or_hub: 'Burdwan Agro Cluster',
        contact_person: '',
        phones: '',
        emails: '',
        website: '',
        gstin: '',
        matched_varieties: 'Sortex IR-64 Parboiled Rice; Swarna Raw Rice',
        address: '',
        deal_status: 'unassigned',
      });
      setPage(1);
      loadSuppliers();
    } catch (err: any) {
      alert('Failed to create supplier: ' + err.message);
    } finally {
      setCreatingLead(false);
    }
  };

  const openConvertModal = (lead: any) => {
    setConvertCustomer(lead);
    setConvertForm({
      title: `500 MT Supply Contract - ${lead.company_name}`,
      commodity: lead.matched_varieties || 'General Commodity Grains',
      quantity_mt: 500,
      incoterm: 'FOB Kolkata / Haldia Port',
      payment_terms: 'Irrevocable LC / CAD',
      stage_id: 'inquiry',
    });
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertCustomer) return;
    try {
      await fetchJson(`/leads/${convertCustomer.id}/convert-to-deal`, {
        method: 'POST',
        body: JSON.stringify(convertForm),
      });
      alert(`Supplier ${convertCustomer.company_name} enrolled in Pipeline Kanban!`);
      setConvertCustomer(null);
      loadSuppliers();
    } catch (err: any) {
      alert('Conversion failed: ' + err.message);
    }
  };

  // Sub-Navigation Items
  const navItems: PageSubNavItem[] = [
    {
      id: 'importers',
      label: 'Importers & Buyers',
      icon: <Globe className="w-4 h-4" />,
      href: '/leads/importers',
      active: false,
      desc: 'Global wholesale buyers',
    },
    {
      id: 'suppliers',
      label: 'Verified Suppliers',
      icon: <Building2 className="w-4 h-4" />,
      badge: total,
      href: '/leads/suppliers',
      active: true,
      desc: 'Domestic processing facilities',
    },
    {
      id: 'burdwan',
      label: 'Burdwan Agro Cluster',
      icon: <Factory className="w-4 h-4 text-emerald-400" />,
      onClick: () => { setDistrict('Burdwan'); setPage(1); },
      active: district === 'Burdwan',
      desc: 'Sortex cleaned ready units',
    },
    {
      id: 'crawler',
      label: 'Lead Crawler Engine',
      icon: <Compass className="w-4 h-4 text-purple-400" />,
      href: '/crawler',
      active: false,
      desc: 'Discover fresh suppliers',
    },
  ];

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Suppliers & Producers
            </span>
            <span className="text-xs text-slate-400 font-mono">{total} Units Registered</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Factory className="w-6 h-6 text-emerald-500" />
            Verified Commodity Suppliers & Producers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Licensed manufacturing plants, verified supplier processing facilities, agricultural aggregators, and commercial production hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Supplier Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>

          <Link
            href="/crawler"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Crawl New</span>
          </Link>

          {/* Filtered Export Buttons */}
          <a
            href={buildExportUrl('csv')}
            target="_blank"
            rel="noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
            title="Download CSV matching current filters"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          <a
            href={buildExportUrl('json')}
            target="_blank"
            rel="noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
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
        subtitle="Supplier Categories"
        items={navItems}
        activeId="suppliers"
      >
        {/* Supplier Summary Metric Cards */}
        {aggregations && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Total Producers</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{aggregations.total_suppliers}</div>
              <div className="text-[10px] text-slate-500">Verified processing units</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">GSTIN Tax Compliant</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{aggregations.verified_gst_count}</div>
              <div className="text-[10px] text-slate-500">Active GST verification</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Production Hubs</div>
              <div className="text-xl font-bold text-white mt-1">{aggregations.top_districts.length} Districts</div>
              <div className="text-[10px] text-slate-500">Industrial agro zones</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Top Production Cluster</div>
              <div className="text-sm font-bold text-slate-200 mt-1.5 truncate">
                {aggregations.top_districts[0]?.district || 'Burdwan'}
              </div>
              <div className="text-[10px] text-slate-500">
                {aggregations.top_districts[0]?.count || 0} registered facilities
              </div>
            </div>
          </div>
        )}

        {/* Active Filter from Crawl Run Banner */}
        {(urlCustomLabel || urlJobId || urlCountry) && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-400">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-200">Active Crawl Filter:</span>
              {urlCustomLabel && (
                <span className="font-bold text-white bg-emerald-500/25 px-2.5 py-0.5 rounded border border-emerald-500/30">
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
                  &bull; Origin: <strong className="text-white">{urlCountry}</strong>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push('/leads/suppliers')}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ml-auto sm:ml-0"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        {/* Multi-Filter & Search Bar */}
        <div className={`p-3 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
            <select
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="">All Production Clusters</option>
              <option value="Burdwan">Burdwan (Purba / Paschim)</option>
              <option value="Hooghly">Hooghly Milling Corridor</option>
              <option value="Birbhum">Birbhum Agro Basin</option>
              <option value="Midnapore">Midnapore / Haldia Port</option>
              <option value="Bankura">Bankura Grain Terminal</option>
              <option value="Nadia">Nadia Border Access</option>
            </select>

            <select
              value={commodity}
              onChange={(e) => { setCommodity(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="">All Commodity Specialties</option>
              <option value="IR-64">IR-64 Parboiled Non-Basmati</option>
              <option value="Swarna">Swarna Premium Milled</option>
              <option value="Minikit">Minikit Super Fine</option>
              <option value="Basmati">1121 &amp; Traditional Basmati</option>
              <option value="Sortex">Sortex Cleaned Ready Units</option>
            </select>

            <select
              value={minScore}
              onChange={(e) => { setMinScore(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="">All Quality Scores</option>
              <option value="80">Score 80+ (Tier 1 Certified)</option>
              <option value="60">Score 60+ (Active)</option>
            </select>

            {/* Twenty-CRM Multi-Column Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none font-medium ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-emerald-400'
              }`}
            >
              <option value="score_desc">Sort: Quality Score (High-Low)</option>
              <option value="score_asc">Sort: Quality Score (Low-High)</option>
              <option value="name_asc">Sort: Facility Name (A - Z)</option>
              <option value="name_desc">Sort: Facility Name (Z - A)</option>
              <option value="date_desc">Sort: Newest Registered First</option>
            </select>

            {(district || state || commodity || minScore || search) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold ml-1"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by facility, contact, GSTIN..."
              className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500'
              }`}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </form>
        </div>

        {/* Twenty-CRM Sticky Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-4 z-30 bg-slate-900 border border-emerald-500/50 shadow-2xl rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {selectedIds.size}
              </span>
              <span className="font-semibold">{selectedIds.size} Suppliers Selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={buildExportUrl('csv', true)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 text-xs text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
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
                <option value="" disabled>Set Pipeline Stage...</option>
                <option value="inquiry">Stage: Procurement Inquiry</option>
                <option value="qualified">Stage: Verified Mill Audit</option>
                <option value="negotiation">Stage: Rate Negotiation</option>
                <option value="won">Stage: Active Supply Contract</option>
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

        {/* Suppliers Table with Checkboxes & Sorting */}
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
                      checked={suppliers.length > 0 && selectedIds.size === suppliers.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')}>
                    <div className="flex items-center gap-1">
                      <span>Facility Legal Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Production Cluster</th>
                  <th className="py-3 px-3">Commercial Contact</th>
                  <th className="py-3 px-3">Milling Specialty</th>
                  <th className="py-3 px-2 text-center cursor-pointer select-none" onClick={() => setSortBy(sortBy === 'score_desc' ? 'score_asc' : 'score_desc')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Score</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" />
                      Loading verified suppliers &amp; mills...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No suppliers found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => {
                    const isSelected = selectedIds.has(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`transition ${isSelected ? 'bg-emerald-500/10' : (isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40')}`}
                      >
                        <td className="py-3 px-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(s.id)}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div
                              onClick={() => setSelectedCustomer(s)}
                              className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                                isLight ? 'text-slate-900 hover:text-emerald-600' : 'text-white hover:text-emerald-400'
                              }`}
                            >
                              <Factory className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{s.company_name}</span>
                              <span title="Verified Producer Facility">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {s.gstin && (
                                <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  <span>GSTIN:</span>
                                  <span>{s.gstin}</span>
                                </div>
                              )}
                              {s.google_maps_url && (
                                <a
                                  href={s.google_maps_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-emerald-400 hover:underline font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>Map POI</span>
                                </a>
                              )}
                              {s.custom_label && (
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                  <Tag className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{s.custom_label}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          <div className="font-medium text-slate-200">
                            {s.district || s.city_or_hub || 'Regional Hub'}, {s.state || s.country || 'India'}
                          </div>
                          {s.address && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={s.address}>
                              {s.address}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-200">
                            {s.contact_person || 'Plant Procurement Head'}
                          </div>
                          {(s.phone || s.phones) && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{(s.phone || s.phones || '').split(';')[0].trim()}</span>
                            </div>
                          )}
                          {(s.email || s.emails) && (
                            <a
                              href={`mailto:${(s.email || s.emails || '').split(';')[0].trim()}`}
                              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 truncate max-w-[170px] mt-0.5"
                            >
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{(s.email || s.emails || '').split(';')[0].trim()}</span>
                            </a>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-300 max-w-[200px]" title={s.matched_varieties}>
                          <div className="truncate font-medium">{s.matched_varieties || 'Non-Basmati & Parboiled Grains'}</div>
                          {s.fssai_or_sfda_status && (
                            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" />
                              <span>{s.fssai_or_sfda_status}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            s.priority_score >= 80
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {s.priority_score || 85}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCustomer(s)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                            >
                              Dossier
                            </button>
                            <button
                              onClick={() => openConvertModal(s)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition"
                            >
                              + Contract
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
              Showing Page {page} of {pages} ({total} Total Suppliers)
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

      {/* Manual Supplier Creation Modal */}
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
                <Plus className="w-5 h-5 text-emerald-400" />
                Register Verified Processing Mill / Supplier
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Facility Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Burdwan Agro Processing Mills Pvt Ltd"
                  value={newSupplierForm.company_name}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">State / Province</label>
                  <input
                    type="text"
                    value={newSupplierForm.state}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">District / Hub</label>
                  <input
                    type="text"
                    value={newSupplierForm.district}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, district: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Key Commercial Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. Joydeep Ghosh (Director)"
                    value={newSupplierForm.contact_person}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contact_person: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Facility Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9434123456"
                    value={newSupplierForm.phones}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phones: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="e.g. mills@burdwanagro.com"
                    value={newSupplierForm.emails}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, emails: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 19AAACB1234F1Z5"
                    value={newSupplierForm.gstin}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Processing Specialties / Varieties</label>
                <input
                  type="text"
                  value={newSupplierForm.matched_varieties}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, matched_varieties: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
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
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition flex items-center gap-1.5"
                >
                  {creatingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{creatingLead ? 'Registering...' : 'Save Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Supply Contract Deal Modal */}
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
                <Factory className="w-5 h-5 text-emerald-400" />
                Enroll Supplier in Supply Contract
              </h3>
              <button onClick={() => setConvertCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Processing Facility</label>
                <input
                  type="text"
                  disabled
                  value={convertCustomer.company_name}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-lg cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contract Title *</label>
                <input
                  type="text"
                  required
                  value={convertForm.title}
                  onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Grain Spec</label>
                  <input
                    type="text"
                    required
                    value={convertForm.commodity}
                    onChange={(e) => setConvertForm({ ...convertForm, commodity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Procurement MT</label>
                  <input
                    type="number"
                    required
                    value={convertForm.quantity_mt}
                    onChange={(e) => setConvertForm({ ...convertForm, quantity_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Delivery Incoterm</label>
                  <input
                    type="text"
                    value={convertForm.incoterm}
                    onChange={(e) => setConvertForm({ ...convertForm, incoterm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Settlement Terms</label>
                  <input
                    type="text"
                    value={convertForm.payment_terms}
                    onChange={(e) => setConvertForm({ ...convertForm, payment_terms: e.target.value })}
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
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition"
                >
                  Enroll Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Dossier Modal */}
      <CustomerDossier
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </Shell>
  );
}

export default function VerifiedSuppliersPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="py-24 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
            Loading Verified Processing Facilities &amp; Suppliers...
          </div>
        </Shell>
      }
    >
      <VerifiedSuppliersContent />
    </Suspense>
  );
}
