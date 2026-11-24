'use client';

import React from 'react';
import { History, RefreshCw, Download, ArrowRight } from 'lucide-react';
import { CrawlerJob } from './crawlerTypes';

interface CrawlerHistoryDrawerProps {
  isLight: boolean;
  historyRuns: CrawlerJob[];
  loadingHistory: boolean;
  onRefresh: () => void;
  onSelectRun: (run: CrawlerJob) => void;
  onCloneRun: (run: CrawlerJob) => void;
  onExportCsv: (jobId?: number) => void;
}

export default function CrawlerHistoryDrawer({
  isLight,
  historyRuns,
  loadingHistory,
  onRefresh,
  onSelectRun,
  onCloneRun,
  onExportCsv,
}: CrawlerHistoryDrawerProps) {
  return (
    <div className={`p-6 rounded-2xl border space-y-4 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
      <div className="flex items-center justify-between border-b pb-3 border-slate-800/40">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white">
            Crawling History &amp; Campaign Audit Records
          </h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Click any row to jump directly to the filtered trade leads harvested during that crawl run, or click &quot;Clone Parameters&quot; to re-run.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800/60 text-[11px] text-slate-500 uppercase font-semibold">
              <th className="py-2.5 px-3">Campaign / Label</th>
              <th className="py-2.5 px-2">Type</th>
              <th className="py-2.5 px-3">Country &amp; Commodity</th>
              <th className="py-2.5 px-2">Status</th>
              <th className="py-2.5 px-2 text-right">Quota</th>
              <th className="py-2.5 px-2 text-right">New / Merged</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {loadingHistory ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading crawl history...
                </td>
              </tr>
            ) : historyRuns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No crawling runs recorded yet. Launch your first harvest above!
                </td>
              </tr>
            ) : (
              historyRuns.map((run, idx) => (
                <tr
                  key={run.job_id || idx}
                  onClick={() => onSelectRun(run)}
                  className="hover:bg-blue-500/5 cursor-pointer transition"
                >
                  <td className="py-3 px-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{run.custom_label || 'Standard Harvest'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Job #{run.job_id} &bull; {run.created_at ? new Date(run.created_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </td>

                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      run.lead_type === 'supplier'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {run.lead_type || 'importer'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-300">
                    <div>{run.country || 'Global'}</div>
                    <div className="text-[10px] text-slate-500">{run.commodity || 'Commodity Grains'}</div>
                  </td>

                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      run.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : run.status === 'running'
                        ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {run.status || 'completed'}
                    </span>
                  </td>

                  <td className="py-3 px-2 text-right font-mono text-slate-400">
                    {run.depth || 30}
                  </td>

                  <td className="py-3 px-2 text-right font-mono">
                    <span className="text-emerald-400 font-bold">{run.inserted_count ?? run.leads_found ?? 0}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-blue-400 font-bold">{run.merged_count || 0}</span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Export CSV"
                        onClick={() => onExportCsv(run.job_id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title="Clone and Re-run"
                        onClick={() => onCloneRun(run)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition"
                      >
                        Clone
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectRun(run)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-semibold transition flex items-center gap-1"
                      >
                        <span>Leads</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
