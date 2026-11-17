'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import Link from 'next/link';
import {
  Users,
  Kanban,
  Ship,
  CheckCircle2,
  Plus,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronRight,
  Compass,
  Globe2,
  Anchor,
  Megaphone
} from 'lucide-react';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';

interface Deal {
  deal_id: string;
  title: string;
  company_name: string;
  country: string;
  commodity: string;
  quantity_mt: number;
  stage_id: string;
  stage_name: string;
  incoterm: string;
  notes?: string[];
  updated_at: string;
}

interface Shipment {
  tracking_number: string;
  customer_name: string;
  destination_port: string;
  current_stage_name: string;
  progress_percent: number;
}

export default function DashboardPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [deals, setDeals] = useState<Deal[]>([]);
  const [importersCount, setImportersCount] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dealsRes, impRes, supRes, shipRes] = await Promise.all([
          fetchJson<{ deals: Deal[]; total_deals: number }>('/pipeline/deals'),
          fetchJson<{ total: number }>('/leads/importers?per_page=1'),
          fetchJson<{ total: number }>('/leads/suppliers?per_page=1'),
          fetchJson<{ shipments: Shipment[] }>('/shipments'),
        ]);

        setDeals(dealsRes.deals || []);
        setImportersCount(impRes.total || 0);
        setSuppliersCount(supRes.total || 0);
        setShipments(shipRes.shipments || []);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const inPipelineCount = deals.filter((d) => d.stage_id !== 'closed_won' && d.stage_id !== 'closed_lost').length;
  const inTransitCount = shipments.filter((s) => s.progress_percent < 100).length;

  return (
    <Shell>
      {/* Top Banner with Top-Right Customer Public Portal Link */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        isLight
          ? 'bg-white border-slate-200/80 shadow-sm'
          : 'bg-slate-900/80 border-slate-800 shadow-xl'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${accentClasses.badgeBg}`}>
                Global Trade OS
              </span>
              <span className="text-xs text-slate-400 font-mono">v3.0 EXIM</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Executive Trade & Customer Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Cross-border commodity intelligence, pipeline tracking, verified global buyers & suppliers, and live parcel telemetry.
            </p>
          </div>

          {/* Top Right Public Customer Portal CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              target="_blank"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 shadow-sm transition hover:text-white"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Customer Public Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <Link
              href="/pipeline"
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline & Funnel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Verified Importers */}
        <Link
          href="/leads/importers"
          className={`p-4 rounded-xl border transition group cursor-pointer ${
            isLight ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Global Importers</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {importersCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>UAE, Saudi Arabia, Gulf</span>
            <span className={`text-[10px] font-bold group-hover:underline ${accentClasses.text}`}>View &rarr;</span>
          </div>
        </Link>

        {/* Card 2: Global Suppliers */}
        <Link
          href="/leads/suppliers"
          className={`p-4 rounded-xl border transition group cursor-pointer ${
            isLight ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Verified Suppliers</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {suppliersCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Verified processing units</span>
            <span className={`text-[10px] font-bold group-hover:underline ${accentClasses.text}`}>View &rarr;</span>
          </div>
        </Link>

        {/* Card 3: Active Deals in Pipeline */}
        <Link
          href="/pipeline"
          className={`p-4 rounded-xl border transition group cursor-pointer ${
            isLight ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Deals in Funnel</span>
            <Kanban className="w-4 h-4 text-purple-500" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${accentClasses.text}`}>
            {inPipelineCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>In negotiation & L/C</span>
            <span className={`text-[10px] font-bold group-hover:underline ${accentClasses.text}`}>Kanban &rarr;</span>
          </div>
        </Link>

        {/* Card 4: Parcels in Transit */}
        <Link
          href="/cargo"
          className={`p-4 rounded-xl border transition group cursor-pointer ${
            isLight ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Parcels in Transit</span>
            <Ship className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {inTransitCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Live ocean vessels</span>
            <span className={`text-[10px] font-bold group-hover:underline ${accentClasses.text}`}>Track &rarr;</span>
          </div>
        </Link>
      </div>

      {/* Global Trade Gateways & Logistics Corridor Card */}
      <div className={`p-5 rounded-2xl border transition ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <div>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Globe2 className={`w-4 h-4 ${accentClasses.text}`} />
              International Trade Corridors & Destination Hubs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Key international maritime lanes and trading partner gateways</p>
          </div>
          <Link
            href="/cargo/ports"
            className={`text-xs font-semibold flex items-center gap-1 ${accentClasses.text} hover:underline`}
          >
            <span>Ports Directory</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {[
            { hub: 'Dubai (Jebel Ali)', country: 'UAE', code: 'AEJEA', status: 'High Volume' },
            { hub: 'Dammam (King Abdulaziz)', country: 'Saudi Arabia', code: 'SADMM', status: 'Direct' },
            { hub: 'Hamad Port (Doha)', country: 'Qatar', code: 'QAHMD', status: 'Direct' },
            { hub: 'Sohar Port', country: 'Oman', code: 'OMSOH', status: 'Freezone' },
            { hub: 'Kolkata (Syama Prasad)', country: 'India Origin', code: 'INCCU', status: 'Loading Hub' },
            { hub: 'Haldia Dock', country: 'India Origin', code: 'INHAL', status: 'Deepwater' },
          ].map((corridor, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-center transition ${
                isLight
                  ? 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="font-mono text-[10px] text-emerald-400 font-bold mb-1">
                {corridor.code}
              </div>
              <span className={`text-xs font-bold block truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                {corridor.hub}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {corridor.country}
              </span>
              <span className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                {corridor.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Active Customer Deals & Live Cargo Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Active Customer Deals (Preview - Kanban is on /pipeline) */}
        <div className={`p-5 rounded-2xl border space-y-4 transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Building2 className={`w-4 h-4 ${accentClasses.text}`} />
              Active Customer Negotiations
            </h3>
            <Link href="/pipeline" className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1">
              <span>Full Pipeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {deals.slice(0, 4).map((deal) => (
              <div
                key={deal.deal_id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isLight
                    ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <h4 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {deal.company_name}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {deal.commodity} &bull; {deal.quantity_mt} MT &bull; {deal.incoterm}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${accentClasses.badgeBg}`}>
                    {deal.stage_name}
                  </span>
                  <Link
                    href="/pipeline"
                    className="p-1 rounded-md text-slate-400 hover:text-white transition"
                    title="Open Pipeline"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Live Cargo Progression */}
        <div className={`p-5 rounded-2xl border space-y-4 transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Ship className="w-4 h-4 text-blue-500" />
              Live Parcel & Cargo Tracking
            </h3>
            <Link href="/cargo" className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1">
              <span>Manage Consignments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {shipments.slice(0, 4).map((s) => (
              <div
                key={s.tracking_number}
                className={`p-3.5 rounded-xl border space-y-2 transition ${
                  isLight
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-500 text-[11px]">
                      {s.tracking_number}
                    </span>
                    <span className={`font-semibold truncate max-w-[150px] ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {s.customer_name}
                    </span>
                  </div>
                  <Link
                    href={`/track/${s.tracking_number}`}
                    target="_blank"
                    className="text-[11px] text-slate-400 hover:text-emerald-500 flex items-center gap-1"
                  >
                    <span>Customer Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate">Stage: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{s.current_stage_name}</strong></span>
                  <span className="font-mono font-medium">{s.progress_percent}%</span>
                </div>

                <div className="w-full bg-slate-800/40 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${s.progress_percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
