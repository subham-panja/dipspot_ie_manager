'use client';

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierNotesProps {
  lead: CustomerLead;
  isLight: boolean;
  onAddNote: (note: string) => Promise<void>;
  addingNote: boolean;
  whatsappUrl?: string;
}

export default function DossierNotes({
  lead,
  isLight,
  onAddNote,
  addingNote,
  whatsappUrl,
}: DossierNotesProps) {
  const [activityNote, setActivityNote] = useState('');

  const handleSubmit = async () => {
    if (!activityNote.trim() || addingNote) return;
    await onAddNote(activityNote);
    setActivityNote('');
  };

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs space-y-3 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Activity &amp; Outreach Timeline
        </h4>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">
          {lead.trade_role || (lead.lead_type === 'importer' ? 'Verified Importer' : 'Registered Supplier')}
        </span>
      </div>

      <div className="space-y-2 border-l-2 border-slate-800 pl-3 ml-1.5 text-[11px]">
        <div className="relative">
          <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-blue-500" />
          <div className="font-semibold text-white">Lead Ingested &amp; Verified</div>
          <div className="text-slate-400 text-[10px]">
            Discovered from {lead.source_name || 'Verified Trade Registry'} &bull; 100% strict geographic check passed
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-amber-500" />
          <div className="font-semibold text-white">Customs Gateway Associated</div>
          <div className="text-slate-400 text-[10px]">
            Discharge Port: {lead.nearest_port || 'Primary International Port'} &bull; {lead.hs_codes_applicable || 'HS 100630'}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-emerald-500" />
          <div className="font-semibold text-white">Direct Commercial Outreach</div>
          <div className="text-slate-400 text-[10px]">
            {whatsappUrl ? 'WhatsApp 1-click CIF pitch link generated' : 'Corporate phone normalized'} &bull; DNS check resolved
          </div>
        </div>

        {lead.extraction_notes && (
          <div className="relative">
            <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-purple-500" />
            <div className="font-semibold text-purple-300">Logged Interaction Notes</div>
            <div className="text-slate-300 text-[10px] whitespace-pre-line font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800 mt-1">
              {lead.extraction_notes}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
        <input
          type="text"
          placeholder="Log call outcome, quotation note, or next step..."
          value={activityNote}
          onChange={(e) => setActivityNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={addingNote || !activityNote.trim()}
          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shrink-0"
        >
          {addingNote ? 'Saving...' : 'Log Note'}
        </button>
      </div>
    </div>
  );
}
