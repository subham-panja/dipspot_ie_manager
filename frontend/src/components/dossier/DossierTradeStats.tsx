'use client';

import React from 'react';
import { Ship } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierTradeStatsProps {
  lead: CustomerLead;
}

export default function DossierTradeStats({ lead }: DossierTradeStatsProps) {
  if (!lead.shipment_volume && !lead.importer_tier && lead.lead_type !== 'importer') {
    return null;
  }

  return (
    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">Customs Manifest Inbound Scale</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
          {lead.hs_codes_applicable || 'HS 100630'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Monthly Inbound Volume:</span>
          <span className="font-bold text-amber-300 font-mono">
            {lead.shipment_volume || '1-3 Containers / mo (25-75 MT)'}
          </span>
        </div>

        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Importer Scale:</span>
          <span className="font-semibold text-emerald-400">
            {lead.importer_tier === 'sme_importer' ? 'SME (Owner Direct)' : lead.importer_tier || 'SME Consignee'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px]">
        <span className="text-slate-400">Discharge Sea Port:</span>
        <strong className="text-white flex items-center gap-1 font-mono">
          <Ship className="w-3 h-3 text-blue-400" />
          {lead.nearest_port || 'Jebel Ali Port (AEJEA)'}
        </strong>
      </div>
    </div>
  );
}
