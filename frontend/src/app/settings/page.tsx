'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { fetchJson } from '@/lib/api';
import { useTheme, AccentColor, ThemeMode, DetailViewMode } from '@/context/ThemeContext';
import {
  Settings,
  Anchor,
  GitBranch,
  Save,
  RotateCcw,
  Plus,
  CheckCircle,
  Sliders,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Info,
  X,
  Sidebar as SidebarIcon,
  Layout,
  Layers,
  Globe2,
  Cpu
} from 'lucide-react';

interface Stage {
  stage_id: string;
  name: string;
  order: number;
  color?: string;
  description?: string;
  is_terminal?: boolean;
}

interface SystemConfig {
  user_agent: string;
  request_delay_seconds: number;
  timeout_seconds: number;
  target_importer_countries: string[];
  target_importer_cities: string[];
  target_hs_codes: string[];
  exclude_hs_codes: string[];
  positive_keywords: string[];
  target_mill_districts: string[];
  strict_no_basmati: boolean;
  updated_at?: string;
}

const colorSwatches: { key: AccentColor; name: string; bg: string; hex: string }[] = [
  { key: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', hex: '#10b981' },
  { key: 'blue', name: 'Sapphire Blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'violet', name: 'Royal Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { key: 'amber', name: 'Warm Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'rose', name: 'Crimson Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
];

export default function SettingsPage() {
  const { theme, setTheme, accent, setAccent, accentClasses, detailViewMode, setDetailViewMode } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'appearance' | 'config' | 'stages'>('appearance');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [pipelineStages, setPipelineStages] = useState<Stage[]>([]);
  const [shipmentStages, setShipmentStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Modals for adding stages
  const [showAddPipe, setShowAddPipe] = useState(false);
  const [showAddShip, setShowAddShip] = useState(false);

  const [newPipeStage, setNewPipeStage] = useState({
    name: '',
    color: '#10b981',
    is_terminal: false,
  });

  const [newShipStage, setNewShipStage] = useState({
    name: '',
    description: '',
    is_terminal: false,
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cfgRes, pipeRes, shipRes] = await Promise.all([
        fetchJson<{ config: SystemConfig }>('/config'),
        fetchJson<{ stages: Stage[] }>('/pipeline/stages'),
        fetchJson<{ stages: Stage[] }>('/shipments/stages'),
      ]);
      setConfig(cfgRes.config);
      setPipelineStages(pipeRes.stages || []);
      setShipmentStages(shipRes.stages || []);
    } catch (e) {
      console.error('Failed to load settings data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetchJson<{ config: SystemConfig; message: string }>('/config', {
        method: 'PATCH',
        body: JSON.stringify(config),
      });
      setConfig(res.config);
      setSaveMsg('System preferences updated successfully in live system!');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err: any) {
      alert('Error saving preferences: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = async () => {
    if (!confirm('Re-seed settings from initial configuration environment? This resets system parameters to baseline seed defaults.')) return;
    try {
      setSaving(true);
      const res = await fetchJson<{ config: SystemConfig; message: string }>('/config/reset', {
        method: 'POST',
      });
      setConfig(res.config);
      setSaveMsg(res.message || 'Preferences re-seeded from baseline config!');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err: any) {
      alert('Error resetting preferences: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPipelineStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/pipeline/stages', {
        method: 'POST',
        body: JSON.stringify(newPipeStage),
      });
      setShowAddPipe(false);
      setNewPipeStage({ name: '', color: '#10b981', is_terminal: false });
      loadAll();
    } catch (err: any) {
      alert('Error adding pipeline stage: ' + err.message);
    }
  };

  const handleAddShipmentStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/shipments/stages', {
        method: 'POST',
        body: JSON.stringify(newShipStage),
      });
      setShowAddShip(false);
      setNewShipStage({ name: '', description: '', is_terminal: false });
      loadAll();
    } catch (err: any) {
      alert('Error adding shipment stage: ' + err.message);
    }
  };

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Settings className={`w-6 h-6 ${accentClasses.text}`} />
            System Preferences & Operational Controls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personalize UI themes, customer profile drawer style, target trade corridors, and master lifecycle stages.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>Central Live Configuration Active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/40 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'appearance'
              ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Theme & Layout Customization</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'config'
              ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>Target Corridors & Crawlers</span>
        </button>

        <button
          onClick={() => setActiveTab('stages')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'stages'
              ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Master Stages (Pipeline & Tracking)</span>
        </button>
      </div>

      {/* TAB 1: THEME & COLORING & LAYOUT CUSTOMIZATION */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-6 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
          }`}>
            {/* Theme Mode */}
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Interface Theme
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between clean modern light mode or high-contrast deep slate dark mode.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md mt-3">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                    theme === 'dark'
                      ? `border-2 ${accentClasses.border} bg-slate-950 text-white shadow-md`
                      : 'border-slate-700/60 bg-slate-900/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-amber-300">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Dark Mode</div>
                    <div className="text-[11px] text-slate-400">Deep slate interface</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                    theme === 'light'
                      ? `border-2 ${accentClasses.border} bg-white text-slate-900 shadow-md`
                      : 'border-slate-300/60 bg-slate-100/60 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-800">
                    <Sun className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Light Mode</div>
                    <div className="text-[11px] text-slate-500">Crisp modern white</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="pt-4 border-t border-slate-800/40">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Brand Accent Color Palette
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose the brand highlight color applied to buttons, badges, icons, and active tabs.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                {colorSwatches.map((swatch) => {
                  const isSelected = accent === swatch.key;
                  return (
                    <button
                      key={swatch.key}
                      onClick={() => setAccent(swatch.key)}
                      className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                        isSelected
                          ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-100' : 'bg-slate-800/80 shadow-md'}`
                          : isLight
                          ? 'border-slate-200 bg-white hover:bg-slate-50'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${swatch.bg} shadow-md flex items-center justify-center text-white`}>
                        {isSelected && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        {swatch.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configurable Customer Detail View Style */}
            <div className="pt-4 border-t border-slate-800/40">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Customer Profile & Location Dossier Display Style
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure how the customer intelligence dossier (with Google Maps & trade stats) opens when clicking any company name.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3 max-w-3xl">
                {/* 1. Right Drawer */}
                <button
                  type="button"
                  onClick={() => setDetailViewMode('right_drawer')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    detailViewMode === 'right_drawer'
                      ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/70 shadow-lg'}`
                      : isLight
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
                        <SidebarIcon className="w-4 h-4" />
                        <span>Right Flyout Drawer</span>
                      </div>
                      {detailViewMode === 'right_drawer' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Slides smoothly from the right side of the screen. Keeps underlying directories visible while inspecting customer details.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-slate-500">Recommended for wide monitors</div>
                </button>

                {/* 2. Centered Modal */}
                <button
                  type="button"
                  onClick={() => setDetailViewMode('modal')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    detailViewMode === 'modal'
                      ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/70 shadow-lg'}`
                      : isLight
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
                        <Layout className="w-4 h-4" />
                        <span>Centered Modal Dialog</span>
                      </div>
                      {detailViewMode === 'modal' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Pops up in the center of the viewport with a blurred dark backdrop for dedicated focus.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-slate-500">Classic popup view</div>
                </button>

                {/* 3. Left Drawer */}
                <button
                  type="button"
                  onClick={() => setDetailViewMode('left_drawer')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    detailViewMode === 'left_drawer'
                      ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/70 shadow-lg'}`
                      : isLight
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                        <SidebarIcon className="w-4 h-4 rotate-180" />
                        <span>Left Flyout Drawer</span>
                      </div>
                      {detailViewMode === 'left_drawer' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Slides out from the left navigation boundary.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-slate-500">Alternative side layout</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM PREFERENCES & CRAWLER TARGETS */}
      {activeTab === 'config' && config && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-6 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800/40">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Globe2 className={`w-5 h-5 ${accentClasses.text}`} />
                  Live Operational Parameters & Crawler Targets
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Parameters seeded from environment file. Changes saved here take immediate live effect across all scraping and routing jobs.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Seed Defaults</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition cursor-pointer ${accentClasses.bg} ${accentClasses.bgHover}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>

            {saveMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{saveMsg}</span>
              </div>
            )}

            {/* Target Countries & Cities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Importer Countries (comma separated)</label>
                <input
                  type="text"
                  value={config.target_importer_countries.join(', ')}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      target_importer_countries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Importer Cities / Ports</label>
                <input
                  type="text"
                  value={config.target_importer_cities.join(', ')}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      target_importer_cities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Target HS Codes & Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target HS Codes Applicable</label>
                <input
                  type="text"
                  value={config.target_hs_codes.join(', ')}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      target_hs_codes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Positive Keywords (Match Scoring)</label>
                <input
                  type="text"
                  value={config.positive_keywords.join(', ')}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      positive_keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Target Supplier Districts */}
            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-medium">Target Supplier Districts & Production Hubs</label>
              <input
                type="text"
                value={config.target_mill_districts.join(', ')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    target_mill_districts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>

            {/* Crawler Network Timing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Request Delay (seconds)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={config.request_delay_seconds}
                  onChange={(e) => setConfig({ ...config, request_delay_seconds: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Network Timeout (seconds)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={config.timeout_seconds}
                  onChange={(e) => setConfig({ ...config, timeout_seconds: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: MASTER STAGES (FUNNEL & TRACKING) */}
      {activeTab === 'stages' && (
        <div className="space-y-6">
          {/* Pipeline Funnel Stages */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <GitBranch className="w-5 h-5 text-emerald-400" />
                  Sales Pipeline Stages (Kanban Funnel)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stages governing customer conversion from inquiry to final contract execution.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPipe(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pipeline Stage</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {pipelineStages.map((st) => (
                <div
                  key={st.stage_id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: st.color || '#10b981' }}
                    />
                    <div>
                      <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {st.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Order #{st.order} {st.is_terminal && '• Terminal'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipment Lifecycle Stages */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Anchor className="w-5 h-5 text-cyan-400" />
                  Cargo & Ocean Freight Master Stages
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Milestones visible to international buyers when tracking container progression.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddShip(true)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Shipment Stage</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {shipmentStages.map((st) => (
                <div
                  key={st.stage_id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">Step {st.order}</span>
                      {st.is_terminal && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                          Final
                        </span>
                      )}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {st.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                      {st.description || 'Milestone gate'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD PIPELINE STAGE MODAL */}
      {showAddPipe && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Add Pipeline Funnel Stage
              </h3>
              <button onClick={() => setShowAddPipe(false)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPipelineStage} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Stage Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Letter of Credit Received"
                  value={newPipeStage.name}
                  onChange={(e) => setNewPipeStage({ ...newPipeStage, name: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Stage Accent Color</label>
                <input
                  type="color"
                  value={newPipeStage.color}
                  onChange={(e) => setNewPipeStage({ ...newPipeStage, color: e.target.value })}
                  className="w-full h-10 rounded-xl cursor-pointer bg-transparent border border-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pipeTerminal"
                  checked={newPipeStage.is_terminal}
                  onChange={(e) => setNewPipeStage({ ...newPipeStage, is_terminal: e.target.checked })}
                  className="rounded border-slate-700"
                />
                <label htmlFor="pipeTerminal" className="text-slate-300 font-medium cursor-pointer">
                  Mark as terminal won stage
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddPipe(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
                >
                  Save Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SHIPMENT STAGE MODAL */}
      {showAddShip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Add Cargo Milestone Stage
              </h3>
              <button onClick={() => setShowAddShip(false)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShipmentStage} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Milestone Stage Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transshipment at Singapore"
                  value={newShipStage.name}
                  onChange={(e) => setNewShipStage({ ...newShipStage, name: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Description</label>
                <input
                  type="text"
                  placeholder="Container transferred to second vessel"
                  value={newShipStage.description}
                  onChange={(e) => setNewShipStage({ ...newShipStage, description: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shipTerminal"
                  checked={newShipStage.is_terminal}
                  onChange={(e) => setNewShipStage({ ...newShipStage, is_terminal: e.target.checked })}
                  className="rounded border-slate-700"
                />
                <label htmlFor="shipTerminal" className="text-slate-300 font-medium cursor-pointer">
                  Mark as terminal delivered stage
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddShip(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
