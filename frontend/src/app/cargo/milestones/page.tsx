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
  Clock,
  Circle,
  Plus,
  Route,
  Anchor,
  Edit,
  Save,
  Check,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronRight,
  Layers,
  ArrowRight
} from 'lucide-react';

interface MasterStage {
  stage_id: string;
  name: string;
  order: number;
  description?: string;
  is_terminal?: boolean;
}

interface Shipment {
  tracking_number: string;
  customer_name: string;
  cargo_description: string;
  destination_port: string;
  current_stage_id: string;
  current_stage_name: string;
  progress_percent: number;
  is_delivered: boolean;
  milestones: {
    stage_id: string;
    name: string;
    description?: string;
    status: 'completed' | 'in_progress' | 'pending';
    location?: string;
    actual_date?: string;
    planned_date?: string;
    notes?: string;
  }[];
}

export default function CargoMilestonesPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [stages, setStages] = useState<MasterStage[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  // New Master Stage Modal
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [isTerminal, setIsTerminal] = useState(false);

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

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    try {
      await fetchJson('/shipments/stages', {
        method: 'POST',
        body: JSON.stringify({
          name: newStageName.trim(),
          description: newStageDesc.trim(),
          is_terminal: isTerminal,
          order: stages.length + 1,
        }),
      });
      setShowAddStageModal(false);
      setNewStageName('');
      setNewStageDesc('');
      setIsTerminal(false);
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
          stage_note: `Stage progressed from Milestone Tracker`,
        }),
      });
      loadData();
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
    }
  };

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
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

      {/* Master Milestone Stage Flow Bar */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
      }`}>
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

      {/* Live Interactive Consignment Milestone Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Consignment Selection List (4 cols) */}
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

        {/* Milestone Stepper Timeline (8 cols) */}
        <div className="lg:col-span-8">
          {selectedShipment ? (
            <div className={`p-6 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/40 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {selectedShipment.tracking_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedShipment.is_delivered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {selectedShipment.current_stage_name}
                    </span>
                  </div>
                  <h2 className={`text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {selectedShipment.customer_name} &bull; {selectedShipment.cargo_description}
                  </h2>
                </div>

                <Link
                  href={`/track?ref=${selectedShipment.tracking_number}`}
                  target="_blank"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Public Buyer Tracker</span>
                </Link>
              </div>

              {/* Visual Vertical Stepper Timeline */}
              <div className="mt-6 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                {selectedShipment.milestones && selectedShipment.milestones.map((m, idx) => {
                  const isDone = m.status === 'completed';
                  const isInProgress = m.status === 'in_progress';
                  const isCurrent = selectedShipment.current_stage_id === m.stage_id;

                  return (
                    <div key={m.stage_id} className="relative group">
                      {/* Step Indicator Dot */}
                      <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center transition ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                          : isInProgress
                          ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20 animate-pulse'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {isDone ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : isInProgress ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <Circle className="w-2 h-2" />
                        )}
                      </div>

                      {/* Milestone Details Card */}
                      <div className={`p-4 rounded-xl border transition ${
                        isCurrent
                          ? isLight
                            ? 'bg-cyan-50/50 border-cyan-300 shadow-sm'
                            : 'bg-cyan-950/20 border-cyan-800/60'
                          : isLight
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950/40 border-slate-800/60'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-400">Stage {idx + 1}</span>
                              <h4 className={`text-xs font-bold ${
                                isDone ? 'text-emerald-400' : isInProgress ? 'text-cyan-400' : 'text-slate-300'
                              }`}>
                                {m.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {m.description || 'Verified progression gate for customs and logistics.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isDone && (
                              <button
                                type="button"
                                onClick={() => advanceShipmentStage(selectedShipment.tracking_number, m.stage_id)}
                                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1"
                              >
                                <span>Advance to Here</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Location / Date Tag */}
                        <div className="mt-3 pt-2 border-t border-slate-800/40 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
                          {m.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              <span>{m.location}</span>
                            </div>
                          )}
                          {m.actual_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-400" />
                              <span>Completed: {m.actual_date}</span>
                            </div>
                          )}
                          {m.notes && (
                            <div className="italic text-slate-300">
                              &ldquo;{m.notes}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 border rounded-2xl border-dashed border-slate-800">
              No consignment selected
            </div>
          )}
        </div>
      </div>
      </PageLeftNav>

      {/* ADD MASTER STAGE MODAL */}
      {showAddStageModal && (
        <div
          onClick={() => setShowAddStageModal(false)}
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
                Add Master Milestone Stage
              </h3>
              <button onClick={() => setShowAddStageModal(false)} className="text-slate-400 hover:text-slate-200 p-1">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStage} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Stage Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SGS Quality Inspection & Fumigation"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Stage Description</label>
                <input
                  type="text"
                  placeholder="Third-party surveyor inspection and phytosanitary seal"
                  value={newStageDesc}
                  onChange={(e) => setNewStageDesc(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terminalCheck"
                  checked={isTerminal}
                  onChange={(e) => setIsTerminal(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <label htmlFor="terminalCheck" className="text-slate-300 font-medium cursor-pointer">
                  Mark as terminal final delivery stage
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddStageModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Save Master Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

