'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Megaphone,
  Ship,
  Settings,
  Globe2,
  ChevronDown,
  ChevronRight,
  Radar,
  Compass,
  FileText,
  DollarSign,
  ShieldCheck,
  Building2,
  CheckSquare,
  SearchCode,
  FileCheck2,
  Layers
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  // Sub-menu expansion states
  const [leadsOpen, setLeadsOpen] = useState(pathname.startsWith('/leads'));
  const [campaignOpen, setCampaignOpen] = useState(pathname.startsWith('/campaigns'));
  const [cargoOpen, setCargoOpen] = useState(pathname.startsWith('/cargo') || pathname.startsWith('/shipments'));
  const [intelOpen, setIntelOpen] = useState(pathname.startsWith('/intelligence'));
  const [opsOpen, setOpsOpen] = useState(pathname.startsWith('/operations'));

  return (
    <aside
      className={`w-64 h-screen flex flex-col border-r transition-colors duration-200 flex-shrink-0 z-30 select-none ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
          : 'bg-[#0f172a] border-slate-800/80 text-slate-200 shadow-xl'
      }`}
    >
      {/* Brand Header (shrink-0) */}
      <div className={`shrink-0 p-4 border-b flex items-center space-x-3 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${accentClasses.gradient} flex items-center justify-center text-white shadow-md shadow-emerald-500/20`}>
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className={`text-sm font-bold tracking-tight flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            TradePulse <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${accentClasses.badgeBg}`}>EXIM</span>
          </h1>
          <p className="text-[11px] text-slate-400">Global Trade Operating System</p>
        </div>
      </div>

      {/* Navigation Links (flex-1 scrollable) */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto min-h-0 text-xs">
        {/* 1. Dashboard */}
        <Link
          href="/"
          className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
            pathname === '/'
              ? isLight
                ? `bg-slate-100 ${accentClasses.text} font-bold shadow-sm`
                : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
              : isLight
              ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === '/' ? accentClasses.text : 'text-slate-400'}`} />
          <span>Dashboard</span>
        </Link>

        {/* 2. Pipeline */}
        <Link
          href="/pipeline"
          className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
            pathname === '/pipeline'
              ? isLight
                ? `bg-slate-100 ${accentClasses.text} font-bold shadow-sm`
                : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
              : isLight
              ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <Kanban className={`w-4 h-4 shrink-0 ${pathname === '/pipeline' ? accentClasses.text : 'text-slate-400'}`} />
          <span>Pipeline</span>
        </Link>

        {/* 3. Leads (Expandable) */}
        <div>
          <div
            onClick={() => setLeadsOpen(!leadsOpen)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              pathname.startsWith('/leads')
                ? isLight
                  ? `bg-slate-100 ${accentClasses.text} font-bold`
                  : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
                : isLight
                ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Users className={`w-4 h-4 shrink-0 ${pathname.startsWith('/leads') ? accentClasses.text : 'text-slate-400'}`} />
              <span>Leads Directory</span>
            </div>
            {leadsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {leadsOpen && (
            <div className="pl-6 pt-1 space-y-0.5">
              <Link
                href="/leads/importers"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/leads/importers' || pathname === '/leads'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Importers & Buyers
              </Link>
              <Link
                href="/leads/suppliers"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/leads/suppliers'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Verified Suppliers
              </Link>
            </div>
          )}
        </div>

        {/* 4. Lead Gen & Crawler (Dedicated tab requested by user) */}
        <Link
          href="/crawler"
          className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
            pathname.startsWith('/crawler')
              ? isLight
                ? `bg-slate-100 ${accentClasses.text} font-bold shadow-sm`
                : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
              : isLight
              ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <Compass className={`w-4 h-4 shrink-0 ${pathname.startsWith('/crawler') ? accentClasses.text : 'text-slate-400'}`} />
          <span>Crawler & Lead Gen</span>
        </Link>

        {/* 5. Campaign (Expandable sub-menu requested by user) */}
        <div>
          <div
            onClick={() => setCampaignOpen(!campaignOpen)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              pathname.startsWith('/campaigns')
                ? isLight
                  ? `bg-slate-100 ${accentClasses.text} font-bold`
                  : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
                : isLight
                ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Megaphone className={`w-4 h-4 shrink-0 ${pathname.startsWith('/campaigns') ? accentClasses.text : 'text-slate-400'}`} />
              <span>Campaigns</span>
            </div>
            {campaignOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {campaignOpen && (
            <div className="pl-6 pt-1 space-y-0.5">
              <Link
                href="/campaigns"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/campaigns'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Active Sequences
              </Link>
              <Link
                href="/campaigns/segments"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/campaigns/segments'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Audience Segments
              </Link>
              <Link
                href="/campaigns/wizard"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/campaigns/wizard'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Campaign Builder
              </Link>
              <Link
                href="/campaigns/templates"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/campaigns/templates'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Message Templates
              </Link>
            </div>
          )}
        </div>

        {/* 6. Cargo & Parcel (Expandable) */}
        <div>
          <div
            onClick={() => setCargoOpen(!cargoOpen)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              pathname.startsWith('/cargo') || pathname.startsWith('/shipments')
                ? isLight
                  ? `bg-slate-100 ${accentClasses.text} font-bold`
                  : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
                : isLight
                ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Ship className={`w-4 h-4 shrink-0 ${pathname.startsWith('/cargo') || pathname.startsWith('/shipments') ? accentClasses.text : 'text-slate-400'}`} />
              <span>Cargo & Parcel</span>
            </div>
            {cargoOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {cargoOpen && (
            <div className="pl-6 pt-1 space-y-0.5">
              <Link
                href="/cargo"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/cargo' || pathname === '/shipments'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Active Shipments
              </Link>
              <Link
                href="/cargo/milestones"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/cargo/milestones'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Milestone Tracker
              </Link>
              <Link
                href="/cargo/routes"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/cargo/routes'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Ocean Routes & Rates
              </Link>
              <Link
                href="/cargo/ports"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/cargo/ports'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Commercial Ports
              </Link>
            </div>
          )}
        </div>

        {/* 7. Market Intelligence (Expandable) */}
        <div>
          <div
            onClick={() => setIntelOpen(!intelOpen)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              pathname.startsWith('/intelligence')
                ? isLight
                  ? `bg-slate-100 ${accentClasses.text} font-bold`
                  : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
                : isLight
                ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Radar className={`w-4 h-4 shrink-0 ${pathname.startsWith('/intelligence') ? accentClasses.text : 'text-slate-400'}`} />
              <span>Intelligence</span>
            </div>
            {intelOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {intelOpen && (
            <div className="pl-6 pt-1 space-y-0.5">
              <Link
                href="/intelligence?tab=competitors"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition text-slate-400 hover:text-slate-200`}
              >
                &bull; Competitor Profiles
              </Link>
              <Link
                href="/intelligence?tab=quotes"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition text-slate-400 hover:text-slate-200`}
              >
                &bull; Spot Pricing Matrix
              </Link>
              <Link
                href="/intelligence?tab=freight"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition text-slate-400 hover:text-slate-200`}
              >
                &bull; Ocean Freight Index
              </Link>
              <Link
                href="/intelligence?tab=tariffs"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition text-slate-400 hover:text-slate-200`}
              >
                &bull; Customs & Tariffs
              </Link>
            </div>
          )}
        </div>

        {/* 8. Trade Operations (Researched high-value EXIM feature) */}
        <div>
          <div
            onClick={() => setOpsOpen(!opsOpen)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              pathname.startsWith('/operations')
                ? isLight
                  ? `bg-slate-100 ${accentClasses.text} font-bold`
                  : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
                : isLight
                ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <FileCheck2 className={`w-4 h-4 shrink-0 ${pathname.startsWith('/operations') ? accentClasses.text : 'text-slate-400'}`} />
              <span>Trade Operations</span>
            </div>
            {opsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {opsOpen && (
            <div className="pl-6 pt-1 space-y-0.5">
              <Link
                href="/operations/documents"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/operations/documents'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Export Documents (PI/CI)
              </Link>
              <Link
                href="/operations/fx"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/operations/fx'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; FX Rates & Calculator
              </Link>
              <Link
                href="/operations/lc"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/operations/lc'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Letter of Credit (L/C)
              </Link>
              <Link
                href="/operations/compliance"
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  pathname === '/operations/compliance'
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; Sanctions Screener
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Footer Section: Permanently Pinned Settings & Version (shrink-0 mt-auto) */}
      <div className={`shrink-0 mt-auto p-3.5 border-t space-y-2 ${isLight ? 'border-slate-100 bg-slate-50/70' : 'border-slate-800/90 bg-[#090d16]/95'}`}>
        {/* Settings & Preferences Link to dedicated Settings Page */}
        <Link
          href="/settings"
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition cursor-pointer font-medium ${
            pathname === '/settings'
              ? isLight
                ? `bg-slate-200 text-slate-900 font-bold shadow-sm border ${accentClasses.border}`
                : `bg-slate-800 text-white font-bold border ${accentClasses.border}`
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
          }`}
          title="Open Global Settings & Configuration Page"
        >
          <div className="flex items-center space-x-2.5">
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs">Settings & Config</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Connected" />
        </Link>

        {/* System Version Indicator */}
        <div className="px-2 pt-1 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>EXIM Engine</span>
          </span>
          <span>v3.3 Global</span>
        </div>
      </div>
    </aside>
  );
}
