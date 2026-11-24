'use client';

import React from 'react';
import { Layers, Ship, Building2, Cpu, Globe, Zap, Check, ArrowRight } from 'lucide-react';
import { COMMODITY_PRESETS, DEPTH_PRESETS, PortPreset } from './crawlerTypes';

const PORT_PRESETS: PortPreset[] = [
  { country: 'United Arab Emirates', city: 'Jebel Ali / Dubai', portName: 'Jebel Ali (UAE)', flag: '🇦🇪' },
  { country: 'Bahrain', city: 'Manama / Hidd', portName: 'Khalifa Bin Salman (Bahrain)', flag: '🇧🇭' },
  { country: 'Saudi Arabia', city: 'Dammam', portName: 'King Abdulaziz / Dammam (Saudi Arabia)', flag: '🇸🇦' },
  { country: 'Kenya', city: 'Mombasa', portName: 'Port of Mombasa (Kenya)', flag: '🇰🇪' },
  { country: 'Togo', city: 'Lome', portName: 'Port of Lome (Togo)', flag: '🇹🇬' },
];

const COUNTRIES = [
  'United Arab Emirates (Dubai, Jebel Ali Free Zone)',
  'Saudi Arabia (Riyadh, Jeddah, Dammam)',
  'Qatar (Doha, Hamad Port)',
  'Kuwait (Shuwaikh Port)',
  'Oman (Sohar, Muscat)',
  'Bahrain (Khalifa Bin Salman Port)',
  'Togo (Lome, Autonomous Port of Lome)',
  'Benin (Cotonou, Autonomous Port of Cotonou)',
  'Nigeria (Lagos, Port of Apapa / Tin Can)',
  'Kenya (Mombasa, Kilindini Harbour)',
  'India (West Bengal, Punjab, Haryana, Gujarat)',
  'United States (California, Houston, New York)',
  'Germany (Hamburg, Bremen)',
  'Netherlands (Port of Rotterdam)',
  'Singapore (Jurong Port)',
  'Vietnam (Ho Chi Minh City, Haiphong)',
  'Thailand (Bangkok, Laem Chabang)',
  'Global Cross-Border',
];

interface CrawlerStep1ConfigProps {
  customLabel: string;
  setCustomLabel: (val: string) => void;
  leadType: 'importer' | 'supplier';
  setLeadType: (val: 'importer' | 'supplier') => void;
  selectedCountryPreset: string;
  setSelectedCountryPreset: (val: string) => void;
  customCountryInput: string;
  setCustomCountryInput: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  commodity: string;
  setCommodity: (val: string) => void;
  depth: number;
  setDepth: (val: number) => void;
  extractionNotes: string;
  setExtractionNotes: (val: string) => void;
  onApplyCustomsManifestTrick: (port: PortPreset) => void;
  onProceed: () => void;
  isLight: boolean;
  accentClasses: { bg: string; [key: string]: any };
}

export default function CrawlerStep1Config({
  customLabel, setCustomLabel, leadType, setLeadType,
  selectedCountryPreset, setSelectedCountryPreset,
  customCountryInput, setCustomCountryInput, city, setCity,
  commodity, setCommodity, depth, setDepth,
  extractionNotes, setExtractionNotes,
  onApplyCustomsManifestTrick, onProceed, isLight, accentClasses,
}: CrawlerStep1ConfigProps) {
  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
      <div className="flex items-center justify-between border-b pb-4 border-slate-800/40">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Step 1: Campaign Configuration &amp; Target Trade Parameters
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define your lead segment, geographic perimeter, target commodity, and quota depth.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Zero Mock Invariant Active
        </span>
      </div>

      <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">Strategy Preset: The &quot;Reverse-Engineer&quot; Customs Data Trick</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">HS 100630 &bull; 1-3 FCL/mo</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Crawl public shipping manifests &amp; Bill of Lading records for SME rice buyers (1 to 3 containers / mo). Excludes giant conglomerates. Pitch directly to Owner / Purchase Manager via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
          <span className="text-[11px] font-semibold text-slate-400">Target Landing Ports:</span>
          {PORT_PRESETS.map((p) => (
            <button
              key={p.portName}
              type="button"
              onClick={() => onApplyCustomsManifestTrick(p)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <span>{p.flag}</span>
              <span>{p.portName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Campaign Name / Custom Audit Label
          </label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Dubai Basmati Wholesale Q1"
            className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'}`}
          />
          <span className="text-[11px] text-slate-500">Every lead harvested in this crawl run will be tagged with this label for instant historical filtering.</span>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Target Lead Segment (Strictly Separated)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLeadType('importer')}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${leadType === 'importer' ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Globe className="w-3.5 h-3.5" />
              Global Importers &amp; Buyers
            </button>
            <button
              type="button"
              onClick={() => setLeadType('supplier')}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${leadType === 'supplier' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Suppliers &amp; Millers
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            Target Country / Region
          </label>
          <select
            value={selectedCountryPreset}
            onChange={(e) => setSelectedCountryPreset(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'}`}
          >
            {COUNTRIES.map((c) => {
              const val = c.split(' (')[0];
              const value = c.startsWith('Global') ? 'Global' : val;
              return <option key={value} value={value}>{c}</option>;
            })}
            <option value="CUSTOM">Custom Country (Type Custom Below)...</option>
          </select>
          {selectedCountryPreset === 'CUSTOM' && (
            <input
              type="text"
              value={customCountryInput}
              onChange={(e) => setCustomCountryInput(e.target.value)}
              placeholder="Enter custom country (e.g. Italy, Brazil, Kenya, Turkey)"
              className="w-full mt-2 px-3 py-2 rounded-xl border border-blue-500 bg-slate-950 text-white text-xs outline-none"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">City / Commercial Hub</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Dubai, Jebel Ali, Riyadh, Burdwan"
            className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'}`}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-300">Commodity Focus</label>
            <span className="text-[11px] text-slate-500">Click quick chip or type custom specification</span>
          </div>
          <input
            type="text"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            placeholder="e.g. Basmati Rice 1121, IR-64 Parboiled, Spices, Wheat"
            className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'}`}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {COMMODITY_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCommodity(c)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${commodity === c ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-semibold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Verified Leads Quota (Harvest Depth)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Targeting {depth} records &bull; Est. time: ~{Math.max(15, Math.round(depth * 0.45))}s
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {DEPTH_PRESETS.map((preset) => {
              const isSelected = depth === preset.value;
              return (
                <div
                  key={preset.value}
                  onClick={() => setDepth(preset.value)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${isSelected ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{preset.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-slate-400">Or custom quota:</span>
            <input
              type="number"
              min={1}
              max={300}
              value={depth}
              onChange={(e) => setDepth(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
              className="w-24 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs font-mono text-center font-bold focus:border-blue-500 outline-none"
            />
            <span className="text-[11px] text-slate-500">Max limit: 300 leads per crawl cycle</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <label className="font-semibold text-slate-300">Extraction Notes &amp; Scope Directives</label>
        <textarea
          rows={2}
          value={extractionNotes}
          onChange={(e) => setExtractionNotes(e.target.value)}
          placeholder="Optional parameters, specific certifications needed (SFDA, HACCP, Halal), or port consignee requirements."
          className={`w-full px-3 py-2 rounded-xl border outline-none text-xs resize-none ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'}`}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
        <div className="text-xs text-slate-400">Next: Select verified trade directories, configure Google Dorks &amp; Proxy Shield.</div>
        <button
          type="button"
          onClick={onProceed}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-md ${accentClasses.bg} hover:opacity-95`}
        >
          <span>Proceed to Source Selection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
