'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  FileText,
  DollarSign,
  CheckSquare,
  ShieldCheck,
  Search,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Anchor,
  Building,
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface ScreenerRecord {
  id: string;
  name: string;
  type: 'Entity' | 'Vessel' | 'Port / Region';
  jurisdiction: string;
  list: 'OFAC SDN' | 'UN Sanctions' | 'EU Sanctions' | 'DGFT Denied' | 'Global Trade Watch';
  status: 'clean' | 'caution' | 'sanctioned';
  matchScore: number;
  lastChecked: string;
  details: string;
}

export default function ComplianceScreenerPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Entity' | 'Vessel' | 'Port'>('All');

  const [records, setRecords] = useState<ScreenerRecord[]>([
    {
      id: 'rec-1',
      name: 'Al-Dhiyafa Foodstuff Trading LLC',
      type: 'Entity',
      jurisdiction: 'United Arab Emirates (Dubai)',
      list: 'Global Trade Watch',
      status: 'clean',
      matchScore: 0,
      lastChecked: '2026-04-12 11:30 UTC',
      details: 'No match found on OFAC, EU, UN, or DGFT denied entity databases. Entity is clear for commercial export.',
    },
    {
      id: 'rec-2',
      name: 'MSC CLAUDIA (IMO: 9275000)',
      type: 'Vessel',
      jurisdiction: 'Liberia (Flag)',
      list: 'Global Trade Watch',
      status: 'clean',
      matchScore: 0,
      lastChecked: '2026-04-12 11:30 UTC',
      details: 'Vessel AIS active, valid P&I club insurance, no shadow fleet or sanctioned port calls in past 36 months.',
    },
    {
      id: 'rec-3',
      name: 'Bab-el-Mandeb Strait Maritime Corridor',
      type: 'Port / Region',
      jurisdiction: 'Southern Red Sea / Gulf of Aden',
      list: 'Global Trade Watch',
      status: 'caution',
      matchScore: 78,
      lastChecked: '2026-04-12 10:15 UTC',
      details: 'High War-Risk Area (JWLA-032). Marine Hull War Risk Surcharge applies. Consider Cape of Good Hope routing if carrier re-routes.',
    },
    {
      id: 'rec-4',
      name: 'Burdwan Agro Mills Syndicate Pvt Ltd',
      type: 'Entity',
      jurisdiction: 'India (West Bengal)',
      list: 'DGFT Denied',
      status: 'clean',
      matchScore: 0,
      lastChecked: '2026-04-12 09:40 UTC',
      details: 'IEC Code 0208014529 active, GSTIN verified in good standing, compliant with APEDA export registration.',
    },
    {
      id: 'rec-5',
      name: 'Nordic Transocean LLC (Alias: Sovcargo Star)',
      type: 'Entity',
      jurisdiction: 'Cyprus / Russia',
      list: 'OFAC SDN',
      status: 'sanctioned',
      matchScore: 98,
      lastChecked: '2026-04-11 16:20 UTC',
      details: 'Designated under Executive Order 14024. Prohibited transaction: All assets blocked, no export clearance permitted.',
    },
  ]);

  const handleSimulateScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const isRisky = query.toLowerCase().includes('nordic') || query.toLowerCase().includes('iran') || query.toLowerCase().includes('syria');
    const isCaution = query.toLowerCase().includes('red sea') || query.toLowerCase().includes('yemen') || query.toLowerCase().includes('transship');

    const newRecord: ScreenerRecord = {
      id: `rec-${Date.now()}`,
      name: query.trim(),
      type: query.toLowerCase().includes('port') || query.toLowerCase().includes('sea') ? 'Port / Region' : query.toLowerCase().includes('msc') || query.toLowerCase().includes('imo') ? 'Vessel' : 'Entity',
      jurisdiction: 'Automated Global Screener',
      list: isRisky ? 'OFAC SDN' : 'Global Trade Watch',
      status: isRisky ? 'sanctioned' : isCaution ? 'caution' : 'clean',
      matchScore: isRisky ? 96 : isCaution ? 72 : 0,
      lastChecked: 'Just now',
      details: isRisky
        ? 'Direct match found on global sanctions list. Transactions with this party are prohibited without specific OFAC/DGFT license.'
        : isCaution
        ? 'Secondary watch alert: Entity or region requires enhanced due diligence (EDD) before bill of lading issuance.'
        : 'Zero matches detected across 140+ global sanctioned entity, embargoed port, and restricted party lists.',
    };

    setRecords([newRecord, ...records]);
    setQuery('');
  };

  const filteredRecords = records.filter((r) => {
    if (filterType === 'Entity') return r.type === 'Entity';
    if (filterType === 'Vessel') return r.type === 'Vessel';
    if (filterType === 'Port') return r.type === 'Port / Region';
    return true;
  });

  const navItems: PageSubNavItem[] = [
    {
      id: 'docs',
      label: 'Commercial Invoices & Documents',
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      href: '/operations/documents',
      active: false,
      desc: 'Proforma, Commercial & Packing lists',
    },
    {
      id: 'fx',
      label: 'FX Hedging & Converter',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
      href: '/operations/fx',
      active: false,
      desc: 'Multi-currency rates & spread',
    },
    {
      id: 'lc',
      label: 'L/C Discrepancy Checker',
      icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
      href: '/operations/lc',
      active: false,
      desc: 'UCP 600 compliance verification',
    },
    {
      id: 'compliance',
      label: 'Sanctions & Port Screener',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      href: '/operations/compliance',
      active: true,
      desc: 'Denied parties, OFAC & DGFT lists',
    },
  ];

  return (
    <Shell>
      <PageLeftNav
        title="Trade Operations"
        badge="Export Execution"
        items={navItems}
        headerAction={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Watchlists Up-to-Date
          </span>
        }
      >
        <div className="space-y-6">
          {/* Header Description */}
          <div
            className={`p-5 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Trade Compliance Screening
                  </span>
                  <span className="text-xs text-slate-400">OFAC, UN Security Council, EU & DGFT Screening</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">Sanctions, Denied Parties & Port Screener</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Screen buyers, suppliers, shipping vessels (IMO), and transshipment ports against international trade embargoes before signing export sales contracts.
                </p>
              </div>
            </div>

            {/* Quick Screen Search Form */}
            <form onSubmit={handleSimulateScreen} className="mt-5 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Entity Name, Vessel IMO Number, or Port UN/LOCODE (e.g. Al-Dhiyafa, MSC CLAUDIA, INCCU)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-xs ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                      : 'bg-slate-800/80 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition shrink-0 ${accentClasses.btn}`}
              >
                Screen Now
              </button>
            </form>
          </div>

          {/* Results & Watchlist Feed */}
          <div
            className={`p-5 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold tracking-wide">Recent Due Diligence Checks ({filteredRecords.length})</h2>
              <div className="flex items-center gap-1.5 text-xs">
                {(['All', 'Entity', 'Vessel', 'Port'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded text-xs transition ${
                      filterType === t
                        ? isLight
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-800 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition ${
                    item.status === 'sanctioned'
                      ? isLight
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-rose-950/20 border-rose-800/40'
                      : item.status === 'caution'
                      ? isLight
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-amber-950/20 border-amber-800/40'
                      : isLight
                      ? 'bg-slate-50/60 border-slate-200'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'Entity' && <Building className="w-4 h-4 text-slate-400" />}
                      {item.type === 'Vessel' && <Anchor className="w-4 h-4 text-cyan-400" />}
                      {item.type === 'Port / Region' && <Globe className="w-4 h-4 text-amber-400" />}
                      <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">{item.lastChecked}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          item.status === 'clean'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'caution'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.status === 'clean' && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === 'caution' && <AlertTriangle className="w-3 h-3" />}
                        {item.status === 'sanctioned' && <AlertOctagon className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2">{item.details}</p>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                    <span>Jurisdiction: {item.jurisdiction}</span>
                    <span>Database: {item.list}</span>
                    <span>Match Probability: {item.matchScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLeftNav>
    </Shell>
  );
}
