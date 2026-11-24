'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav from '@/components/PageLeftNav';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
  Ship,
  CheckCircle2,
  Plus,
  Route,
  Anchor,
  Layers,
} from 'lucide-react';
import { MasterStage, Shipment } from '@/components/cargo/cargoTypes';
import AddStageModal from '@/components/cargo/milestones/AddStageModal';
import MilestoneTimeline from '@/components/cargo/milestones/MilestoneTimeline';

export default function CargoMilestonesPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [stages, setStages] = useState<MasterStage[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStageModal, setShowAddStageModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stagesRes, shipmentsRes] = await Promise.all([
        fetchJson<{ stages: MasterStage[] }>('/shipments/stages'),
        fetchJson<{ shipments: Shipment[] }>('/shipments'),
      ]);
      setStages(stagesRes.stages || []);
      const ships = shipmentsRes.shipments || [];
      setShipments(ships);
      if (ships.length > 0 && !selectedShipment) {
        setSelectedShipment(ships[0]);
      } else if (selectedShipment) {
        const updated = ships.find((s) => s.tracking_number === selectedShipment.tracking_number);
        if (updated) setSelectedShipment(updated);
      }
    } catch (e) {
      console.error('Failed to load milestone data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddStageModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateStage = async (stageData: {
    name: string;
    description: string;
    is_terminal: boolean;
  }) => {
    try {
      await fetchJson('/shipments/stages', {
        method: 'POST',
        body: JSON.stringify({
          ...stageData,
          order: stages.length + 1,
        }),
      });
      setShowAddStageModal(false);
      loadData();
    } catch (err: any) {
      alert('Failed to create stage: ' + err.message);
    }
  };

  const advanceShipmentStage = async (trackingNumber: string, stageId: string) => {
    try {
      await fetchJson(`/shipments/${trackingNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stage_id: stageId,
          stage_note: 'Stage progressed from Milestone Tracker',
        }),
      });
      loadData();
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
    }
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Progression Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">{stages.length} Master Milestone Stages</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            Milestone Progression Tracker & Master Stages
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure lifecycle export stages, manage container progression checkpoints, and track consignment execution status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddStageModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Master Stage</span>
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
            href: '/cargo',
            active: false,
            desc: 'In-transit containers',
          },
          {
            id: 'milestones',
            label: 'Milestone Tracker',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            badge: stages.length,
            href: '/cargo/milestones',
            active: true,
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
            href: '/cargo/ports',
            active: false,
            desc: 'UN/LOCODE gateway index',
          },
        ]}
        activeId="milestones"
      >
        <div
          className={`p-4 rounded-2xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Standard EXIM Export Progression Workflow
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Active pipeline progression template</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {stages.map((st, idx) => (
              <div
                key={st.stage_id}
                className={`p-3 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Step {idx + 1}</span>
                    {st.is_terminal && <span className="text-emerald-400 font-bold">Terminal</span>}
                  </div>
                  <div className={`font-bold text-xs mt-1 line-clamp-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {st.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                    {st.description || 'Milestone verification gate'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Active Consignment ({shipments.length})
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {shipments.map((s) => {
                const isSelected = selectedShipment?.tracking_number === s.tracking_number;
                return (
                  <div
                    key={s.tracking_number}
                    onClick={() => setSelectedShipment(s)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? `${accentClasses.badge} border-transparent shadow-md`
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {s.tracking_number}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20 font-mono">
                        {s.progress_percent}%
                      </span>
                    </div>
                    <div className={`font-semibold text-xs mt-1 truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {s.customer_name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                      <span className="truncate max-w-[150px]">{s.destination_port?.split(',')[0]}</span>
                      <span className="text-emerald-400 font-medium">{s.current_stage_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8">
            <MilestoneTimeline
              selectedShipment={selectedShipment}
              onAdvanceStage={advanceShipmentStage}
              isLight={isLight}
            />
          </div>
        </div>
      </PageLeftNav>

      <AddStageModal
        isOpen={showAddStageModal}
        onClose={() => setShowAddStageModal(false)}
        onSave={handleCreateStage}
        isLight={isLight}
      />
    </Shell>
  );
}
