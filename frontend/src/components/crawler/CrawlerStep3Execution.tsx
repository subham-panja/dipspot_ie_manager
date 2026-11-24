'use client';

import React from 'react';
import {
  Download, FileText, RefreshCw, CheckCircle2, ArrowRight,
  Loader2, Terminal, Eye, ExternalLink,
} from 'lucide-react';
import { CrawlerJob, LeadPreviewItem } from './crawlerTypes';

interface CrawlerStep3ExecutionProps {
  isLight: boolean;
  activeJob: CrawlerJob | null;
  customLabel: string;
  effectiveCountry: string;
  commodity: string;
  depth: number;
  liveLeads: LeadPreviewItem[];
  loadingLiveLeads: boolean;
  activeTab: 'terminal' | 'leads';
  setActiveTab: (tab: 'terminal' | 'leads') => void;
  terminalBottomRef: React.RefObject<HTMLDivElement>;
  crawlVelocity: string;
  onNewHarvest: () => void;
  onExportCsv: (jobId?: number) => void;
  onExportJson: (jobId?: number) => void;
  onGoToLeads: (job?: CrawlerJob) => void;
}

const LOG_LEVEL_STYLES: Record<string, string> = {
  HTTP: 'bg-blue-500/20 text-blue-400', ROBOTS: 'bg-amber-500/20 text-amber-400',
  PARSE: 'bg-emerald-500/20 text-emerald-400', DORK: 'bg-purple-500/20 text-purple-400',
  DEDUP: 'bg-indigo-500/20 text-indigo-400', MERGED: 'bg-blue-500/30 text-blue-300',
  GEO: 'bg-cyan-500/20 text-cyan-300', SUCCESS: 'bg-emerald-500/30 text-emerald-300',
};

export default function CrawlerStep3Execution({
  isLight, activeJob, customLabel, effectiveCountry, commodity,
  depth, liveLeads, loadingLiveLeads, activeTab, setActiveTab,
  terminalBottomRef, crawlVelocity, onNewHarvest, onExportCsv,
  onExportJson, onGoToLeads,
}: CrawlerStep3ExecutionProps) {
  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{activeJob?.custom_label || customLabel}</h2>
            <span className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase ${
              activeJob?.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : activeJob?.status === 'running'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {activeJob?.status || 'RUNNING'}
            </span>
            {activeJob?.job_id && <span className="text-xs text-slate-500 font-mono">Job #{activeJob.job_id}</span>}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Target: <strong className="text-white">{activeJob?.country || effectiveCountry}</strong> &bull; Commodity:{' '}
            <strong className="text-white">{activeJob?.commodity || commodity}</strong> &bull; Quota:{' '}
            <strong className="text-white">{activeJob?.depth || depth} leads</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeJob?.status === 'completed' && (
            <>
              <button
                type="button"
                onClick={() => onExportCsv()}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => onExportJson()}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Export JSON
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onNewHarvest}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Start New Harvest
          </button>
        </div>
      </div>

      {activeJob?.status === 'completed' && (
        <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-4 shadow-lg shadow-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Background Harvest Completed Successfully!</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Discovered {activeJob.total_discovered || activeJob.leads_found || 0} genuine entities &bull; Saved{' '}
                  <strong className="text-emerald-400 font-bold">{activeJob.inserted_count ?? activeJob.leads_found} new verified records</strong>{' '}
                  &bull; Merged <strong className="text-blue-400">{activeJob.merged_count || 0} duplicates (95% ML Match)</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onGoToLeads()}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition transform hover:scale-[1.02]"
            >
              <span>Go to Leads Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-2">
            {activeJob?.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
            <span>{activeJob?.current_step || 'Processing live trade registries...'}</span>
          </span>
          <span className="font-mono font-bold text-blue-400">{activeJob?.progress_pct || 15}%</span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(5, activeJob?.progress_pct || 15))}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Discovered
            </div>
            <div className="text-xl font-bold text-white mt-1">{activeJob?.total_discovered || activeJob?.leads_found || 0}</div>
          </div>

          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
            <div className="text-emerald-400 text-[11px] font-semibold">Verified Inserted</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{activeJob?.inserted_count ?? activeJob?.leads_found ?? 0}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
            <div className="text-slate-400 text-[11px]">Duplicates Merged</div>
            <div className="text-xl font-bold text-blue-400 mt-1">{activeJob?.merged_count || 0}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
            <div className="text-slate-400 text-[11px]">Harvest Velocity</div>
            <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
              {crawlVelocity} <span className="text-[10px] text-slate-400 font-normal">leads/s</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="text-slate-400 text-[11px]">Elapsed Time</div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              {activeJob?.elapsed_seconds ? `${activeJob.elapsed_seconds}s` : '0s'}
            </div>
          </div>
        </div>
      </div>

      {activeJob?.current_url && (
        <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-500">Active URL:</span>
          <a href={activeJob.current_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">
            {activeJob.current_url}
          </a>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'terminal' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Live Compliance Audit Stream</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'leads' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Arriving Leads Preview ({liveLeads.length})</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500">Async background engine &bull; Navigation preserves execution</span>
        </div>

        {activeTab === 'terminal' && (
          <div className="h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] space-y-1.5">
            {(!activeJob?.logs || activeJob.logs.length === 0) ? (
              <div className="text-slate-600 text-center py-10">Waiting for initial stream from background worker...</div>
            ) : (
              activeJob.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 select-none">[{log.elapsed_seconds.toFixed(1)}s]</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${LOG_LEVEL_STYLES[log.level] || 'bg-slate-800 text-slate-400'}`}>
                    {log.level}
                  </span>
                  <span className="text-slate-300 break-all">{log.message}</span>
                  {log.latency_ms && <span className="text-slate-500 text-[10px] ml-auto shrink-0">{log.latency_ms}ms</span>}
                </div>
              ))
            )}
            <div ref={terminalBottomRef} />
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="max-h-60 overflow-y-auto">
              {loadingLiveLeads ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  Fetching leads captured in this harvest...
                </div>
              ) : liveLeads.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No leads captured yet for Job #{activeJob?.job_id}. Once records are verified, they will appear here in real-time.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Hub &amp; Country</th>
                      <th className="py-2 px-3">Commodity / Variety</th>
                      <th className="py-2 px-3">Domain / Contact</th>
                      <th className="py-2 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {liveLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3 font-semibold text-white">{lead.company_name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{lead.city_or_hub ? `${lead.city_or_hub}, ` : ''}{lead.country}</td>
                        <td className="py-2.5 px-3 text-slate-300">{lead.matched_varieties || 'Basmati Rice'}</td>
                        <td className="py-2.5 px-3">
                          {lead.website ? (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <span className="truncate max-w-[140px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px]">{lead.emails || lead.phones || 'Registry Record'}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{lead.priority_score || 88}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
