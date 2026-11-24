'use client';

import React from 'react';
import { Sparkles, Save } from 'lucide-react';
import { DedupConfig } from './settingsTypes';

interface DeduplicationSettingsTabProps {
  dedup: DedupConfig;
  setDedup: React.Dispatch<React.SetStateAction<DedupConfig>>;
  onSave: () => Promise<void>;
  saving: boolean;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function DeduplicationSettingsTab({
  dedup,
  setDedup,
  onSave,
  saving,
  isLight,
  accentClasses,
}: DeduplicationSettingsTabProps) {
  return (
    <div
      className={`p-6 rounded-2xl border space-y-6 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Machine Learning Deduplication & Intelligent Merge Engine
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          When extracting or crawling trade leads, any record that matches an existing company with &ge; 95% similarity
          will be merged to enrich contacts and trade history instead of creating redundant duplicates.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200">
              Similarity Threshold for Automatic Record Merge
            </label>
            <span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {dedup.dedup_threshold}%
            </span>
          </div>
          <input
            type="range"
            min="80"
            max="99"
            step="0.5"
            value={dedup.dedup_threshold}
            onChange={(e) => setDedup({ ...dedup, dedup_threshold: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>80% (Loose Matching)</span>
            <span className="text-emerald-400 font-bold">95.0% (Recommended Industry Standard)</span>
            <span>99% (Strict Matching)</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={dedup.auto_merge_duplicates}
              onChange={(e) => setDedup({ ...dedup, auto_merge_duplicates: e.target.checked })}
              className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Auto-Merge Discovered Duplicates (Recommended)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Unions emails, telephone numbers, and applicable HS codes while preserving historical audit timestamps.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={dedup.tax_crosscheck}
              onChange={(e) => setDedup({ ...dedup, tax_crosscheck: e.target.checked })}
              className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Tax ID & IEC Strict Cross-Checking
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Exact GSTIN, PAN, or DGFT IEC code match immediately scores 99.8% and triggers instant merge.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={dedup.phone_crosscheck}
              onChange={(e) => setDedup({ ...dedup, phone_crosscheck: e.target.checked })}
              className="mt-0.5 accent-emerald-500 w-4 h-4 rounded"
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Phone Number E.164 Cross-Checking
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Identical normalized telephone numbers with matching international country code score 96.5%.
              </span>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Conflict Resolution Strategy
          </label>
          <select
            value={dedup.conflict_resolution}
            onChange={(e) => setDedup({ ...dedup, conflict_resolution: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-white'
            }`}
          >
            <option value="intelligent_union">Intelligent Union (Combine emails, phones, products & audit trail)</option>
            <option value="keep_newest">Keep Newest (Overwrite with latest scraped details)</option>
            <option value="preserve_original">Preserve Original (Keep original contact data untouched)</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/40 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${accentClasses.btn}`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Deduplication Settings'}
        </button>
      </div>
    </div>
  );
}
