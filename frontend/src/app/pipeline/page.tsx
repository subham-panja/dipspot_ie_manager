'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import CustomerDossier from '@/components/CustomerDossier';
import {
  Kanban,
  Plus,
  Search,
  Building2,
  Clock,
  CheckCircle,
  X,
  FileText,
  Trash2,
  Scale,
  Users,
  ChevronRight,
  Sliders,
  Settings,
  ArrowRight,
  Sparkles,
  GripVertical
} from 'lucide-react';

interface Stage {
  stage_id: string;
  name: string;
  order: number;
  color?: string;
  is_terminal?: boolean;
}

interface Deal {
  deal_id: string;
  title: string;
  company_name: string;
  country: string;
  commodity: string;
  quantity_mt: number;
  incoterm: string;
  payment_terms: string;
  stage_id: string;
  stage_name: string;
  expected_close_date?: string;
  notes?: string[];
  created_at: string;
  updated_at: string;
}

export default function PipelineKanbanPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  // Drag and Drop State
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [newNote, setNewNote] = useState('');

  // Customer Dossier view
  const [dossierCustomer, setDossierCustomer] = useState<any | null>(null);

  // New Deal Form State
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    country: 'United Arab Emirates',
    commodity: 'IR-64 Parboiled Rice 5% Broken',
    quantity_mt: 250,
    incoterm: 'CIF Jebel Ali Port',
    payment_terms: '100% Irrevocable L/C at Sight',
    stage_id: 'inquiry',
    expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    note: 'Initial inquiry received via international trade buyer network',
  });

  // Stage Config State
  const [newStageForm, setNewStageForm] = useState({
    name: '',
    color: '#10b981',
    is_terminal: false,
  });

  // Escape key closes any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfigModal(false);
        setShowNewModal(false);
        setSelectedDeal(null);
        setDossierCustomer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stagesRes, dealsRes] = await Promise.all([
        fetchJson<{ stages: Stage[] }>('/pipeline/stages'),
        fetchJson<{ deals: Deal[]; total_deals: number }>('/pipeline/deals'),
      ]);
      setStages(stagesRes.stages || []);
      setDeals(dealsRes.deals || []);
    } catch (e) {
      console.error('Failed to load pipeline data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/pipeline/deals', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          notes: formData.note ? [formData.note] : [],
        }),
      });
      setShowNewModal(false);
      setFormData({
        title: '',
        company_name: '',
        country: 'United Arab Emirates',
        commodity: 'IR-64 Parboiled Rice 5% Broken',
        quantity_mt: 250,
        incoterm: 'CIF Jebel Ali Port',
        payment_terms: '100% Irrevocable L/C at Sight',
        stage_id: 'inquiry',
        expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        note: '',
      });
      loadData();
    } catch (err: any) {
      alert('Error creating deal: ' + err.message);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageForm.name.trim()) return;
    try {
      await fetchJson('/pipeline/stages', {
        method: 'POST',
        body: JSON.stringify(newStageForm),
      });
      setNewStageForm({ name: '', color: '#10b981', is_terminal: false });
      loadData();
    } catch (err: any) {
      alert('Failed to add stage: ' + err.message);
    }
  };

  const handleStageChange = async (dealId: string, newStageId: string) => {
    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.deal_id === dealId ? { ...d, stage_id: newStageId } : d))
    );

    try {
      await fetchJson(`/pipeline/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stage_id: newStageId,
          note: `Stage changed to ${newStageId.toUpperCase().replace('_', ' ')}`,
        }),
      });
      if (selectedDeal && selectedDeal.deal_id === dealId) {
        setSelectedDeal((prev) => (prev ? { ...prev, stage_id: newStageId } : null));
      }
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
      loadData(); // rollback
    }
  };

  // Drag and Drop Handler
  const handleDropDeal = async (dealId: string, targetStageId: string) => {
    const currentDeal = deals.find((d) => d.deal_id === dealId);
    if (!currentDeal || currentDeal.stage_id === targetStageId) return;

    await handleStageChange(dealId, targetStageId);
  };

  const handleAddNote = async (dealId: string) => {
    if (!newNote.trim()) return;
    try {
      await fetchJson(`/pipeline/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify({ note: newNote }),
      });
      setNewNote('');
      const updated = await fetchJson<{ deal: Deal }>(`/pipeline/deals/${dealId}`);
      setSelectedDeal(updated.deal);
      loadData();
    } catch (err: any) {
      alert('Failed to add note: ' + err.message);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this customer deal?')) return;
    try {
      await fetchJson(`/pipeline/deals/${dealId}`, { method: 'DELETE' });
      setSelectedDeal(null);
      loadData();
    } catch (err: any) {
      alert('Failed to delete deal: ' + err.message);
    }
  };

  const openDossierForDeal = (deal: Deal) => {
    setDossierCustomer({
      id: 9999,
      company_name: deal.company_name,
      country: deal.country,
      contact_person: 'Executive Trade Buyer Desk',
      matched_varieties: deal.commodity,
      priority_score: 85,
      lead_type: 'importer',
    });
  };

  // Filter deals
  const filteredDeals = deals.filter((d) => {
    const matchesSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      d.commodity.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = !countryFilter || d.country.toLowerCase().includes(countryFilter.toLowerCase());
    return matchesSearch && matchesCountry;
  });

  const totalQuantity = filteredDeals.reduce((sum, d) => sum + (d.quantity_mt || 0), 0);
  const countries = Array.from(new Set(deals.map((d) => d.country).filter(Boolean)));

  return (
    <Shell>
      {/* Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Interactive Funnel
            </span>
            <span className="text-xs text-slate-400 font-mono">{stages.length} Stages • Drag & Drop Enabled</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Kanban className={`w-6 h-6 ${accentClasses.text}`} />
            Customer Pipeline Kanban
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tactile drag-and-drop board tracking customer deals through negotiation, contract signing, and cargo release.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowConfigModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Stages</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer Deal</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
      }`}>
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search customer, opportunity title, or commodity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full text-xs pl-8 pr-3 py-2 rounded-lg border outline-none transition ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500'
              }`}
            />
          </div>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className={`text-xs px-3 py-2 rounded-lg border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-800'
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="">All Customer Geographies</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-400">
          Showing <strong className={isLight ? 'text-slate-800' : 'text-white'}>{filteredDeals.length}</strong> active deals ({totalQuantity.toLocaleString()} MT)
        </div>
      </div>

      {/* Horizontally & Vertically Scrollable Kanban Board with Drag & Drop */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="flex gap-4 min-w-[1400px]">
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.stage_id);
            const isHovered = dragOverStageId === stage.stage_id;

            return (
              <div
                key={stage.stage_id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverStageId !== stage.stage_id) {
                    setDragOverStageId(stage.stage_id);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverStageId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dealId = e.dataTransfer.getData('text/plain');
                  setDragOverStageId(null);
                  setDraggedDealId(null);
                  if (dealId) {
                    handleDropDeal(dealId, stage.stage_id);
                  }
                }}
                className={`w-72 flex-shrink-0 rounded-2xl border flex flex-col max-h-[76vh] transition-all duration-150 ${
                  isHovered
                    ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/60 shadow-lg'
                    : isLight
                    ? 'bg-slate-100/70 border-slate-200'
                    : 'bg-slate-900/50 border-slate-800/80'
                }`}
              >
                {/* Stage Column Header */}
                <div className={`p-3.5 border-b rounded-t-2xl flex items-center justify-between sticky top-0 z-10 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color || '#10b981' }}
                    />
                    <h3 className={`text-xs font-bold tracking-wide truncate max-w-[150px] ${
                      isLight ? 'text-slate-800' : 'text-white'
                    }`}>
                      {stage.name}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {stageDeals.length}
                  </span>
                </div>

                {/* Drop Indicator when dragging over */}
                {isHovered && (
                  <div className="mx-2.5 mt-2 py-2 border-2 border-dashed border-emerald-500/60 rounded-xl bg-emerald-500/10 text-center text-[11px] font-semibold text-emerald-400 animate-pulse">
                    Drop to move to {stage.name}
                  </div>
                )}

                {/* Scrollable Column Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto">
                  {stageDeals.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-700/40 rounded-xl">
                      No deals here
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const isDragging = draggedDealId === deal.deal_id;

                      return (
                        <div
                          key={deal.deal_id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', deal.deal_id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedDealId(deal.deal_id);
                          }}
                          onDragEnd={() => {
                            setDraggedDealId(null);
                            setDragOverStageId(null);
                          }}
                          onClick={() => setSelectedDeal(deal)}
                          className={`p-3.5 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all group hover:shadow-md ${
                            isDragging
                              ? 'opacity-30 border-dashed border-emerald-500 scale-[0.98]'
                              : isLight
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-xs font-bold transition line-clamp-1 group-hover:${accentClasses.text} ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}>
                              {deal.title}
                            </h4>
                            <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-50 group-hover:opacity-100 transition shrink-0" />
                          </div>

                          {/* Customer Company Name - Clicking opens Dossier */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              openDossierForDeal(deal);
                            }}
                            className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
                            title="Click to view Customer Map & Intelligence"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className={`font-semibold truncate underline decoration-dotted underline-offset-2 ${
                              isLight ? 'text-slate-700' : 'text-slate-200'
                            }`}>
                              {deal.company_name}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="truncate">{deal.country}</span>
                            <span className="font-mono text-slate-500 font-semibold">{deal.quantity_mt} MT</span>
                          </div>

                          {/* Quick Move Dropdown */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center justify-between gap-2">
                            <select
                              value={deal.stage_id}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStageChange(deal.deal_id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`w-full text-[11px] rounded-lg px-2 py-1 border outline-none ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              {stages.map((st) => (
                                <option key={st.stage_id} value={st.stage_id}>
                                  Move &rarr; {st.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* In-Page Stage Configuration Manager Modal */}
      {showConfigModal && (
        <div
          onClick={() => setShowConfigModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Sliders className="w-5 h-5 text-emerald-400" />
                Configure Pipeline Stages
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Stages List */}
            <div className="mt-4 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Current Sequence ({stages.length} Stages)
              </span>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {stages.map((st) => (
                  <div
                    key={st.stage_id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color || '#3b82f6' }} />
                      <span className="font-semibold">{st.name}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[10px]">Order #{st.order}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Stage Form */}
            <form onSubmit={handleAddStage} className="mt-5 pt-4 border-t border-slate-800/50 space-y-3 text-xs">
              <span className="text-xs font-semibold text-white block">Add New Funnel Stage</span>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Stage Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Letter of Credit Authenticated"
                  value={newStageForm.name}
                  onChange={(e) => setNewStageForm({ ...newStageForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Color Tag Hex</label>
                <input
                  type="text"
                  value={newStageForm.color}
                  onChange={(e) => setNewStageForm({ ...newStageForm, color: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="termStage"
                  checked={newStageForm.is_terminal}
                  onChange={(e) => setNewStageForm({ ...newStageForm, is_terminal: e.target.checked })}
                  className="accent-emerald-500"
                />
                <label htmlFor="termStage" className="text-slate-300 cursor-pointer">
                  Mark as terminal final stage (Won / Lost)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 text-slate-400"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white font-semibold ${accentClasses.bg}`}
                >
                  Save Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {showNewModal && (
        <div
          onClick={() => setShowNewModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Plus className="w-5 h-5 text-emerald-500" />
                Add Customer to Funnel
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Deal Title / Opportunity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 MT Parboiled IR-64 to Dubai"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Company / Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Dhiyafa Foodstuff LLC"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Country *</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Commodity Variety *</label>
                  <input
                    type="text"
                    required
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Quantity (MT) *</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity_mt}
                    onChange={(e) => setFormData({ ...formData, quantity_mt: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Incoterms</label>
                  <input
                    type="text"
                    value={formData.incoterm}
                    onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Initial Funnel Stage</label>
                  <select
                    value={formData.stage_id}
                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  >
                    {stages.map((st) => (
                      <option key={st.stage_id} value={st.stage_id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Initial Customer Note</label>
                <textarea
                  rows={2}
                  placeholder="Customer requirements, sample dates, packing details..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition`}
                >
                  Add Customer Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Deal Detail Drawer */}
      {selectedDeal && (
        <div
          onClick={() => setSelectedDeal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between border-l ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800/40">
                <div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${accentClasses.badgeBg}`}>
                    {selectedDeal.deal_id}
                  </span>
                  <h2 className={`text-lg font-bold mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {selectedDeal.title}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {selectedDeal.company_name} &bull; {selectedDeal.country}
                  </p>
                </div>
                <button onClick={() => setSelectedDeal(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => openDossierForDeal(selectedDeal)}
                  className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  View Interactive Map & Full Dossier
                </button>
              </div>

              {/* Specs */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Commodity:</span>
                  <span className="font-semibold text-white">{selectedDeal.commodity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tonnage:</span>
                  <span className="font-semibold text-white">{selectedDeal.quantity_mt} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Incoterms:</span>
                  <span className="font-semibold text-white">{selectedDeal.incoterm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Terms:</span>
                  <span className="font-semibold text-white">{selectedDeal.payment_terms}</span>
                </div>
              </div>

              {/* Stage Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Update Stage
                </label>
                <select
                  value={selectedDeal.stage_id}
                  onChange={(e) => handleStageChange(selectedDeal.deal_id, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                >
                  {stages.map((st) => (
                    <option key={st.stage_id} value={st.stage_id}>
                      {st.name} {st.is_terminal ? '(Terminal)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes Timeline */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Customer Activity Notes
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDeal.notes && selectedDeal.notes.length > 0 ? (
                    selectedDeal.notes.map((n, i) => (
                      <div
                        key={i}
                        className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-lg text-xs text-slate-300"
                      >
                        {n}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No notes logged yet.</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an update note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selectedDeal.deal_id)}
                    className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleAddNote(selectedDeal.deal_id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg"
                  >
                    Post Note
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleDeleteDeal(selectedDeal.deal_id)}
                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Deal
              </button>
              <button
                onClick={() => setSelectedDeal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Dossier Modal / Drawer with Interactive Map */}
      <CustomerDossier
        customer={dossierCustomer}
        onClose={() => setDossierCustomer(null)}
        onConvertToDeal={() => {
          setDossierCustomer(null);
          setShowNewModal(true);
        }}
      />
    </Shell>
  );
}
