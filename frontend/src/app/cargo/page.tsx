'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { fetchJson, API_BASE } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import {
  Ship,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Anchor,
  Box,
  MapPin,
  Calendar,
  AlertCircle,
  X,
  Edit,
  Trash2,
  ArrowRight,
  Route,
  Navigation,
  Globe2
} from 'lucide-react';

interface Milestone {
  stage_id: string;
  name: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending';
  location?: string;
  actual_date?: string;
  planned_date?: string;
  notes?: string;
}

interface Shipment {
  tracking_number: string;
  deal_id?: string;
  customer_name: string;
  destination_country: string;
  cargo_description: string;
  container_numbers: string[];
  bl_number: string;
  vessel_name: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  etd: string;
  eta: string;
  current_stage_id: string;
  current_stage_name: string;
  progress_percent: number;
  is_delivered: boolean;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

interface MasterStage {
  stage_id: string;
  name: string;
  order: number;
  description?: string;
  is_terminal?: boolean;
}

export default function CargoActiveShipmentsPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stages, setStages] = useState<MasterStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTrack, setCopiedTrack] = useState<string | null>(null);

  // New Shipment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    destination_country: 'United Arab Emirates',
    cargo_description: 'Non-Basmati Parboiled Rice (IR-64) in 50kg PP Bags',
    container_numbers: 'MSCU7829104, MSCU8102941',
    bl_number: 'BL-2026-CCU-9182',
    vessel_name: 'MSC ALTAIR V.024W',
    carrier: 'MSC Mediterranean Shipping',
    origin_port: 'Syama Prasad Mookerjee Port, Kolkata (INCCU)',
    destination_port: 'Jebel Ali Port, Dubai (AEJEA)',
    etd: '2026-11-20',
    eta: '2026-12-04',
  });

  // Stage Update Modal
  const [selectedShipmentForUpdate, setSelectedShipmentForUpdate] = useState<Shipment | null>(null);
  const [updateStageId, setUpdateStageId] = useState('');
  const [updateStageNote, setUpdateStageNote] = useState('');
  const [updateLocation, setUpdateLocation] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, stagesRes] = await Promise.all([
        fetchJson<{ shipments: Shipment[] }>('/shipments'),
        fetchJson<{ stages: MasterStage[] }>('/shipments/stages'),
      ]);
      setShipments(shipmentsRes.shipments || []);
      setStages(stagesRes.stages || []);
    } catch (e) {
      console.error('Failed to load cargo shipments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setSelectedShipmentForUpdate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyLink = (trackingNumber: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/track?ref=${trackingNumber}`;
    navigator.clipboard.writeText(link);
    setCopiedTrack(trackingNumber);
    setTimeout(() => setCopiedTrack(null), 2500);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const containerList = form.container_numbers
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await fetchJson('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          container_numbers: containerList,
        }),
      });

      setShowCreateModal(false);
      setForm({
        customer_name: '',
        destination_country: 'United Arab Emirates',
        cargo_description: 'Non-Basmati Parboiled Rice (IR-64) in 50kg PP Bags',
        container_numbers: '',
        bl_number: '',
        vessel_name: '',
        carrier: 'MSC Mediterranean Shipping',
        origin_port: 'Syama Prasad Mookerjee Port, Kolkata (INCCU)',
        destination_port: 'Jebel Ali Port, Dubai (AEJEA)',
        etd: '',
        eta: '',
      });
      loadData();
    } catch (err: any) {
      alert('Error booking consignment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentForUpdate) return;
    try {
      await fetchJson(`/shipments/${selectedShipmentForUpdate.tracking_number}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stage_id: updateStageId,
          stage_note: updateStageNote,
          location: updateLocation,
        }),
      });
      setSelectedShipmentForUpdate(null);
      loadData();
    } catch (err: any) {
      alert('Failed to update consignment milestone: ' + err.message);
    }
  };

  const handleDelete = async (trackingNumber: string) => {
    if (!confirm(`Delete consignment ${trackingNumber}?`)) return;
    try {
      await fetchJson(`/shipments/${trackingNumber}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert('Failed to delete consignment: ' + err.message);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.tracking_number.toLowerCase().includes(term) ||
      s.customer_name.toLowerCase().includes(term) ||
      s.cargo_description.toLowerCase().includes(term) ||
      (s.container_numbers && s.container_numbers.some((c) => c.toLowerCase().includes(term))) ||
      s.destination_port.toLowerCase().includes(term) ||
      s.vessel_name.toLowerCase().includes(term)
    );
  });

  const activeInTransit = shipments.filter((s) => !s.is_delivered).length;
  const deliveredCount = shipments.filter((s) => s.is_delivered).length;

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Ocean Freight & Logistics
            </span>
            <span className="text-xs text-slate-400 font-mono">{shipments.length} Total Bookings</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Ship className="w-6 h-6 text-cyan-400" />
            Cargo, Parcel & Ocean Freight Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track multi-container consignments, manage progression stages, generate customer tracking links, and monitor trade corridors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Consignment</span>
          </button>
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
            badge: shipments.length,
            href: '/cargo',
            active: true,
            desc: 'In-transit & booked containers',
          },
          {
            id: 'milestones',
            label: 'Milestone Tracker',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            href: '/cargo/milestones',
            active: false,
            desc: 'Consignment checkpoints',
          },
          {
            id: 'routes',
            label: 'Ocean Routes & Rates',
            icon: <Route className="w-4 h-4 text-blue-400" />,
            href: '/cargo/routes',
            active: false,
            desc: '20ft/40ft freight calculator',
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
        activeId="shipments"
      >

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-xl border transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="text-slate-400 text-xs font-medium">Active In-Transit</div>
          <div className="text-2xl font-bold mt-1 text-cyan-400">{activeInTransit}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vessels currently on ocean voyage</div>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="text-slate-400 text-xs font-medium">Delivered at Destination</div>
          <div className="text-2xl font-bold mt-1 text-emerald-400">{deliveredCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Successful customs clearance</div>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="text-slate-400 text-xs font-medium">Total TEU Containers</div>
          <div className="text-2xl font-bold mt-1 text-purple-400">
            {shipments.reduce((sum, s) => sum + (s.container_numbers?.length || 1), 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active standard 20ft & 40ft units</div>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="text-slate-400 text-xs font-medium">Avg Corridor Transit</div>
          <div className="text-2xl font-bold mt-1 text-blue-400">14.2 Days</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kolkata/Haldia to Gulf Ports</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className={`p-4 rounded-xl border transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
      }`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Tracking #, Container #, Vessel, Buyer Name, or Destination Port..."
            className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border transition outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500'
            }`}
          />
        </div>
      </div>

      {/* Shipments Consignment Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Registered Ocean Consignments
            </h3>
            <span className="text-xs text-slate-400 font-mono">({filteredShipments.length} consignments)</span>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Customer public link allows buyers to track container progress in real time
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400">Loading cargo consignments...</div>
        ) : filteredShipments.length === 0 ? (
          <div className="p-16 text-center">
            <Ship className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No active consignments found</p>
            <p className="text-xs text-slate-400 mt-1">Book your first ocean cargo container shipment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${
                isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950/60 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3 px-4">Tracking & Customer</th>
                  <th className="py-3 px-4">Commodity & Containers</th>
                  <th className="py-3 px-4">Corridor (Origin &rarr; Dest)</th>
                  <th className="py-3 px-4">Vessel & Carrier</th>
                  <th className="py-3 px-4">Current Progression</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/20">
                {filteredShipments.map((s) => (
                  <tr
                    key={s.tracking_number}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Tracking & Customer */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-cyan-400 text-xs">
                          {s.tracking_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(s.tracking_number)}
                          title="Copy public tracking link for customer"
                          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800/60 transition"
                        >
                          {copiedTrack === s.tracking_number ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {s.customer_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.destination_country}
                      </div>
                    </td>

                    {/* Commodity & Containers */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-200 truncate text-[11px]">
                        {s.cargo_description}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {s.container_numbers?.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-300 border border-slate-700/50"
                          >
                            {c}
                          </span>
                        ))}
                        {s.container_numbers?.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{s.container_numbers.length - 2} more
                          </span>
                        )}
                      </div>
                      {s.bl_number && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">B/L: {s.bl_number}</div>
                      )}
                    </td>

                    {/* Corridor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                        <span>{s.origin_port?.split(',')[0] || 'Kolkata'}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="text-cyan-300">{s.destination_port?.split(',')[0] || 'Jebel Ali'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ETD: {s.etd || '—'} &bull; ETA: {s.eta || '—'}
                      </div>
                    </td>

                    {/* Vessel */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200 text-xs">
                        {s.vessel_name || 'Vessel Pending'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {s.carrier || 'Ocean Carrier'}
                      </div>
                    </td>

                    {/* Progression Bar */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={`font-semibold ${s.is_delivered ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {s.current_stage_name}
                        </span>
                        <span className="text-slate-400 font-mono font-medium">{s.progress_percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            s.is_delivered ? 'bg-emerald-400' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${s.progress_percent}%` }}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShipmentForUpdate(s);
                            setUpdateStageId(s.current_stage_id);
                            setUpdateStageNote('');
                            setUpdateLocation(s.destination_port || '');
                          }}
                          className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Advance Stage</span>
                        </button>

                        <Link
                          href={`/track?ref=${s.tracking_number}`}
                          target="_blank"
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                          title="Open Customer Public View"
                        >
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                          <span>Portal</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(s.tracking_number)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </PageLeftNav>

      {/* BOOK NEW SHIPMENT MODAL */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl transition max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-cyan-400" />
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Book New Ocean Consignment
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Customer / Importer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Dhiyafa Foodstuff Trading LLC"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Destination Country</label>
                  <input
                    type="text"
                    value={form.destination_country}
                    onChange={(e) => setForm({ ...form, destination_country: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Cargo Description & Spec</label>
                <input
                  type="text"
                  value={form.cargo_description}
                  onChange={(e) => setForm({ ...form, cargo_description: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Container Numbers (comma separated)</label>
                  <input
                    type="text"
                    placeholder="MSCU7829104, MSCU8102941"
                    value={form.container_numbers}
                    onChange={(e) => setForm({ ...form, container_numbers: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Bill of Lading (B/L Number)</label>
                  <input
                    type="text"
                    placeholder="BL-2026-CCU-9182"
                    value={form.bl_number}
                    onChange={(e) => setForm({ ...form, bl_number: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Port of Loading (Origin)</label>
                  <input
                    type="text"
                    value={form.origin_port}
                    onChange={(e) => setForm({ ...form, origin_port: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Discharge Port (Destination) *</label>
                  <input
                    type="text"
                    required
                    value={form.destination_port}
                    onChange={(e) => setForm({ ...form, destination_port: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Vessel & Voyage</label>
                  <input
                    type="text"
                    placeholder="MSC ALTAIR V.024W"
                    value={form.vessel_name}
                    onChange={(e) => setForm({ ...form, vessel_name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Shipping Carrier</label>
                  <input
                    type="text"
                    value={form.carrier}
                    onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ETD (Estimated Departure)</label>
                  <input
                    type="date"
                    value={form.etd}
                    onChange={(e) => setForm({ ...form, etd: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ETA (Estimated Arrival)</label>
                  <input
                    type="date"
                    value={form.eta}
                    onChange={(e) => setForm({ ...form, eta: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20"
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Ocean Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVANCE STAGE MODAL */}
      {selectedShipmentForUpdate && (
        <div
          onClick={() => setSelectedShipmentForUpdate(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Advance Stage: {selectedShipmentForUpdate.tracking_number}
              </h3>
              <button onClick={() => setSelectedShipmentForUpdate(null)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStage} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Master Progression Stage</label>
                <select
                  value={updateStageId}
                  onChange={(e) => setUpdateStageId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                >
                  {stages.map((st) => (
                    <option key={st.stage_id} value={st.stage_id}>
                      {st.order}. {st.name} {st.is_terminal ? '(Final Destination)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Current Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. In Transit - Arabian Sea / Jebel Ali Port Berth 4"
                  value={updateLocation}
                  onChange={(e) => setUpdateLocation(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Progression Note / Activity Log</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Customs clearance documents stamped, containers loaded onto feeder vessel."
                  value={updateStageNote}
                  onChange={(e) => setUpdateStageNote(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedShipmentForUpdate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20"
                >
                  Update Consignment Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

