'use client';

import React from 'react';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { LeadItem } from './leadTypes';
import LeadTableRow from './LeadTableRow';

interface LeadTableProps {
  leads: LeadItem[];
  loading: boolean;
  selectedIds: Set<number>;
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: number) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  page: number;
  pages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onSelectDossier: (lead: LeadItem) => void;
  onConvertToDeal: (lead: LeadItem) => void;
  isLight: boolean;
  accentBgClass: string;
}

export default function LeadTable({
  leads,
  loading,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  sortBy,
  onSortChange,
  page,
  pages,
  total,
  onPageChange,
  onSelectDossier,
  onConvertToDeal,
  isLight,
  accentBgClass,
}: LeadTableProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden border shadow-sm transition ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className={`border-b font-semibold tracking-wider uppercase text-[10px] ${
                isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <th className="py-3 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={leads.length > 0 && selectedIds.size === leads.length}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500 cursor-pointer w-3.5 h-3.5"
                />
              </th>
              <th
                className="py-3 px-4 cursor-pointer select-none"
                onClick={() => onSortChange(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')}
              >
                <div className="flex items-center gap-1">
                  <span>Importer Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3">Port &amp; Country</th>
              <th className="py-3 px-3">Key Contact</th>
              <th className="py-3 px-3">Direct Phone</th>
              <th className="py-3 px-3">Target Goods</th>
              <th
                className="py-3 px-2 text-center cursor-pointer select-none"
                onClick={() => onSortChange(sortBy === 'score_desc' ? 'score_asc' : 'score_desc')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Score</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                  Loading verified buyers...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  No importers found matching criteria.
                </td>
              </tr>
            ) : (
              leads.map((cust) => (
                <LeadTableRow
                  key={cust.id}
                  cust={cust}
                  isSelected={selectedIds.has(cust.id)}
                  onToggleSelect={onToggleSelectRow}
                  onSelectDossier={onSelectDossier}
                  onConvertToDeal={onConvertToDeal}
                  isLight={isLight}
                  accentBgClass={accentBgClass}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-800/40 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing Page {page} of {pages} ({total} Total Importers)
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-300 transition"
          >
            Previous
          </button>
          <button
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-300 transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
