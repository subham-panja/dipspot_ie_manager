'use client';

import React from 'react';
import { Building2, Tag, Edit2, Trash2, X } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierHeaderProps {
  lead: CustomerLead;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSoftDelete: () => void;
  onClose: () => void;
  isLight: boolean;
  accentGradient: string;
  accentBadgeBg: string;
}

export default function DossierHeader({
  lead,
  isEditing,
  onToggleEdit,
  onSoftDelete,
  onClose,
  isLight,
  accentGradient,
  accentBadgeBg,
}: DossierHeaderProps) {
  return (
    <div
      className={`p-4 border-b flex items-center justify-between ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accentGradient} flex items-center justify-center text-white shadow-sm`}
        >
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                lead.lead_type === 'importer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {lead.lead_type === 'importer' ? 'Global Importer' : 'Verified Supplier'}
            </span>

            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${accentBadgeBg}`}>
              Score: {lead.priority_score}/100
            </span>

            {lead.custom_label && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-bold">
                <Tag className="w-2.5 h-2.5" />
                {lead.custom_label}
              </span>
            )}

            {lead.merge_count && lead.merge_count > 1 ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Merged x{lead.merge_count}
              </span>
            ) : null}
          </div>

          <h2 className={`text-base font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {lead.company_name}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleEdit}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
            isEditing
              ? 'bg-purple-500 text-white border-purple-400'
              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
          }`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Cancel Edit' : 'Edit Lead'}</span>
        </button>

        <button
          onClick={onSoftDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          title="Soft-delete lead"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
