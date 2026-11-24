'use client';

import React from 'react';
import { Play, CheckCircle, Save } from 'lucide-react';
import { CrawlerConfig } from './globalSettingsTypes';

interface ModalCrawlerTabProps {
  crawler: CrawlerConfig;
  setCrawler: React.Dispatch<React.SetStateAction<CrawlerConfig | null>>;
  isCrawling: boolean;
  crawlStatusMsg: string;
  onTriggerInstantCrawl: (leadType?: string) => Promise<void>;
  onSaveCrawler: () => Promise<void>;
  isLight: boolean;
  accentClasses: { btn: string; [key: string]: any };
}

export default function ModalCrawlerTab({
  crawler,
  setCrawler,
  isCrawling,
  crawlStatusMsg,
  onTriggerInstantCrawl,
  onSaveCrawler,
  isLight,
  accentClasses,
}: ModalCrawlerTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Unlimited Automated Directory Crawlers
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Clicking &quot;Trigger Instant Crawl&quot; discovers incremental new international contacts without artificial caps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isCrawling}
            onClick={() => onTriggerInstantCrawl('all')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isCrawling ? 'Crawling...' : 'Crawl All Sources Now'}</span>
          </button>
        </div>
      </div>

      {crawlStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{crawlStatusMsg}</span>
        </div>
      )}

      <div>
        <label className="block text-slate-400 mb-1.5 font-medium">Configured Directory Sources</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {crawler.sources.map((src, idx) => (
            <label
              key={src.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                src.active
                  ? isLight
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-900 border-slate-700'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={src.active}
                  onChange={(e) => {
                    const next = [...crawler.sources];
                    next[idx].active = e.target.checked;
                    setCrawler({ ...crawler, sources: next });
                  }}
                  className="rounded border-slate-700"
                />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {src.name}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase text-slate-400">{src.type}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-slate-400 mb-1 font-medium">
          Universal Target Commodities for Crawling (Comma Separated)
        </label>
        <textarea
          rows={3}
          value={crawler.target_commodities.join(', ')}
          onChange={(e) =>
            setCrawler({
              ...crawler,
              target_commodities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
          className={`w-full p-2.5 rounded-xl border outline-none font-medium leading-relaxed ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Pages Scrape Depth</label>
          <input
            type="number"
            min={1}
            max={50}
            value={crawler.crawl_depth_pages}
            onChange={(e) => setCrawler({ ...crawler, crawl_depth_pages: Number(e.target.value) })}
            className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Request Delay (sec)</label>
          <input
            type="number"
            step={0.5}
            value={crawler.request_delay_seconds}
            onChange={(e) => setCrawler({ ...crawler, request_delay_seconds: Number(e.target.value) })}
            className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Network Timeout (sec)</label>
          <input
            type="number"
            value={crawler.timeout_seconds}
            onChange={(e) => setCrawler({ ...crawler, timeout_seconds: Number(e.target.value) })}
            className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onSaveCrawler}
          className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition ${accentClasses.btn}`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Crawler Parameters</span>
        </button>
      </div>
    </div>
  );
}
