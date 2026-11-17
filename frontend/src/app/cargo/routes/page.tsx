'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import {
  Ship,
  CheckCircle2,
  Route,
  Anchor,
  Clock,
  ArrowRight,
  DollarSign,
  Calculator,
  Compass,
  Check,
  Percent,
  Layers,
  Sparkles
} from 'lucide-react';

interface TradeCorridor {
  id: string;
  origin: string;
  originCode: string;
  destination: string;
  destCode: string;
  country: string;
  transitDays: number;
  rate20ft: number; // USD per 20ft GP
  rate40ft: number; // USD per 40ft HC
  carriers: string[];
  frequency: string;
  bafSurcharge: number; // Bunker adjustment
  status: 'High Demand' | 'Stable' | 'Congested';
}

const CORRIDORS: TradeCorridor[] = [
  {
    id: 'CORR-KOL-DXB',
    origin: 'Syama Prasad Mookerjee Port, Kolkata',
    originCode: 'INCCU',
    destination: 'Jebel Ali Port, Dubai',
    destCode: 'AEJEA',
    country: 'United Arab Emirates',
    transitDays: 14,
    rate20ft: 1150,
    rate40ft: 1850,
    carriers: ['MSC', 'Maersk', 'CMA CGM', 'Hapag-Lloyd'],
    frequency: '2 Sailings / Week',
    bafSurcharge: 120,
    status: 'High Demand',
  },
  {
    id: 'CORR-HAL-DMM',
    origin: 'Haldia Dock Complex',
    originCode: 'INHAL',
    destination: 'King Abdulaziz Port, Dammam',
    destCode: 'SADMM',
    country: 'Saudi Arabia',
    transitDays: 16,
    rate20ft: 1280,
    rate40ft: 2050,
    carriers: ['MSC', 'Maersk', 'ONE Line'],
    frequency: 'Weekly',
    bafSurcharge: 140,
    status: 'Stable',
  },
  {
    id: 'CORR-HAL-CGP',
    origin: 'Haldia Dock Complex',
    originCode: 'INHAL',
    destination: 'Chittagong Port',
    destCode: 'BDCGP',
    country: 'Bangladesh',
    transitDays: 4,
    rate20ft: 480,
    rate40ft: 750,
    carriers: ['Feedertech', 'X-Press Feeders', 'Samudera'],
    frequency: 'Every 3 Days',
    bafSurcharge: 60,
    status: 'Congested',
  },
  {
    id: 'CORR-KOL-SOH',
    origin: 'Syama Prasad Mookerjee Port, Kolkata',
    originCode: 'INCCU',
    destination: 'Port of Sohar',
    destCode: 'OMSOH',
    country: 'Oman',
    transitDays: 15,
    rate20ft: 1220,
    rate40ft: 1950,
    carriers: ['CMA CGM', 'MSC', 'Hapag-Lloyd'],
    frequency: 'Weekly',
    bafSurcharge: 130,
    status: 'Stable',
  },
  {
    id: 'CORR-NSA-HMD',
    origin: 'JNPT Nhava Sheva, Mumbai',
    originCode: 'INNSA',
    destination: 'Hamad Port, Doha',
    destCode: 'QAHMD',
    country: 'Qatar',
    transitDays: 9,
    rate20ft: 980,
    rate40ft: 1620,
    carriers: ['Maersk', 'MSC', 'COSCO'],
    frequency: 'Bi-Weekly',
    bafSurcharge: 110,
    status: 'High Demand',
  },
  {
    id: 'CORR-NSA-SWK',
    origin: 'JNPT Nhava Sheva, Mumbai',
    originCode: 'INNSA',
    destination: 'Shuwaikh Port',
    destCode: 'KWSWK',
    country: 'Kuwait',
    transitDays: 11,
    rate20ft: 1100,
    rate40ft: 1780,
    carriers: ['Hapag-Lloyd', 'MSC'],
    frequency: 'Weekly',
    bafSurcharge: 125,
    status: 'Stable',
  },
];

