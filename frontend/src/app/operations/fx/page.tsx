'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  DollarSign,
  FileText,
  CheckSquare,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  ArrowRightLeft,
  Percent,
  AlertTriangle,
  Scale
} from 'lucide-react';

interface CurrencyRate {
  pair: string;
  currency: string;
  country: string;
  rate: number;
  change24h: string;
  forwardPremium30dPct: number;
  trend: 'Appreciating' | 'Stable' | 'Depreciating';
}

const LIVE_FX_RATES: CurrencyRate[] = [
  {
    pair: 'USD/INR',
    currency: 'INR (Indian Rupee)',
    country: 'India',
    rate: 84.42,
    change24h: '+0.12%',
    forwardPremium30dPct: 0.18,
    trend: 'Stable',
  },
  {
    pair: 'USD/AED',
    currency: 'AED (UAE Dirham)',
    country: 'United Arab Emirates',
    rate: 3.6725,
    change24h: '0.00%',
    forwardPremium30dPct: 0.02,
    trend: 'Stable',
  },
  {
    pair: 'USD/SAR',
    currency: 'SAR (Saudi Riyal)',
    country: 'Saudi Arabia',
    rate: 3.7510,
    change24h: '0.00%',
    forwardPremium30dPct: 0.03,
    trend: 'Stable',
  },
  {
    pair: 'EUR/USD',
    currency: 'EUR (Euro)',
    country: 'European Union',
    rate: 1.0542,
    change24h: '-0.35%',
    forwardPremium30dPct: -0.12,
    trend: 'Depreciating',
  },
  {
    pair: 'USD/QAR',
    currency: 'QAR (Qatari Riyal)',
    country: 'Qatar',
    rate: 3.6415,
    change24h: '0.00%',
    forwardPremium30dPct: 0.02,
    trend: 'Stable',
  },
];

export default function CurrencyRiskPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  // Calculator State
  const [amountUsd, setAmountUsd] = useState<number>(116250);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [hedgeDays, setHedgeDays] = useState(30);

  const selectedRate = LIVE_FX_RATES.find((r) => r.pair.includes(selectedCurrency)) || LIVE_FX_RATES[0];
  const convertedAmount = amountUsd * selectedRate.rate;
  const forwardRate = selectedRate.rate * (1 + (selectedRate.forwardPremium30dPct / 100));
  const forwardConverted = amountUsd * forwardRate;
  const hedgeVariance = forwardConverted - convertedAmount;

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
      active: true,
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
      active: false,
      desc: 'High-risk trade entity filter',
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
              Treasury & Forex
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Central Bank Benchmarks</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Foreign Exchange & Hedging Risk Calculator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time currency pairs for trade corridors, calculate landed export contract values, and evaluate forward cover hedging.
          </p>
        </div>
      </div>

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Operations Hub"
        subtitle="Export Execution"
        items={navItems}
        activeId="fx"
      >
        <div className="space-y-5">
          {/* Live Currency Rates Table */}
          <div className={`rounded-xl overflow-hidden border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="p-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Trade Corridor Currency Matrix
                </h3>
                <p className="text-[11px] text-slate-400">Spot rates & 30-day forward hedging spread</p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live Interbank Feed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-semibold tracking-wider uppercase text-[10px] ${
                    isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    <th className="py-3 px-4">Currency Pair</th>
                    <th className="py-3 px-3">Jurisdiction</th>
                    <th className="py-3 px-3 text-right">Interbank Spot Rate</th>
                    <th className="py-3 px-3 text-right">24h Delta</th>
                    <th className="py-3 px-3 text-right">30D Forward Premium</th>
                    <th className="py-3 px-4 text-center">Trend Outlook</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {LIVE_FX_RATES.map((fx) => (
                    <tr key={fx.pair} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}>
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{fx.pair}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{fx.currency}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                        {fx.rate.toFixed(4)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {fx.change24h}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-400 font-semibold">
                        +{fx.forwardPremium30dPct}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {fx.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Contract Value & Hedging Calculator */}
          <div className={`p-6 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className={`text-sm font-bold pb-3 border-b border-slate-800/60 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Interactive Export Contract Conversion & Forward Cover Calculator
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contract Amount (USD)</label>
                <input
                  type="number"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono p-2.5 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Counterpart Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500"
                >
                  <option value="INR">INR - Indian Rupee (Domestic Sourcing)</option>
                  <option value="AED">AED - UAE Dirham (Jebel Ali Buyers)</option>
                  <option value="SAR">SAR - Saudi Riyal (Dammam Importers)</option>
                  <option value="EUR">EUR - Euro (European Trade)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hedging Tenor (Days)</label>
                <select
                  value={hedgeDays}
                  onChange={(e) => setHedgeDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500"
                >
                  <option value={30}>30 Days (Standard Container Transit)</option>
                  <option value={60}>60 Days (Letter of Credit Usance)</option>
                  <option value={90}>90 Days (Deferred Payment Contract)</option>
                </select>
              </div>
            </div>

            {/* Conversion Result Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5 pt-4 border-t border-slate-800/60 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Spot Landed Value:</span>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedCurrency}
                </div>
                <span className="text-[10px] text-slate-500">At spot rate {selectedRate.rate}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">30-Day Forward Cover Value:</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {forwardConverted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedCurrency}
                </div>
                <span className="text-[10px] text-slate-500">At hedged rate {forwardRate.toFixed(4)}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Hedging Variance / Gain:</span>
                <div className="text-lg font-bold text-blue-400 font-mono mt-1">
                  +{hedgeVariance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedCurrency}
                </div>
                <span className="text-[10px] text-slate-500">Protected against currency devaluation</span>
              </div>
            </div>
          </div>
        </div>
      </PageLeftNav>
    </Shell>
  );
}

