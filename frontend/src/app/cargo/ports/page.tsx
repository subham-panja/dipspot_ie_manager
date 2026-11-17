'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import {
  Ship,
  CheckCircle2,
  Route,
  Anchor,
  Search,
  ExternalLink,
  MapPin,
  Waves,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building
} from 'lucide-react';

interface Port {
  port_code: string;
  name: string;
  country: string;
  type: string;
  vessel_draft_m: number;
  avg_dwell_days: number;
  status: string;
  active_consignments: number;
}

// Approximate coordinate directory for commercial ports for interactive Google Map
const PORT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  INCCU: { lat: 22.5448, lng: 88.3186 }, // Syama Prasad Mookerjee Port, Kolkata
  INHAL: { lat: 22.0621, lng: 88.0658 }, // Haldia Dock Complex
  INKAK: { lat: 16.9891, lng: 82.2858 }, // Kakinada Port
  INNSA: { lat: 18.9499, lng: 72.9515 }, // JNPT Mumbai
  AEJEA: { lat: 25.0113, lng: 55.0612 }, // Jebel Ali, Dubai
  SADMM: { lat: 26.4441, lng: 50.1244 }, // King Abdulaziz Port, Dammam
  QAHMD: { lat: 25.0153, lng: 51.6111 }, // Hamad Port, Doha
  OMSOH: { lat: 24.5022, lng: 56.6272 }, // Port of Sohar, Oman
  KWSWK: { lat: 29.3582, lng: 47.9255 }, // Shuwaikh Port, Kuwait
  BDCGP: { lat: 22.2887, lng: 91.8089 }, // Chittagong Port, Bangladesh
};

export default function CommercialPortsDirectoryPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);

  const loadPorts = async () => {
    try {
      setLoading(true);
      const res = await fetchJson<{ ports: Port[]; total: number }>('/shipments/ports');
      const pts = res.ports || [];
      setPorts(pts);
      if (pts.length > 0 && !selectedPort) {
        setSelectedPort(pts[0]);
      }
    } catch (e) {
      console.error('Failed to load commercial ports directory', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPorts();
  }, []);

  const filteredPorts = ports.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.port_code.toLowerCase().includes(term) ||
      p.country.toLowerCase().includes(term) ||
      p.type.toLowerCase().includes(term)
    );
  });

  const activeCoords = selectedPort ? PORT_COORDINATES[selectedPort.port_code] || { lat: 22.5448, lng: 88.3186 } : null;

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Maritime Infrastructure
            </span>
            <span className="text-xs text-slate-400 font-mono">{ports.length} Commercial Gateway Terminals</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Anchor className="w-6 h-6 text-amber-400" />
            Commercial Ports & Terminal Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global maritime ports, vessel draft limitations, berth handling capabilities, dwell times, and live satellite coordinates.
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
            href: '/cargo/routes',
            active: false,
            desc: 'Container freight matrix',
          },
          {
            id: 'ports',
            label: 'Commercial Ports',
            icon: <Anchor className="w-4 h-4 text-amber-400" />,
            badge: ports.length,
            href: '/cargo/ports',
            active: true,
            desc: 'UN/LOCODE gateway index',
          },
        ]}
        activeId="ports"
      >

      {/* Search Toolbar */}
      <div className={`p-4 rounded-xl border transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
      }`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search port by UN/LOCODE (e.g. INCCU, AEJEA), port name, country, or terminal facility..."
            className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border transition outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Ports Directory and Interactive Map Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Port Cards Table (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Maritime Gateways ({filteredPorts.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Click any port to inspect on Google Maps</span>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredPorts.map((p) => {
              const isSelected = selectedPort?.port_code === p.port_code;
              return (
                <div
                  key={p.port_code}
                  onClick={() => setSelectedPort(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? `${accentClasses.badge} border-transparent shadow-md`
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {p.port_code}
                      </span>
                      <h4 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {p.name}
                      </h4>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.status === 'Operational' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{p.country}</span>
                    <span>&bull;</span>
                    <span>{p.type}</span>
                  </div>

                  {/* Port Specs */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center p-2 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">Vessel Draft</div>
                      <div className="font-bold text-slate-200">{p.vessel_draft_m} meters</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">Avg Dwell Time</div>
                      <div className="font-bold text-blue-400">{p.avg_dwell_days} Days</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-mono text-slate-400">Active Bookings</div>
                      <div className="font-bold text-emerald-400">{p.active_consignments} Shipments</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Google Maps & Port Terminal Intelligence (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedPort && activeCoords && (
            <div className={`p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-amber-400" />
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Port Terminal Location
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {selectedPort.port_code}
                </span>
              </div>

              {/* Interactive Google Maps Frame */}
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 h-64 bg-slate-950 relative">
                <iframe
                  title={`Google Map of ${selectedPort.name}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://maps.google.com/maps?q=${activeCoords.lat},${activeCoords.lng}&t=m&z=12&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full"
                />
              </div>

              {/* Terminal Specs & Details */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Port Name:</span>
                  <span className="font-bold text-slate-200 text-right">{selectedPort.name}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Country & Jurisdiction:</span>
                  <span className="font-semibold text-slate-200">{selectedPort.country}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Max Permissible Draft:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedPort.vessel_draft_m} m</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Terminal Classification:</span>
                  <span className="text-slate-300 font-medium">{selectedPort.type}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {activeCoords.lat.toFixed(4)}° N, {activeCoords.lng.toFixed(4)}° E
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${activeCoords.lat},${activeCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Google Maps</span>
                </a>

                <Link
                  href="/cargo"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  View Active Shipments
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      </PageLeftNav>
    </Shell>
  );
}

