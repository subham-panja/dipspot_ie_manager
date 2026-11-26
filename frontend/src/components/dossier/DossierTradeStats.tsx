'use client';

import React from 'react';
import {
  Ship,
  MapPin,
  Package,
  Database,
  ExternalLink,
  Calendar,
  FileText,
  Globe2,
} from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierTradeStatsProps {
  lead: CustomerLead;
  isLight?: boolean;
}

function getSafeHttpUrl(raw?: string): string | null {
  const trimmed = (raw || '').trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export default function DossierTradeStats({ lead, isLight = false }: DossierTradeStatsProps) {
  const safeSourceUrl = getSafeHttpUrl(lead.source_url);

  const originState = lead.origin_state || lead.state || lead.district || 'Not specified';
  const portHub = lead.nearest_port || 'Not specified';

  const commodities: string[] =
    Array.isArray(lead.commodities_list) && lead.commodities_list.length > 0
      ? lead.commodities_list
      : (lead.matched_varieties || '')
          .split(/[,;|]/)
          .map((item) => item.trim())
          .filter(Boolean);

  const tradeLanes: string[] = Array.isArray(lead.key_trade_lanes) ? lead.key_trade_lanes : [];

  const manifestText = lead.customs_manifest_data
    ? typeof lead.customs_manifest_data === 'string'
      ? lead.customs_manifest_data
      : JSON.stringify(lead.customs_manifest_data)
    : 'Not recorded in manifest';

  const rawHarvestDate = lead.harvest_date || lead.created_at || '';
  const formattedHarvestDate = rawHarvestDate
    ? rawHarvestDate.slice(0, 19).replace('T', ' ')
    : 'Not recorded';

  const cardBg = isLight
    ? 'bg-slate-50 border-slate-200'
    : 'bg-slate-950/80 border-slate-800';
  const labelText = isLight ? 'text-slate-500' : 'text-slate-400';
  const valueText = isLight ? 'text-slate-900' : 'text-white';

  return (
    <div className="space-y-3.5">
      {/* 1. Import Volume & Scale */}
      <div
        className={`p-3.5 rounded-xl border space-y-2.5 ${
          isLight ? 'border-amber-200 bg-amber-50/60' : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-amber-500 shrink-0" />
            <span className={`text-xs font-bold ${valueText}`}>
              Trade Intelligence &amp; Import Volume
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {lead.hs_codes_applicable || 'HS 100630'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2 rounded-lg border ${cardBg}`}>
            <span className={`text-[10px] block ${labelText}`}>Shipment / Import Volume</span>
            <span className={`font-bold font-mono ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
              {lead.shipment_volume || 'Not specified'}
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${cardBg}`}>
            <span className={`text-[10px] block ${labelText}`}>Annual Volume Est.</span>
            <span className={`font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
              {lead.annual_volume_est || 'Not specified'}
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${cardBg}`}>
            <span className={`text-[10px] block ${labelText}`}>Tier / Risk Profile</span>
            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-emerald-400'}`}>
              {lead.importer_tier || lead.risk_tier || 'Standard Trade Entity'}
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${cardBg}`}>
            <span className={`text-[10px] block ${labelText}`}>Trade Role</span>
            <span className={`font-semibold ${valueText}`}>
              {lead.trade_role || (lead.lead_type === 'importer' ? 'Global Importer' : 'Verified Supplier')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Origin State, Country & Port Hub */}
      <div className={`p-3.5 rounded-xl border space-y-2.5 ${cardBg}`}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <span className={`text-xs font-bold ${valueText}`}>
            Origin State, Country &amp; Port Hub
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className={`text-[10px] block ${labelText}`}>Origin State / Province</span>
            <span className={`font-semibold ${valueText}`}>{originState}</span>
          </div>
          <div>
            <span className={`text-[10px] block ${labelText}`}>Country</span>
            <span className={`font-semibold ${valueText}`}>{lead.country || 'Not specified'}</span>
          </div>
        </div>

        <div
          className={`flex items-center justify-between pt-2 border-t text-[11px] ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <span className={labelText}>Port Hub:</span>
          <strong className={`flex items-center gap-1 font-mono ${valueText}`}>
            <Ship className="w-3 h-3 text-blue-500" />
            {portHub}
          </strong>
        </div>

        {tradeLanes.length > 0 && (
          <div className="pt-1">
            <span className={`text-[10px] flex items-center gap-1 mb-1 ${labelText}`}>
              <Globe2 className="w-3 h-3" />
              Key Trade Lanes
            </span>
            <div className="flex flex-wrap gap-1">
              {tradeLanes.map((lane, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    isLight
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                  }`}
                >
                  {lane}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Commodities */}
      <div className={`p-3.5 rounded-xl border space-y-2 ${cardBg}`}>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className={`text-xs font-bold ${valueText}`}>Commodities &amp; Varieties</span>
        </div>
        {commodities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {commodities.map((item, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className={`text-[11px] ${labelText}`}>No commodities specified.</p>
        )}
      </div>

      {/* 4. Lead Source Metadata */}
      <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${cardBg}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-500 shrink-0" />
            <span className={`text-xs font-bold ${valueText}`}>Lead Source Metadata</span>
          </div>
          {typeof lead.source_reliability === 'number' && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isLight
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
              }`}
            >
              Reliability: {Math.round(lead.source_reliability * 100)}%
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className={labelText}>Source Portal:</span>
            {safeSourceUrl ? (
              <a
                href={safeSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline font-semibold flex items-center gap-1 truncate max-w-[220px]"
              >
                <span className="truncate">{lead.source_name || safeSourceUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className={`font-semibold ${valueText}`}>
                {lead.source_name || 'Verified Trade Registry'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className={labelText}>B2B Directory:</span>
            <span className={`font-medium ${valueText}`}>
              {lead.b2b_directory || lead.source_category || 'Not specified'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className={`${labelText} flex items-center gap-1`}>
              <Calendar className="w-3 h-3" />
              Harvest Date:
            </span>
            <span className={`font-mono ${valueText}`}>{formattedHarvestDate}</span>
          </div>

          <div
            className={`pt-2 border-t ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <span className={`${labelText} flex items-center gap-1 mb-1`}>
              <FileText className="w-3 h-3" />
              Customs Manifest Data:
            </span>
            <div
              className={`p-2 rounded-lg border font-mono text-[10px] break-words ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {manifestText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
