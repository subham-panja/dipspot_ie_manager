'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { CustomerLead, XrayProfile, XrayFallbacks, XraySearchResponse } from './dossierTypes';
import { fetchJson } from '@/lib/api';

interface DossierXraySectionProps {
  lead: CustomerLead;
  isLight: boolean;
  onPersisted?: () => void;
}

function safeHttpUrl(raw?: string | null): string | null {
  const val = (raw || '').trim();
  if (!val) return null;
  if (/^https?:\/\//i.test(val)) return val;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(val) && !val.includes(':')) {
    return `https://${val}`;
  }
  return null;
}

export default function DossierXraySection({
  lead,
  isLight,
  onPersisted,
}: DossierXraySectionProps) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [profiles, setProfiles] = useState<XrayProfile[]>([]);
  const [fallbacks, setFallbacks] = useState<XrayFallbacks | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    requestSeqRef.current += 1;
    setRunning(false);
    setStatus(null);
    setFallbackUsed(false);
    setProfiles([]);
    setFallbacks(null);
    setMessage(null);
  }, [lead.id]);

  const hasValidLeadId = Boolean(lead.id && String(lead.id) !== '0');

  const handleLiveXraySearch = async () => {
    const seq = ++requestSeqRef.current;
    try {
      setRunning(true);
      setMessage(null);
      setStatus(null);
      setFallbackUsed(false);
      setProfiles([]);
      setFallbacks(null);

      const res = await fetchJson<XraySearchResponse>('/xray/search', {
        method: 'POST',
        body: JSON.stringify({
          company_name: lead.company_name,
          country: lead.country,
          website: lead.website,
          platform: 'linkedin',
          lead_id: hasValidLeadId ? lead.id : undefined,
          persist: hasValidLeadId,
          max_results: 10,
        }),
      });

      if (!isMountedRef.current || seq !== requestSeqRef.current) return;

      const foundProfiles = Array.isArray(res?.profiles) ? res.profiles : [];
      setStatus(res?.status || (foundProfiles.length > 0 ? 'live_results' : 'no_results'));
      setFallbackUsed(Boolean(res?.fallback_used));
      setProfiles(foundProfiles);
      setFallbacks(res?.fallbacks || null);

      if (foundProfiles.length > 0) {
        setMessage(
          `Discovered ${foundProfiles.length} live LinkedIn profile${foundProfiles.length > 1 ? 's' : ''} (${res?.engine_used || 'live SERP'}).`
        );
        onPersisted?.();
      } else if (
        res?.status === 'rate_limited_or_offline' ||
        res?.fallback_used ||
        res?.status === 'no_results'
      ) {
        setMessage(
          res?.fallbacks?.message ||
            'Live SERP returned no indexed profiles or was rate-limited. Zero-mock fallback links provided.'
        );
      } else {
        setMessage('Search completed.');
      }
    } catch (err: any) {
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setStatus('rate_limited_or_offline');
      setFallbackUsed(true);
      setMessage(err?.message || 'Network error executing live SERP search.');
    } finally {
      if (isMountedRef.current && seq === requestSeqRef.current) {
        setRunning(false);
      }
    }
  };

  const isRateLimitedOrOffline =
    status === 'rate_limited_or_offline' || status === 'no_results' || fallbackUsed;

  const textPrimary = isLight ? 'text-slate-900' : 'text-slate-200';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';
  const safeLinkedInKeywordUrl = safeHttpUrl(fallbacks?.linkedin_keyword_search_url);

  return (
    <div
      className={`p-3 rounded-xl border text-xs space-y-2.5 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 font-bold ${textPrimary}`}>
          <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>RecruitIn Boolean X-Ray Intelligence</span>
        </div>
        <button
          type="button"
          onClick={handleLiveXraySearch}
          disabled={running}
          className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition disabled:opacity-50 ${
            isLight
              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Querying SERP...' : 'Run Live X-Ray'}</span>
        </button>
      </div>

      {isRateLimitedOrOffline && (
        <div
          className={`p-2 rounded-lg border text-[11px] flex items-center gap-1.5 ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Live SERP status: {status || 'rate_limited_or_offline'}. Zero-mock invariant enforced: genuine fallback links provided.
          </span>
        </div>
      )}

      {message && (
        <div className={`text-[11px] flex items-center gap-1.5 ${textMuted}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {profiles.length > 0 && (
        <div
          className={`pt-2 border-t space-y-2 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${textMuted}`}>
            Extracted Live LinkedIn Profiles ({profiles.length})
          </span>
          <div className="space-y-1.5">
            {profiles.map((p, idx) => {
              const safeProfileUrl = safeHttpUrl(p.profile_url);
              return (
                <div
                  key={p.profile_url || idx}
                  className={`p-2 rounded-lg border text-[11px] space-y-0.5 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold ${textPrimary}`}>{p.name}</span>
                    {safeProfileUrl && (
                      <a
                        href={safeProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1 text-[10px] font-semibold shrink-0"
                      >
                        <span>LinkedIn Profile</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {(p.title || p.company) && (
                    <div className={textMuted}>
                      {[p.title, p.company].filter(Boolean).join(' • ')}
                    </div>
                  )}
                  {p.snippet && (
                    <p className={`text-[10px] line-clamp-2 ${textMuted}`}>{p.snippet}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fallbacks && (
        <div
          className={`pt-2 border-t space-y-1.5 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${textMuted}`}>
            Genuine Direct Search Fallbacks
          </span>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {safeLinkedInKeywordUrl && (
              <a
                href={safeLinkedInKeywordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isLight
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                }`}
              >
                <span>Direct LinkedIn Search</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            {fallbacks.search_urls &&
              Object.entries(fallbacks.search_urls).map(([engine, rawUrl]) => {
                const safeUrl = safeHttpUrl(rawUrl);
                if (!safeUrl) return null;
                return (
                  <a
                    key={engine}
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="capitalize">{engine} Query</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                );
              })}

            {Array.isArray(fallbacks.corporate_contact_urls) &&
              fallbacks.corporate_contact_urls.map((rawCurl, i) => {
                const safeCurl = safeHttpUrl(rawCurl);
                if (!safeCurl) return null;
                return (
                  <a
                    key={i}
                    href={safeCurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>Corporate Directory</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
