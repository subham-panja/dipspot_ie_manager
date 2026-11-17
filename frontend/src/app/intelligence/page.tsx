'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
  Radar,
  Ship,
  TrendingUp,
  ShieldCheck,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Anchor,
  Globe,
  DollarSign,
  AlertTriangle,
  Building,
  Scale,
  CheckCircle,
  X,
  Tag,
  BarChart2,
  Trash2
} from 'lucide-react';

interface IntelligenceSummary {
  total_tracked_competitors: number;
  total_monitored_freight_routes: number;
  total_commodity_benchmarks: number;
  total_tariff_codes: number;
  avg_freight_rate_20ft_usd: number;
  avg_fob_price_usd_mt: number;
  total_competitor_monthly_volume_mt: number;
}

interface Competitor {
  company_name: string;
  hq_country: string;
  estimated_volume_mt_month: number;
  core_varieties: string;
  primary_export_markets: string[];
  export_ports: string[];
  pricing_strategy: string;
  market_share_tier: string;
  strengths: string;
  vulnerabilities: string;
}

interface FreightRoute {
  origin_port: string;
  destination_port: string;
  rate_20ft_usd: number;
  rate_40ft_usd: number;
  transit_days: number;
  carrier: string;
  trend: string;
}

interface PriceBenchmark {
  commodity: string;
  grade: string;
  fob_price_usd_mt: number;
  cif_jebel_ali_usd_mt: number;
  change_wow_usd: string;
  trend: string;
}

interface TariffRule {
  hs_code: string;
  description: string;
  indian_export_duty_pct: number;
  mep_usd_mt: number | null;
  apeda_registration: string;
  gulf_sfda_requirements: string;
}

interface CompetitorQuote {
  quote_id: string;
  competitor_name: string;
  commodity: string;
  origin_port: string;
  fob_price_usd_mt: number;
  cif_price_usd_mt: number;
  payment_terms: string;
  valid_until: string;
  spread_vs_tradepulse: number;
  notes: string;
}

