'use client';

import React from 'react';
import {
  Filter, ArrowLeft, ShieldCheck, Database, Search,
  Check, ExternalLink, Loader2, Play,
} from 'lucide-react';
import { CrawlerSource, SOURCE_CATEGORIES } from './crawlerTypes';

interface CrawlerStep2SourcesProps {
  isLight: boolean;
  enableGoogleDork: boolean; setEnableGoogleDork: (val: boolean) => void;
  customDorkQuery: string; setCustomDorkQuery: (val: string) => void;
  onToggleDorkModifier: (mod: string) => void; onResetDorkQuery: () => void;
  enableProxyShield: boolean; setEnableProxyShield: (val: boolean) => void;
  availableSources: CrawlerSource[]; selectedSourceIds: Set<string>;
  onToggleSourceSelection: (id: string) => void;
  onSelectAllSources: () => void; onDeselectAllSources: () => void;
  onSelectCurrentCategoryOnly: () => void;
  filteredSources: CrawlerSource[];
  sourceSearch: string; setSourceSearch: (val: string) => void;
  selectedCategoryTab: string; setSelectedCategoryTab: (val: string) => void;
  loadingSources: boolean; effectiveCountry: string; city: string; depth: number;
  isSubmitting: boolean; onBack: () => void; onLaunch: () => void;
}

export default function CrawlerStep2Sources({
  isLight, enableGoogleDork, setEnableGoogleDork, customDorkQuery, setCustomDorkQuery,
  onToggleDorkModifier, onResetDorkQuery, enableProxyShield, setEnableProxyShield,
  availableSources, selectedSourceIds, onToggleSourceSelection, onSelectAllSources,
  onDeselectAllSources, onSelectCurrentCategoryOnly, filteredSources, sourceSearch,
  setSourceSearch, selectedCategoryTab, setSelectedCategoryTab, loadingSources,
  effectiveCountry, city, depth, isSubmitting, onBack, onLaunch,
}: CrawlerStep2SourcesProps) {
  const dorkModifiers = [
    '-filetype:pdf', '-retail -shop -b2c', `intext:"${city}"`,
    '"HACCP" OR "ISO 22000"', '"CIF" OR "FOB"', '"Consignee" OR "Bill of Lading"',
  ];

  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
      <div className="flex items-center justify-between border-b pb-4 border-slate-800/40">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            Step 2: Source Selection, Google Dorks &amp; Anti-Block Shield
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Only selected sources will be used as lead sources. Configure customizable Google Dorks and rotating free proxies.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">G</div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span>Google Search &amp; Custom Google Dork Harvester</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">99% Accuracy</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Discovers unindexed commercial wholesale buyers and millers directly using advanced Google search operators.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={enableGoogleDork}
              onChange={(e) => setEnableGoogleDork(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span>Enable Dorks</span>
          </label>
        </div>

        {enableGoogleDork && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400">Google Dork Expression:</label>
              <span className="text-[10px] text-slate-500">Click chips below to toggle query parameters</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customDorkQuery}
                onChange={(e) => setCustomDorkQuery(e.target.value)}
                placeholder='intitle:"importers" "Basmati Rice" "Dubai" -filetype:pdf'
                className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={onResetDorkQuery}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap"
              >
                Reset Default
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 mr-1">Quick Modifiers:</span>
              {dorkModifiers.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => onToggleDorkModifier(mod)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${customDorkQuery.includes(mod) ? 'bg-blue-600 text-white border-blue-500 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
                >
                  {customDorkQuery.includes(mod) ? `✓ ${mod}` : `+ ${mod}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Multi-Proxy Anti-Block Shield (Free Rotating Proxies Setup)</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">Active Shield</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Rotates through 7+ free public HTTP/HTTPS proxies with anti-ban latency jitter (0.35s-0.85s) and automatic direct fallback.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
          <input
            type="checkbox"
            checked={enableProxyShield}
            onChange={(e) => setEnableProxyShield(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600"
          />
          <span>Anti-Block Shield</span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Verified Trade Registries &amp; Customs Manifests ({availableSources.length} Available)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {selectedSourceIds.size} of {availableSources.length} sources selected for this crawl run.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Search sources or domains..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-white outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            </div>
            <button
              type="button"
              onClick={onSelectAllSources}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselectAllSources}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {SOURCE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryTab(cat.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap transition font-medium ${selectedCategoryTab === cat.id ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              {cat.label}
            </button>
          ))}
          {selectedCategoryTab !== 'all' && (
            <button
              type="button"
              onClick={onSelectCurrentCategoryOnly}
              className="ml-auto text-[11px] text-blue-400 hover:underline"
            >
              Select All in Category
            </button>
          )}
        </div>

        <div className="border border-slate-800 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-800/40 bg-slate-950/40">
          {loadingSources ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              Loading verified trade sources for {effectiveCountry}...
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No sources found matching filter &quot;{sourceSearch}&quot;.
            </div>
          ) : (
            filteredSources.map((src) => {
              const isSelected = selectedSourceIds.has(src.id);
              return (
                <div
                  key={src.id}
                  onClick={() => onToggleSourceSelection(src.id)}
                  className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${isSelected ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-slate-900/50 opacity-60'}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={`w-4 h-4 rounded border flex items-center justify-center transition ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'}`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{src.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal font-mono">({src.domain})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{src.category}</span>
                        <span>&bull;</span>
                        <span>Coverage: {src.country_coverage}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-mono font-bold ${src.reliability_score >= 95 ? 'text-emerald-400' : src.reliability_score >= 90 ? 'text-blue-400' : 'text-amber-400'}`}>
                      {src.reliability_score}% Reliability
                    </span>
                    <a href={src.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-500 hover:text-blue-400 p-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Parameters
        </button>

        <button
          type="button"
          disabled={isSubmitting || selectedSourceIds.size === 0}
          onClick={onLaunch}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-lg ${selectedSourceIds.size === 0 ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Dispatching Crawler...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Background Harvest ({depth} Records)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
