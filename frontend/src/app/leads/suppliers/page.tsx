'use client';

import React, { useEffect, useState } from 'react';
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
  Star
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

export default function VerifiedSuppliersPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

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
  const [loading, setLoading] = useState(true);

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

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      if (commodity) params.append('commodity', commodity);
      if (search) params.append('search', search);
      if (minScore !== '') params.append('min_score', String(minScore));
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
  }, [district, state, commodity, minScore, page]);

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
    setPage(1);
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

  // Scalable Page Left Navigation Items
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
      badge: total || 26,
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

        <div className="flex items-center gap-2">
          <Link
            href="/crawler"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Crawl New Suppliers</span>
          </Link>

          <a
            href={`${API_BASE}/leads/export?lead_type=wb_mill&district=${district}`}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
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
              <div className="text-[10px] text-slate-500">Commercial facilities</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">GST Compliant</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{aggregations.verified_gst_count}</div>
              <div className="text-[10px] text-slate-500">Verified trade tax IDs</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Production Clusters</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{aggregations.top_districts?.length || 0} Districts</div>
              <div className="text-[10px] text-slate-500">Eastern & Northern hubs</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="text-slate-400 text-xs">Primary Hub</div>
              <div className="text-sm font-bold text-purple-400 mt-1.5 truncate">
                {aggregations.top_districts?.[0]?.district || 'Burdwan'}
              </div>
              <div className="text-[10px] text-slate-500">
                {aggregations.top_districts?.[0]?.count || 0} operating plants
              </div>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className={`p-3 rounded-xl border transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier by name, GSTIN, district..."
                className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <option value="">All Production Hubs</option>
                <option value="Burdwan">Burdwan (Purba / Paschim)</option>
                <option value="Hooghly">Hooghly Belt</option>
                <option value="Nadia">Nadia Zone</option>
                <option value="Birbhum">Birbhum Agro Cluster</option>
                <option value="Kolkata">Kolkata Logistics Port</option>
              </select>

              <select
                value={commodity}
                onChange={(e) => { setCommodity(e.target.value); setPage(1); }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <option value="">All Commodities</option>
                <option value="Swarna">Swarna Parboiled</option>
                <option value="Minikit">Minikit Rice</option>
                <option value="Basmati">Basmati 1121/1509</option>
                <option value="Non-Basmati">Non-Basmati Commercial</option>
                <option value="Wheat">Wheat & Flour</option>
              </select>

              <button
                type="submit"
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${accentClasses.bg}`}
              >
                Apply
              </button>

              {(district || state || commodity || search || minScore !== '') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Suppliers Table */}
        <div className={`rounded-xl overflow-hidden border shadow-sm transition ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-semibold tracking-wider uppercase text-[10px] ${
                  isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  <th className="py-3 px-4">Supplier / Producer Name</th>
                  <th className="py-3 px-3">District & State</th>
                  <th className="py-3 px-3">GSTIN / Licensing</th>
                  <th className="py-3 px-3">Key Contact</th>
                  <th className="py-3 px-3">Commodity Spec</th>
                  <th className="py-3 px-2 text-center">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" />
                      Loading verified suppliers...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No suppliers found matching criteria.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((mill) => (
                    <tr
                      key={mill.id}
                      className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setSelectedCustomer(mill)}
                          className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                            isLight ? 'text-slate-900 hover:text-emerald-600' : 'text-white hover:text-emerald-400'
                          }`}
                        >
                          <Factory className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{mill.company_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-400">
                        {mill.district || 'Burdwan'}, {mill.state || 'West Bengal'}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {mill.gstin ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ShieldCheck className="w-3 h-3" />
                            {mill.gstin}
                          </span>
                        ) : (
                          <span className="text-slate-500">Pending</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {mill.contact_person || 'Facility Incharge'}
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[180px] truncate" title={mill.matched_varieties}>
                        {mill.matched_varieties || 'Sortex Cleaned Grain'}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          mill.priority_score >= 70
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {mill.priority_score || 65}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCustomer(mill)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                          >
                            Dossier
                          </button>
                          <button
                            onClick={() => openConvertModal(mill)}
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
                <Kanban className="w-5 h-5 text-emerald-400" />
                Enroll Supplier in Pipeline Deal
              </h3>
              <button onClick={() => setConvertCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Producer / Supplier</label>
                <input
                  type="text"
                  disabled
                  value={convertCustomer.company_name}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-lg cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contract / Deal Title *</label>
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
                  <label className="block text-slate-300 font-semibold mb-1">Commodity Line</label>
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
                  <label className="block text-slate-300 font-semibold mb-1">Incoterms</label>
                  <input
                    type="text"
                    value={convertForm.incoterm}
                    onChange={(e) => setConvertForm({ ...convertForm, incoterm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Terms</label>
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
                  className={`px-5 py-2 rounded-xl font-semibold text-white ${accentClasses.bg} shadow-md transition`}
                >
                  Save Contract Deal
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
          openConvertModal(c || selectedCustomer);
        }}
      />
    </Shell>
  );
}
