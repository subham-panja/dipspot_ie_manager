'use client';

import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { TrashLead } from './settingsTypes';

interface TrashBinTabProps {
  trashLeads: TrashLead[];
  loadingTrash: boolean;
  onRefresh: () => void;
  onRestore: (id: string | number) => void;
  onPermanentDelete: (id: string | number) => void;
  isLight: boolean;
}

export default function TrashBinTab({
  trashLeads,
  loadingTrash,
  onRefresh,
  onRestore,
  onPermanentDelete,
  isLight,
}: TrashBinTabProps) {
  return (
    <div
      className={`p-6 rounded-2xl border space-y-6 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Soft-Delete Trash Bin & Audit Recovery
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deleted leads are safely retained here. You can restore them to active directory or permanently purge them.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loadingTrash}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingTrash ? 'animate-spin' : ''}`} />
          Refresh Trash
        </button>
      </div>

      {trashLeads.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-slate-800">
          <Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">Trash bin is currently empty.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">No soft-deleted leads pending recovery.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Deleted At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {trashLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-white">{lead.company_name}</td>
                  <td className="py-3 px-4 text-slate-300">{lead.country}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                      {lead.lead_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{lead.deleted_at || 'Recently'}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onRestore(lead.id)}
                      className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold hover:bg-emerald-500/20"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => onPermanentDelete(lead.id)}
                      className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold hover:bg-rose-500/20"
                    >
                      Purge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