export default function CargoRoutesPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  // Calculator State
  const [selectedCorridorId, setSelectedCorridorId] = useState(CORRIDORS[0].id);
  const [containerType, setContainerType] = useState<'20ft' | '40ft'>('20ft');
  const [containerQty, setContainerQty] = useState(5);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeThc, setIncludeThc] = useState(true);

  const activeCorridor = CORRIDORS.find((c) => c.id === selectedCorridorId) || CORRIDORS[0];

  // Calculation Breakdown
  const baseRatePerTeu = containerType === '20ft' ? activeCorridor.rate20ft : activeCorridor.rate40ft;
  const oceanFreightTotal = baseRatePerTeu * containerQty;
  const bafTotal = activeCorridor.bafSurcharge * containerQty;
  const thcTotal = includeThc ? (containerType === '20ft' ? 140 : 210) * containerQty : 0;
  const insuranceTotal = includeInsurance ? Math.round(oceanFreightTotal * 0.015) : 0;
  const grandTotal = oceanFreightTotal + bafTotal + thcTotal + insuranceTotal;
  const cargoWeightEstMt = containerType === '20ft' ? containerQty * 25 : containerQty * 27;

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Freight Matrix & Ocean Lanes
            </span>
            <span className="text-xs text-slate-400 font-mono">{CORRIDORS.length} Monitored Commercial Lanes</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Route className="w-6 h-6 text-blue-400" />
            Ocean Shipping Corridors & Freight Rates
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time container shipping rates, transit times, bunker surcharges, and interactive freight estimation engine.
          </p>
        </div>
      </div>

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Logistics Scope"
        subtitle="Freight & Port Index"
        items={[
          {
            id: 'shipments',
            label: 'Active Shipments',
            icon: <Ship className="w-4 h-4 text-cyan-400" />,
            href: '/cargo',
            active: false,
            desc: 'In-transit containers',
          },
          {
            id: 'milestones',
            label: 'Milestone Tracker',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            href: '/cargo/milestones',
            active: false,
            desc: 'Checkpoints & stages',
          },
          {
            id: 'routes',
            label: 'Ocean Routes & Rates',
            icon: <Route className="w-4 h-4 text-blue-400" />,
            badge: CORRIDORS.length,
            href: '/cargo/routes',
            active: true,
            desc: 'Container freight matrix',
          },
          {
            id: 'ports',
            label: 'Commercial Ports',
            icon: <Anchor className="w-4 h-4 text-amber-400" />,
            href: '/cargo/ports',
            active: false,
            desc: 'UN/LOCODE gateway index',
          },
        ]}
        activeId="routes"
      >

      {/* Corridor Table and Interactive Rate Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Corridor Rate Directory (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Commercial Corridors & Spot Container Rates</span>
            <span className="text-[10px] text-slate-500 font-normal">Click corridor to load into calculator</span>
          </div>

          <div className="space-y-3">
            {CORRIDORS.map((corr) => {
              const isSelected = corr.id === selectedCorridorId;
              return (
                <div
                  key={corr.id}
                  onClick={() => setSelectedCorridorId(corr.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? `${accentClasses.badge} border-transparent shadow-lg`
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-cyan-400">{corr.originCode}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold font-mono text-emerald-400">{corr.destCode}</span>
                      <span className="text-[10px] text-slate-400">({corr.country})</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      corr.status === 'High Demand'
                        ? 'bg-amber-500/20 text-amber-400'
                        : corr.status === 'Congested'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {corr.status}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-200">
                    {corr.origin.split(',')[0]} &rarr; {corr.destination.split(',')[0]}
                  </div>

                  {/* Rate Specs */}
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">20ft GP Rate</div>
                      <div className="text-xs font-bold text-blue-400">${corr.rate20ft}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">40ft HC Rate</div>
                      <div className="text-xs font-bold text-purple-400">${corr.rate40ft}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">Transit Days</div>
                      <div className="text-xs font-bold text-emerald-400">{corr.transitDays} Days</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">Frequency</div>
                      <div className="text-[10px] font-bold text-slate-300 truncate">{corr.frequency}</div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <div>Carriers: <span className="text-slate-300">{corr.carriers.join(', ')}</span></div>
                    <div>BAF Surcharge: <span className="font-mono text-slate-300">${corr.bafSurcharge}/TEU</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Freight Quote Estimator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-2xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Instant Ocean Freight Estimator
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Pricing
              </span>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Selected Shipping Lane</label>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 font-semibold text-xs">
                  {activeCorridor.origin.split(',')[0]} ({activeCorridor.originCode}) &rarr;{' '}
                  {activeCorridor.destination.split(',')[0]} ({activeCorridor.destCode})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Container Type</label>
                  <select
                    value={containerType}
                    onChange={(e) => setContainerType(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="20ft">20ft Standard GP (25 MT)</option>
                    <option value="40ft">40ft High Cube HC (27 MT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Container Count (TEUs)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={containerQty}
                    onChange={(e) => setContainerQty(Math.max(1, Number(e.target.value)))}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* Checkboxes for Surcharges */}
              <div className="space-y-2 pt-1 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeThc}
                    onChange={(e) => setIncludeThc(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span>Include Terminal Handling Charges (THC)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInsurance}
                    onChange={(e) => setIncludeInsurance(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span>Include Marine Cargo Insurance (All Risks ICC-A)</span>
                </label>
              </div>

              {/* Price Breakdown Card */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Base Ocean Freight ({containerQty} &times; ${baseRatePerTeu}):</span>
                  <span className="text-slate-200 font-mono">${oceanFreightTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Bunker Adjustment Factor (BAF):</span>
                  <span className="text-slate-200 font-mono">${bafTotal.toLocaleString()}</span>
                </div>
                {includeThc && (
                  <div className="flex justify-between text-slate-400">
                    <span>Terminal Handling Charges (THC):</span>
                    <span className="text-slate-200 font-mono">${thcTotal.toLocaleString()}</span>
                  </div>
                )}
                {includeInsurance && (
                  <div className="flex justify-between text-slate-400">
                    <span>Marine Insurance Premium:</span>
                    <span className="text-slate-200 font-mono">${insuranceTotal.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Estimated Landed Freight:</span>
                  <span className="text-emerald-400 font-mono text-base">${grandTotal.toLocaleString()} USD</span>
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  Approx. ${Math.round(grandTotal / cargoWeightEstMt)} / MT for ~{cargoWeightEstMt} Metric Tons
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/cargo"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-center block transition shadow-lg shadow-blue-600/20"
                >
                  Book Consignment on This Lane
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      </PageLeftNav>
    </Shell>
  );
}

