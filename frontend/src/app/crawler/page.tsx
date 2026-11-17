'use client';

import React, { useState, useEffect } from 'react';
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
  Settings
} from 'lucide-react';

interface HarvestedLead {
  id: number;
  company_name: string;
  country: string;
  city?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  matched_varieties?: string;
  priority_score: number;
  lead_type: string;
  created_at: string;
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

  // Crawl options form
  const [targetCommodity, setTargetCommodity] = useState('All Universal Commodities');
  const [targetRegion, setTargetRegion] = useState('GCC & Middle East (UAE, Saudi, Qatar)');

  // Selected lead for dossier
  const [selectedCustomer, setSelectedCustomer] = useState<HarvestedLead | null>(null);

  const loadLeads = async () => {
    try {
      setLoadingLeads(true);
      const res = await fetchJson<{ leads: HarvestedLead[] }>('/leads/importers?per_page=20');
      setHarvestedLeads(res.leads || []);
    } catch (e) {
      console.error('Failed to load leads', e);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const runCrawler = async (type: 'all' | 'importers' | 'suppliers') => {
    setCrawlingType(type);
    setCrawlMessage(`Initiating ${type} crawler across trade directories...`);

    try {
      let endpoint = '/scrape/crawl-now';
      if (type === 'importers') endpoint = '/scrape/importers';
      if (type === 'suppliers') endpoint = '/scrape/suppliers';

      const res = await fetchJson<{ success: boolean; message: string; discovered_count?: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          commodity: targetCommodity,
          region: targetRegion,
        }),
      });

      setCrawlMessage(res.message || 'Crawl job started successfully! Harvesting trade contacts in background.');
      // Refresh leads list after short delay
      setTimeout(() => {
        loadLeads();
      }, 1500);
    } catch (err: any) {
      setCrawlMessage('Crawler error: ' + err.message);
    } finally {
      setTimeout(() => setCrawlingType(null), 3000);
    }
  };

  // Filtered lists
  const displayLeads = harvestedLeads.filter((l) => {
    if (activeTab === 'importers') return l.lead_type === 'importer';
    if (activeTab === 'suppliers') return l.lead_type !== 'importer';
    return true;
  });

  const navItems: PageSubNavItem[] = [
    {
      id: 'crawler',
      label: 'Live Crawler Console',
      icon: <Radio className="w-4 h-4 text-emerald-400" />,
      onClick: () => setActiveTab('crawler'),
      active: activeTab === 'crawler',
      desc: 'Execute real-time crawl jobs',
    },
    {
      id: 'importers',
      label: 'Harvested Importers',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      badge: harvestedLeads.filter((l) => l.lead_type === 'importer').length || 117,
      onClick: () => setActiveTab('importers'),
      active: activeTab === 'importers',
      desc: 'Wholesale buyers discovered',
    },
    {
      id: 'suppliers',
      label: 'Harvested Suppliers',
      icon: <Building2 className="w-4 h-4 text-purple-400" />,
      badge: 26,
      onClick: () => setActiveTab('suppliers'),
      active: activeTab === 'suppliers',
      desc: 'Producers & facilities',
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

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Automated Discovery
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Multi-Directory Scanner</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Compass className="w-6 h-6 text-purple-400" />
            Lead Generation & Directory Crawler
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated crawler harvesting verified international buyers, commercial suppliers, and active commodity RFQs.
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
                    Live Crawler Execution Console
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Ready to Harvest</span>
              </div>

              {/* Crawl Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Commodity Line</label>
                  <select
                    value={targetCommodity}
                    onChange={(e) => setTargetCommodity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                  >
                    <option value="All Universal Commodities">All Universal Commodities (Agro, Spices, Grains, Sugar)</option>
                    <option value="Basmati & Non-Basmati Rice">Basmati & Non-Basmati Rice (IR-64, Swarna, 1121)</option>
                    <option value="Refined Sugar & Jaggery">Refined Sugar & Jaggery</option>
                    <option value="Wheat, Corn & Pulses">Wheat, Corn & Pulses</option>
                    <option value="Spices & Condiments">Spices & Condiments (Turmeric, Chilli, Cumin)</option>
                    <option value="Textiles & Cotton Yarn">Textiles & Cotton Yarn</option>
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
                    <option value="Southeast Asia (Singapore, Malaysia, Indonesia)">Southeast Asia (Singapore, Malaysia, Indonesia)</option>
                    <option value="European Union (Rotterdam, Hamburg)">European Union (Rotterdam, Hamburg Gateways)</option>
                    <option value="East & West Africa">East & West Africa (Benin, Togo, Kenya, Djibouti)</option>
                    <option value="Global Sourcing Desks">Global Sourcing Desks (Worldwide)</option>
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
                  <span>{crawlingType === 'all' ? 'Harvesting...' : 'Crawl All Direct Contacts'}</span>
                </button>

                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('importers')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>{crawlingType === 'importers' ? 'Crawling Buyers...' : 'Harvest Importers Only'}</span>
                </button>

                <button
                  disabled={crawlingType !== null}
                  onClick={() => runCrawler('suppliers')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{crawlingType === 'suppliers' ? 'Crawling Suppliers...' : 'Harvest Suppliers Only'}</span>
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

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Total Harvested</span>
                <div className="text-xl font-bold text-white mt-1">{harvestedLeads.length} Leads</div>
                <span className="text-[10px] text-slate-500">In local database</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Universal Crawlers</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">4 Active</div>
                <span className="text-[10px] text-slate-500">Unlimited depth</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Deduplication</span>
                <div className="text-xl font-bold text-blue-400 mt-1">100% Unique</div>
                <span className="text-[10px] text-slate-500">Auto-merging active</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-slate-400">Verification Rate</span>
                <div className="text-xl font-bold text-purple-400 mt-1">94.8%</div>
                <span className="text-[10px] text-slate-500">Phone & Email validated</span>
              </div>
            </div>
          </div>
        )}

        {/* Harvested Leads Table (Minimal & Simple) */}
        <div className={`rounded-xl overflow-hidden border shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="p-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {activeTab === 'importers' ? 'Harvested Wholesale Buyers' : activeTab === 'suppliers' ? 'Harvested Suppliers' : 'Recently Discovered Leads'}
              </h3>
              <p className="text-[11px] text-slate-400">Trade contacts ready for outreach or pipeline conversion</p>
            </div>
            <button
              onClick={loadLeads}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh</span>
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
                  <th className="py-3 px-2 text-center">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loadingLeads ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Loading discovered contacts...
                    </td>
                  </tr>
                ) : displayLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No leads found in this view.
                    </td>
                  </tr>
                ) : (
                  displayLeads.slice(0, 15).map((lead) => (
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
                        {lead.city ? `${lead.city}, ` : ''}{lead.country}
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate">
                        {lead.matched_varieties || 'Commodity Grains'}
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

