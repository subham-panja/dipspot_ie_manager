'use client';

import React from 'react';
import { ArrowLeft, Building2, Tag, Edit2, Trash2, X, Maximize2, Minimize2 } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierHeaderProps {
  lead: CustomerLead;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSoftDelete: () => void;
  onClose: () => void;
  isFullPage: boolean;
  onToggleFullPage: () => void;
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
  isFullPage,
  onToggleFullPage,
  isLight,
  accentGradient,
  accentBadgeBg,
}: DossierHeaderProps) {
  return (
    <div
      className={`p-4 border-b flex items-center justify-between gap-3 flex-wrap ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onClose}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition shrink-0 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
          aria-label="Back to leads list"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accentGradient} flex items-center justify-center text-white shadow-sm shrink-0`}
        >
          <Building2 className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                lead.lead_type === 'importer'
                  ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {lead.lead_type === 'importer' ? 'Global Importer' : 'Verified Supplier'}
            </span>

            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${accentBadgeBg}`}>
              Score: {lead.priority_score}/100
            </span>

            {lead.custom_label && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 font-bold ${
                  isLight
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {lead.custom_label}
              </span>
            )}

            {lead.merge_count && lead.merge_count > 1 ? (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                }`}
              >
                Merged x{lead.merge_count}
              </span>
            ) : null}
          </div>

          <h2 className={`text-base font-bold mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {lead.company_name}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleFullPage}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
            isFullPage
              ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              : 'bg-slate-800 text-slate-200 hover:text-white border-slate-700 hover:bg-slate-700'
          }`}
          aria-label={isFullPage ? 'Back to drawer view' : 'Open full-page view'}
          title={isFullPage ? 'Back to Drawer' : 'Full Page'}
        >
          {isFullPage ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullPage ? 'Back to Drawer' : 'Full Page'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleEdit}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
            isEditing
              ? 'bg-purple-500 text-white border-purple-400'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
          }`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Cancel Edit' : 'Edit Lead'}</span>
        </button>

        <button
          type="button"
          onClick={onSoftDelete}
          className={`p-1.5 rounded-lg transition ${
            isLight
              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
          }`}
          title="Soft-delete lead"
          aria-label="Soft-delete lead"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-lg transition ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Close dossier"
          aria-label="Close dossier"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
