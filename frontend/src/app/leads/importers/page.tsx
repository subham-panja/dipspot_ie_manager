'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import CustomerDossier from '@/components/CustomerDossier';
import { fetchJson } from '@/lib/api';
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
  Sparkles,
  Download,
  Filter,
  CheckCircle,
  X,
  Compass,
  Star
} from 'lucide-react';

interface Importer {
  id: number;
  company_name: string;
  country: string;
  city?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  matched_varieties?: string;
  priority_score: number;
  import_capacity_mt?: number;
  annual_turnover_usd?: string;
  lead_type: string;
  verified_status: string;
  created_at: string;
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

export default function GlobalImportersPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [importers, setImporters] = useState<Importer[]>([]);
  const [aggregations, setAggregations] = useState<ImportersResponse['aggregations'] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [country, setCountry] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [convertCustomer, setConvertCustomer] = useState<any | null>(null);
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
      if (country) params.append('country', country);
      if (minScore) params.append('min_score', String(minScore));
      if (search.trim()) params.append('search', search.trim());

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
  }, [page, country, minScore]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadImporters(1);
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

  // Scalable Page Left Navigation Items
  const navItems: PageSubNavItem[] = [
    {
      id: 'importers',
      label: 'Importers & Buyers',
      icon: <Globe className="w-4 h-4" />,
      badge: total,
      href: '/leads/importers',
      active: true,
      desc: 'Global wholesale buyers',
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

        <div className="flex items-center gap-2">
          <Link
            href="/crawler"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Discover More Leads</span>
          </Link>

          <a
            href="http://localhost:5001/api/leads/export/csv?lead_type=importer"
            target="_blank"
            rel="noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
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
        {/* Importer Summary Metric Cards (Minimal) */}
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

        {/* Filter & Search Bar */}
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

        {/* Importers Table */}
        <div className={`rounded-xl overflow-hidden border shadow-sm transition ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-semibold tracking-wider uppercase text-[10px] ${
                  isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  <th className="py-3 px-4">Importer Name</th>
                  <th className="py-3 px-3">Port & Country</th>
                  <th className="py-3 px-3">Key Contact</th>
                  <th className="py-3 px-3">Direct Phone</th>
                  <th className="py-3 px-3">Target Goods</th>
                  <th className="py-3 px-2 text-center">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading verified buyers...
                    </td>
                  </tr>
                ) : importers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No importers found matching criteria.
                    </td>
                  </tr>
                ) : (
                  importers.map((cust) => (
                    <tr
                      key={cust.id}
                      className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setSelectedCustomer(cust)}
                          className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                            isLight ? 'text-slate-900 hover:text-blue-600' : 'text-white hover:text-blue-400'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{cust.company_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-400">
                        {cust.city ? `${cust.city}, ` : ''}{cust.country}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-300">
                        {cust.contact_person || 'Commercial Buyer Desk'}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-400">
                        {cust.phone || 'N/A'}
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate" title={cust.matched_varieties}>
                        {cust.matched_varieties || 'Commodity Grains'}
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
                  ))
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
