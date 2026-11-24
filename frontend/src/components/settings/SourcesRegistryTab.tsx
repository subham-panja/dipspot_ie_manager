'use client';

import React, { useState } from 'react';
import { Compass, CheckSquare, Globe2, Square, MapPin, Search } from 'lucide-react';
import { SourceItem } from './settingsTypes';

interface SourcesRegistryTabProps {
  sources: SourceItem[];
  saving: boolean;
  onToggleSource: (sourceId: string, enabled: boolean) => void;
  onBulkUpdate: (action: 'enable_all' | 'disable_all' | 'enable_indian_only') => Promise<void>;
  isLight: boolean;
  accentClasses: { badgeBg: string; text: string; [key: string]: any };
}

export default function SourcesRegistryTab({
  sources,
  saving,
  onToggleSource,
  onBulkUpdate,
  isLight,
  accentClasses,
}: SourcesRegistryTabProps) {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'importer' | 'supplier' | 'indian' | 'map'>('all');
  const [sourceSearch, setSourceSearch] = useState('');

  const filteredSources = sources.filter((s) => {
    if (sourceFilter === 'importer' && s.lead_type !== 'importer') return false;
    if (sourceFilter === 'supplier' && s.lead_type !== 'supplier') return false;
    if (sourceFilter === 'indian' && !s.is_indian && !s.country_coverage?.toLowerCase().includes('india')) return false;
    if (sourceFilter === 'map' && !s.is_map_extractor && s.id !== 'imp-src-gmaps' && s.id !== 'sup-src-gmaps') return false;
    if (sourceSearch) {
      const q = sourceSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.country_coverage.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      className={`p-6 rounded-2xl border space-y-6 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${accentClasses.badgeBg} ${accentClasses.text}`}>
              <Compass className="w-4 h-4" />
            </span>
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Data Sources & Sourcing Registries Management
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure active harvesting channels globally. Enabled sources are automatically selected in the Crawler wizard.
            Disabled sources are excluded across all crawler runs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onBulkUpdate('enable_all')}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Enable All
          </button>
          <button
            onClick={() => onBulkUpdate('enable_indian_only')}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Globe2 className="w-3.5 h-3.5" />
            Enable Indian Only
          </button>
          <button
            onClick={() => onBulkUpdate('disable_all')}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" />
            Disable All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Sources</span>
          <p className="text-xl font-black text-white mt-1">{sources.length || 218}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified directories & manifests</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Active / Enabled</span>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {sources.filter((s) => s.enabled).length}
          </p>
          <p className="text-[11px] text-emerald-500/80 mt-0.5">Available for Crawler runs</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
          <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">Disabled Globally</span>
          <p className="text-xl font-black text-rose-400 mt-1">
            {sources.filter((s) => !s.enabled).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Excluded from extraction</p>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
          <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Google Maps Live</span>
          <p className="text-xl font-black text-purple-400 mt-1">2 Channels</p>
          <p className="text-[11px] text-purple-400/80 mt-0.5">Importers & Suppliers Extractor</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              sourceFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            All Sources ({sources.length})
          </button>
          <button
            onClick={() => setSourceFilter('importer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              sourceFilter === 'importer'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Importers ({sources.filter((s) => s.lead_type === 'importer').length})
          </button>
          <button
            onClick={() => setSourceFilter('supplier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              sourceFilter === 'supplier'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Suppliers ({sources.filter((s) => s.lead_type === 'supplier').length})
          </button>
          <button
            onClick={() => setSourceFilter('indian')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              sourceFilter === 'indian'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Indian Bodies ({sources.filter((s) => s.is_indian || s.country_coverage?.toLowerCase().includes('india')).length})
          </button>
          <button
            onClick={() => setSourceFilter('map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              sourceFilter === 'map'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Google Maps ({sources.filter((s) => s.is_map_extractor || s.id.includes('gmaps')).length})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
            placeholder="Filter sources by name or country..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-slate-700"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
        <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-800/60">
          {filteredSources.map((source) => {
            const isGmaps = source.is_map_extractor || source.id.includes('gmaps');
            return (
              <div
                key={source.id}
                className={`p-4 flex items-center justify-between gap-4 transition hover:bg-slate-900/60 ${
                  !source.enabled ? 'opacity-60 bg-slate-950/60' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleSource(source.id, !source.enabled)}
                    className="mt-1 text-slate-400 hover:text-white transition shrink-0"
                    title={source.enabled ? 'Click to disable' : 'Click to enable'}
                  >
                    {source.enabled ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{source.name}</span>
                      {isGmaps && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-400" />
                          Google Maps Live
                        </span>
                      )}
                      {source.is_indian && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                          Indian Body
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          source.lead_type === 'importer'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {source.lead_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      <span className="text-slate-300">{source.category}</span>
                      <span>•</span>
                      <span>Coverage: {source.country_coverage}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{source.domain}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {source.reliability_score}% Reliability
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      source.enabled ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {source.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleSource(source.id, !source.enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      source.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        source.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