export default function IntelligencePage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'competitors' | 'quotes' | 'freight' | 'pricing' | 'tariffs'>('competitors');
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorQuotes, setCompetitorQuotes] = useState<CompetitorQuote[]>([]);
  const [freight, setFreight] = useState<FreightRoute[]>([]);
  const [pricing, setPricing] = useState<PriceBenchmark[]>([]);
  const [tariffs, setTariffs] = useState<TariffRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddPrice, setShowAddPrice] = useState(false);

  // Forms
  const [compForm, setCompForm] = useState({
    company_name: '',
    hq_country: 'India',
    estimated_volume_mt_month: 8000,
    core_varieties: 'IR-64 Parboiled Rice',
    primary_export_markets: 'UAE, Saudi Arabia, Benin',
    export_ports: 'Kolkata Port, Kakinada',
    pricing_strategy: 'Aggressive pricing, razor-thin margin',
    market_share_tier: 'Tier 1 Top Exporter',
    strengths: 'Massive supply capacity across regional hubs',
    vulnerabilities: 'High debt leverage, delayed BL releases',
  });

  const [quoteForm, setQuoteForm] = useState({
    competitor_name: '',
    commodity: 'IR-64 Parboiled Rice 5% Broken',
    origin_port: 'Kolkata Port (INCCU)',
    fob_price_usd_mt: 420,
    cif_price_usd_mt: 455,
    payment_terms: '100% L/C at Sight',
    spread_vs_tradepulse: -10,
    notes: 'Offered for 10x20ft FCL prompt shipment',
  });

  const [routeForm, setRouteForm] = useState({
    origin_port: 'Kolkata Port (INCCU)',
    destination_port: 'Jebel Ali Port (AEDXB)',
    rate_20ft_usd: 620,
    rate_40ft_usd: 1050,
    transit_days: 14,
    carrier: 'Maersk / MSC',
    trend: 'Falling',
  });

  const [priceForm, setPriceForm] = useState({
    commodity: 'IR-64 Parboiled 5% Broken',
    grade: 'Sortex 100% Clean',
    fob_price_usd_mt: 440,
    cif_jebel_ali_usd_mt: 470,
    change_wow_usd: '-5.00',
    trend: 'Bearish',
  });

  // Universal Escape key closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddCompetitor(false);
        setShowAddQuote(false);
        setShowAddRoute(false);
        setShowAddPrice(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync tab from URL query param if navigated from sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qTab = new URLSearchParams(window.location.search).get('tab');
      if (qTab && ['competitors', 'quotes', 'freight', 'pricing', 'tariffs'].includes(qTab)) {
        setActiveTab(qTab as any);
      }
    }
  }, []);

  const loadAllIntel = async () => {
    try {
      setLoading(true);
      const [sumRes, compRes, quotesRes, frtRes, prcRes, trfRes] = await Promise.all([
        fetchJson<IntelligenceSummary>('/intelligence/summary'),
        fetchJson<{ competitors: Competitor[] }>('/intelligence/competitors'),
        fetchJson<{ competitor_quotes: CompetitorQuote[] }>('/intelligence/competitor-pricing'),
        fetchJson<{ freight_index: FreightRoute[] }>('/intelligence/freight'),
        fetchJson<{ price_benchmarks: PriceBenchmark[] }>('/intelligence/pricing'),
        fetchJson<{ tariffs: TariffRule[] }>('/intelligence/tariffs'),
      ]);
      setSummary(sumRes);
      setCompetitors(compRes.competitors || []);
      setCompetitorQuotes(quotesRes.competitor_quotes || []);
      setFreight(frtRes.freight_index || []);
      setPricing(prcRes.price_benchmarks || []);
      setTariffs(trfRes.tariffs || []);
    } catch (e) {
      console.error('Failed to load intelligence data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllIntel();
  }, []);

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/intelligence/competitors', {
        method: 'POST',
        body: JSON.stringify({
          ...compForm,
          primary_export_markets: compForm.primary_export_markets.split(',').map((s) => s.trim()),
          export_ports: compForm.export_ports.split(',').map((s) => s.trim()),
        }),
      });
      setShowAddCompetitor(false);
      loadAllIntel();
    } catch (err: any) {
      alert('Failed to add competitor: ' + err.message);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/intelligence/competitor-pricing', {
        method: 'POST',
        body: JSON.stringify(quoteForm),
      });
      setShowAddQuote(false);
      loadAllIntel();
    } catch (err: any) {
      alert('Failed to add quote: ' + err.message);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this competitor quote?')) return;
    try {
      await fetchJson(`/intelligence/competitor-pricing/${quoteId}`, { method: 'DELETE' });
      loadAllIntel();
    } catch (err: any) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/intelligence/freight', {
        method: 'POST',
        body: JSON.stringify(routeForm),
      });
      setShowAddRoute(false);
      loadAllIntel();
    } catch (err: any) {
      alert('Failed to add freight route: ' + err.message);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/intelligence/pricing', {
        method: 'POST',
        body: JSON.stringify(priceForm),
      });
      setShowAddPrice(false);
      loadAllIntel();
    } catch (err: any) {
      alert('Failed to add price benchmark: ' + err.message);
    }
  };

  return (
    <Shell>
      {/* Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Market & Trade Intelligence
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Competitor Surveillance & Freight Index</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Radar className={`w-6 h-6 ${accentClasses.text}`} />
            Competitive Intelligence & Spot Pricing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of exporter spot offers, ocean freight TEU indices, commodity benchmarks, and customs policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddQuote(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} shadow-md transition flex items-center gap-1.5`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Competitor Quote</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Avg 20ft Ocean Freight</span>
              <Ship className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              ${summary.avg_freight_rate_20ft_usd} <span className="text-xs font-normal text-slate-400">/ TEU</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Port of Origin to UAE / Saudi</div>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Benchmark FOB Price</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              ${summary.avg_fob_price_usd_mt} <span className="text-xs font-normal text-slate-400">/ MT</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Export Port Gateways</div>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Competitor Volume</span>
              <Building className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">
              {summary.total_competitor_monthly_volume_mt.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">MT/mo</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{summary.total_tracked_competitors} major exporters monitored</div>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Tariff & HS Codes</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {summary.total_tariff_codes} Codes
            </div>
            <div className="text-xs text-slate-400 mt-1">Export policy & duty rules</div>
          </div>
        </div>
      )}

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Intelligence Scope"
        subtitle="Market Watch & Pricing"
        items={[
          {
            id: 'competitors',
            label: 'Competitor Surveillance',
            icon: <Building className="w-4 h-4" />,
            badge: competitors.length,
            onClick: () => setActiveTab('competitors'),
            active: activeTab === 'competitors',
            desc: 'Profiles & supply capacities',
          },
          {
            id: 'quotes',
            label: 'Spot Pricing Matrix',
            icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
            badge: competitorQuotes.length,
            onClick: () => setActiveTab('quotes'),
            active: activeTab === 'quotes',
            desc: 'FOB/CIF quote comparison',
          },
          {
            id: 'freight',
            label: 'Ocean Freight Index',
            icon: <Ship className="w-4 h-4 text-blue-400" />,
            badge: freight.length,
            onClick: () => setActiveTab('freight'),
            active: activeTab === 'freight',
            desc: '20ft/40ft TEU benchmark rates',
          },
          {
            id: 'pricing',
            label: 'Commodity Benchmarks',
            icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
            badge: pricing.length,
            onClick: () => setActiveTab('pricing'),
            active: activeTab === 'pricing',
            desc: 'Spot pricing & weekly deltas',
          },
          {
            id: 'tariffs',
            label: 'Customs & Tariffs',
            icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
            badge: tariffs.length,
            onClick: () => setActiveTab('tariffs'),
            active: activeTab === 'tariffs',
            desc: 'Export duties & MEP rules',
          },
        ]}
        activeId={activeTab}
      >

      {/* TAB 1: COMPETITOR PROFILES */}
      {activeTab === 'competitors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              Surveillance intelligence tracking competitor processing & supply capacities, port logistics, and contract tactics.
            </p>
            <button
              onClick={() => setShowAddCompetitor(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Competitor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((c, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border space-y-3.5 shadow-sm transition ${
                  isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                      {c.market_share_tier}
                    </span>
                    <h3 className={`text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {c.company_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">HQ: {c.hq_country}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Est. Volume</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {c.estimated_volume_mt_month.toLocaleString()} MT/mo
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border space-y-2 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800/80'
                }`}>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Core Varieties:</span>
                    <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{c.core_varieties}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Target Markets:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.primary_export_markets?.map((m, i) => (
                        <span key={i} className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Export Ports:</span>
                    <span className="text-slate-400">{c.export_ports?.join(', ')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Key Strength</span>
                    <span className="text-slate-300 text-[11px] mt-0.5 block">{c.strengths || 'N/A'}</span>
                  </div>
                  <div className="bg-red-950/20 border border-red-900/40 p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Vulnerability / Edge</span>
                    <span className="text-slate-300 text-[11px] mt-0.5 block">{c.vulnerabilities || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITOR SPOT PRICING MATRIX */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              Configured competitor spot offers, FOB/CIF differentials, and pricing spread relative to TradePulse benchmark quotes.
            </p>
            <button
              onClick={() => setShowAddQuote(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Spot Offer
            </button>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className={`uppercase text-[10px] font-semibold border-b ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="p-3.5">Competitor</th>
                  <th className="p-3.5">Commodity Spec</th>
                  <th className="p-3.5">Origin Port</th>
                  <th className="p-3.5">FOB ($/MT)</th>
                  <th className="p-3.5">CIF ($/MT)</th>
                  <th className="p-3.5">Payment Terms</th>
                  <th className="p-3.5">Spread vs TradePulse</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {competitorQuotes.map((q) => {
                  const isUnder = q.spread_vs_tradepulse < 0;
                  return (
                    <tr key={q.quote_id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div>{q.competitor_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{q.quote_id}</div>
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">{q.commodity}</td>
                      <td className="p-3.5 text-slate-300">{q.origin_port}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">${q.fob_price_usd_mt}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-400">${q.cif_price_usd_mt}</td>
                      <td className="p-3.5 text-slate-300">{q.payment_terms}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                            isUnder
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {q.spread_vs_tradepulse > 0 ? `+${q.spread_vs_tradepulse}` : q.spread_vs_tradepulse} $/MT
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteQuote(q.quote_id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OCEAN FREIGHT INDEX */}
      {activeTab === 'freight' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              Live container benchmark rates for 20ft & 40ft TEUs from Indian East Coast ports to destination gateways.
            </p>
            <button
              onClick={() => setShowAddRoute(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Freight Route
            </button>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className={`uppercase text-[10px] font-semibold border-b ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="p-3.5">Origin Port</th>
                  <th className="p-3.5">Destination Gateway</th>
                  <th className="p-3.5">20ft FCL ($)</th>
                  <th className="p-3.5">40ft FCL ($)</th>
                  <th className="p-3.5">Transit Days</th>
                  <th className="p-3.5">Major Carrier</th>
                  <th className="p-3.5">Rate Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {freight.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-medium text-white flex items-center gap-2">
                      <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                      {r.origin_port}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">{r.destination_port}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">${r.rate_20ft_usd}</td>
                    <td className="p-3.5 font-mono text-slate-300">${r.rate_40ft_usd}</td>
                    <td className="p-3.5 font-mono">{r.transit_days} days</td>
                    <td className="p-3.5">{r.carrier}</td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          r.trend === 'Falling'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : r.trend === 'Rising'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {r.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COMMODITY PRICING BENCHMARKS */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              Spot pricing index for universal commodities with weekly price delta.
            </p>
            <button
              onClick={() => setShowAddPrice(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Price Benchmark
            </button>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className={`uppercase text-[10px] font-semibold border-b ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="p-3.5">Commodity Variety</th>
                  <th className="p-3.5">Grade Specification</th>
                  <th className="p-3.5">FOB Port ($/MT)</th>
                  <th className="p-3.5">CIF Jebel Ali ($/MT)</th>
                  <th className="p-3.5">WoW Change</th>
                  <th className="p-3.5">Market Outlook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pricing.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-white">{p.commodity}</td>
                    <td className="p-3.5 text-slate-300">{p.grade}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">${p.fob_price_usd_mt}</td>
                    <td className="p-3.5 font-mono font-bold text-blue-400">${p.cif_jebel_ali_usd_mt}</td>
                    <td className="p-3.5 font-mono">
                      <span
                        className={`font-semibold ${
                          p.change_wow_usd.startsWith('+')
                            ? 'text-red-400'
                            : p.change_wow_usd.startsWith('-')
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {p.change_wow_usd}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          p.trend === 'Bullish'
                            ? 'bg-red-500/10 text-red-400'
                            : p.trend === 'Bearish'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {p.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TARIFFS & HS CODE RULES */}
      {activeTab === 'tariffs' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Export policy compliance: DGFT export duty structures, Minimum Export Price (MEP) status, and destination food safety certifications.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tariffs.map((t, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border space-y-4 shadow-sm ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      HS {t.hs_code}
                    </span>
                    <h3 className={`text-sm font-bold mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {t.description}
                    </h3>
                  </div>
                </div>

                <div className={`p-3.5 rounded-lg border space-y-2.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Export Duty:</span>
                    <span className={`font-mono font-bold ${t.indian_export_duty_pct === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {t.indian_export_duty_pct}% Duty
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Minimum Export Price (MEP):</span>
                    <span className="font-mono text-slate-200">
                      {t.mep_usd_mt ? `$${t.mep_usd_mt}/MT` : 'None (Unrestricted)'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">APEDA Registration:</span>
                    <span className="text-slate-300 text-[11px] mt-0.5 block">{t.apeda_registration}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">SFDA / Food Safety:</span>
                    <span className="text-slate-300 text-[11px] mt-0.5 block">{t.gulf_sfda_requirements}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </PageLeftNav>

      {/* Add Competitor Modal */}
      {showAddCompetitor && (
        <div
          onClick={() => setShowAddCompetitor(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`border rounded-2xl w-full max-w-lg p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Competitor Intelligence Profile
              </h3>
              <button onClick={() => setShowAddCompetitor(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCompetitor} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={compForm.company_name}
                  onChange={(e) => setCompForm({ ...compForm, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Est. Volume MT/Month</label>
                  <input
                    type="number"
                    value={compForm.estimated_volume_mt_month}
                    onChange={(e) => setCompForm({ ...compForm, estimated_volume_mt_month: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Market Share Tier</label>
                  <select
                    value={compForm.market_share_tier}
                    onChange={(e) => setCompForm({ ...compForm, market_share_tier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tier 1 Conglomerate">Tier 1 Conglomerate</option>
                    <option value="Mid-Tier Exporter">Mid-Tier Exporter</option>
                    <option value="Regional Supplier">Regional Supplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Core Varieties</label>
                <input
                  type="text"
                  value={compForm.core_varieties}
                  onChange={(e) => setCompForm({ ...compForm, core_varieties: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Key Strength</label>
                <input
                  type="text"
                  value={compForm.strengths}
                  onChange={(e) => setCompForm({ ...compForm, strengths: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vulnerability / Edge</label>
                <input
                  type="text"
                  value={compForm.vulnerabilities}
                  onChange={(e) => setCompForm({ ...compForm, vulnerabilities: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCompetitor(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`font-medium text-sm px-5 py-2 rounded-lg shadow-md transition text-white ${accentClasses.bg}`}
                >
                  Save Competitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Competitor Spot Quote Modal */}
      {showAddQuote && (
        <div
          onClick={() => setShowAddQuote(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`border rounded-2xl w-full max-w-lg p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Competitor Spot Offer
              </h3>
              <button onClick={() => setShowAddQuote(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuote} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Competitor / Exporter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pattabhi Agro Foods Pvt Ltd"
                  value={quoteForm.competitor_name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, competitor_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Commodity Spec</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.commodity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, commodity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Origin Port</label>
                  <input
                    type="text"
                    value={quoteForm.origin_port}
                    onChange={(e) => setQuoteForm({ ...quoteForm, origin_port: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">FOB ($/MT)</label>
                  <input
                    type="number"
                    value={quoteForm.fob_price_usd_mt}
                    onChange={(e) => setQuoteForm({ ...quoteForm, fob_price_usd_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CIF ($/MT)</label>
                  <input
                    type="number"
                    value={quoteForm.cif_price_usd_mt}
                    onChange={(e) => setQuoteForm({ ...quoteForm, cif_price_usd_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Spread ($/MT)</label>
                  <input
                    type="number"
                    value={quoteForm.spread_vs_tradepulse}
                    onChange={(e) => setQuoteForm({ ...quoteForm, spread_vs_tradepulse: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={quoteForm.payment_terms}
                  onChange={(e) => setQuoteForm({ ...quoteForm, payment_terms: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Surveillance Notes</label>
                <input
                  type="text"
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddQuote(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`font-semibold px-5 py-2 rounded-xl text-white ${accentClasses.bg}`}
                >
                  Save Spot Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Freight Route Modal */}
      {showAddRoute && (
        <div
          onClick={() => setShowAddRoute(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`border rounded-2xl w-full max-w-md p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Ship className="w-5 h-5 text-emerald-400" />
                Add Ocean Freight Route
              </h3>
              <button onClick={() => setShowAddRoute(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoute} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Origin Port *</label>
                <input
                  type="text"
                  required
                  value={routeForm.origin_port}
                  onChange={(e) => setRouteForm({ ...routeForm, origin_port: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Port *</label>
                <input
                  type="text"
                  required
                  value={routeForm.destination_port}
                  onChange={(e) => setRouteForm({ ...routeForm, destination_port: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">20ft FCL ($)</label>
                  <input
                    type="number"
                    value={routeForm.rate_20ft_usd}
                    onChange={(e) => setRouteForm({ ...routeForm, rate_20ft_usd: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">40ft FCL ($)</label>
                  <input
                    type="number"
                    value={routeForm.rate_40ft_usd}
                    onChange={(e) => setRouteForm({ ...routeForm, rate_40ft_usd: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Transit Days</label>
                  <input
                    type="number"
                    value={routeForm.transit_days}
                    onChange={(e) => setRouteForm({ ...routeForm, transit_days: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Carrier</label>
                  <input
                    type="text"
                    value={routeForm.carrier}
                    onChange={(e) => setRouteForm({ ...routeForm, carrier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoute(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`font-medium text-sm px-5 py-2 rounded-lg shadow-md transition text-white ${accentClasses.bg}`}
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Price Benchmark Modal */}
      {showAddPrice && (
        <div
          onClick={() => setShowAddPrice(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`border rounded-2xl w-full max-w-md p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Add Commodity Price Benchmark
              </h3>
              <button onClick={() => setShowAddPrice(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPrice} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Commodity *</label>
                <input
                  type="text"
                  required
                  value={priceForm.commodity}
                  onChange={(e) => setPriceForm({ ...priceForm, commodity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Grade Specification</label>
                <input
                  type="text"
                  value={priceForm.grade}
                  onChange={(e) => setPriceForm({ ...priceForm, grade: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">FOB Price ($/MT)</label>
                  <input
                    type="number"
                    value={priceForm.fob_price_usd_mt}
                    onChange={(e) => setPriceForm({ ...priceForm, fob_price_usd_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CIF Jebel Ali ($/MT)</label>
                  <input
                    type="number"
                    value={priceForm.cif_jebel_ali_usd_mt}
                    onChange={(e) => setPriceForm({ ...priceForm, cif_jebel_ali_usd_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPrice(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`font-medium text-sm px-5 py-2 rounded-lg shadow-md transition text-white ${accentClasses.bg}`}
                >
                  Save Benchmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
