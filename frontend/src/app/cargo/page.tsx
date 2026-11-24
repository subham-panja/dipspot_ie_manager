'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  Ship,
  Plus,
  Search,
  CheckCircle2,
  Anchor,
  Route,
} from 'lucide-react';
import { Shipment, CreateShipmentFormData } from '@/components/cargo/cargoTypes';
import { useCargoData } from '@/components/cargo/useCargoData';
import ShipmentTable from '@/components/cargo/ShipmentTable';
import CreateShipmentModal from '@/components/cargo/CreateShipmentModal';
import UpdateStageModal from '@/components/cargo/UpdateStageModal';

export default function CargoActiveShipmentsPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShipmentForUpdate, setSelectedShipmentForUpdate] = useState<Shipment | null>(null);

  const {
    shipments,
    stages,
    loading,
    searchTerm,
    setSearchTerm,
    filteredShipments,
    activeInTransit,
    deliveredCount,
    copiedTrack,
    handleCopyLink,
    isSubmitting,
    handleCreateShipment,
    handleUpdateStage,
    handleDelete,
  } = useCargoData();

  const onCreateShipment = async (formData: CreateShipmentFormData) => {
    await handleCreateShipment(formData);
    setShowCreateModal(false);
  };

  const onUpdateStage = async (data: { stage_id: string; stage_note: string; location: string }) => {
    if (!selectedShipmentForUpdate) return;
    await handleUpdateStage(selectedShipmentForUpdate.tracking_number, data);
    setSelectedShipmentForUpdate(null);
  };

  return (
    <Shell>
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
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

        <ShipmentTable
          shipments={filteredShipments}
          loading={loading}
          copiedTrack={copiedTrack}
          onCopyLink={handleCopyLink}
          onSelectForUpdate={setSelectedShipmentForUpdate}
          onDelete={handleDelete}
          isLight={isLight}
        />
      </PageLeftNav>

      <CreateShipmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onCreateShipment}
        isSubmitting={isSubmitting}
        isLight={isLight}
      />

      <UpdateStageModal
        selectedShipment={selectedShipmentForUpdate}
        stages={stages}
        onClose={() => setSelectedShipmentForUpdate(null)}
        onUpdate={onUpdateStage}
        isLight={isLight}
      />
    </Shell>
  );
}
