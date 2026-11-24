'use client';

import React from 'react';
import {
  Factory,
  ShieldCheck,
  MapPin,
  Tag,
  Mail,
  Phone,
  CheckCircle,
  ArrowUpDown,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { LeadItem } from './leadTypes';

interface SupplierTableProps {
  suppliers: LeadItem[];
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
  onSelectDossier: (supplier: LeadItem) => void;
  onConvertToContract: (supplier: LeadItem) => void;
  isLight: boolean;
}

export default function SupplierTable({
  suppliers,
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
  onConvertToContract,
  isLight,
}: SupplierTableProps) {
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
                  checked={suppliers.length > 0 && selectedIds.size === suppliers.length}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 cursor-pointer w-3.5 h-3.5"
                />
              </th>
              <th
                className="py-3 px-4 cursor-pointer select-none"
                onClick={() => onSortChange(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')}
              >
                <div className="flex items-center gap-1">
                  <span>Facility Legal Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3">Production Cluster</th>
              <th className="py-3 px-3">Commercial Contact</th>
              <th className="py-3 px-3">Milling Specialty</th>
              <th
                className="py-3 px-2 text-center cursor-pointer select-none"
                onClick={() => onSortChange(sortBy === 'score_desc' ? 'score_asc' : 'score_desc')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Score</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" />
                  Loading verified suppliers &amp; mills...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No suppliers found matching the criteria.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => {
                const isSelected = selectedIds.has(s.id);
                const rawEmails = (s.emails || s.email || '').split(';').map((e) => e.trim()).filter(Boolean);
                const primaryEmail = s.primary_email || rawEmails[0];
                const secondaryEmail = s.secondary_email || (rawEmails.length > 1 ? rawEmails[1] : undefined);

                const rawPhones = (s.phones || s.phone || '').split(';').map((p) => p.trim()).filter(Boolean);
                const directPhone = s.direct_phone || rawPhones[0];
                const cleanPhoneDigits = directPhone?.replace(/[^0-9]/g, '');
                const whatsappUrl =
                  s.whatsapp_url ||
                  s.whatsapp_outreach_url ||
                  (cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits}` : undefined);

                const linkedinPersona = s.linkedin_profile_url || s.linkedin_persona_url;
                const contactDeskUrl = s.contact_page_url || s.corporate_contact_page_url;

                return (
                  <tr
                    key={s.id}
                    className={`transition ${isSelected ? 'bg-emerald-500/10' : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="py-3 px-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectRow(s.id)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div
                          onClick={() => onSelectDossier(s)}
                          className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
                            isLight ? 'text-slate-900 hover:text-emerald-600' : 'text-white hover:text-emerald-400'
                          }`}
                        >
                          <Factory className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{s.company_name}</span>
                          <span title="Verified Producer Facility">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {s.gstin && (
                            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <span>GSTIN:</span>
                              <span>{s.gstin}</span>
                            </div>
                          )}
                          {s.twitter_url && (
                            <a
                              href={s.twitter_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-sky-400 hover:text-sky-300 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 flex items-center gap-1"
                              title="Twitter / X Corporate Handle"
                            >
                              <span>𝕏 Profile</span>
                            </a>
                          )}
                          {linkedinPersona ? (
                            <a
                              href={linkedinPersona}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-[#0a66c2] hover:underline font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1"
                              title="Verified Decision-Maker LinkedIn Persona Profile"
                            >
                              <span>in Persona</span>
                            </a>
                          ) : s.linkedin_search_url ? (
                            <a
                              href={s.linkedin_search_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-[#0a66c2] hover:underline font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1"
                              title="Find Purchase Manager on LinkedIn"
                            >
                              <span>in Search</span>
                            </a>
                          ) : null}
                          {contactDeskUrl && (
                            <a
                              href={contactDeskUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-purple-400 hover:underline font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1"
                              title="Corporate Website Contact Desk Page"
                            >
                              <span>Contact Desk</span>
                            </a>
                          )}
                          {s.github_url && (
                            <a
                              href={s.github_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-slate-300 hover:underline font-bold bg-slate-700/40 px-1.5 py-0.5 rounded border border-slate-600/40 flex items-center gap-1"
                              title="GitHub Profile"
                            >
                              <span>GitHub</span>
                            </a>
                          )}
                          {s.google_maps_url && (
                            <a
                              href={s.google_maps_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-emerald-400 hover:underline font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>Map POI</span>
                            </a>
                          )}
                          {s.custom_label && (
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-slate-500" />
                              <span>{s.custom_label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-400">
                      <div className="font-medium text-slate-200">
                        {s.district || s.city_or_hub || 'Regional Hub'}, {s.state || s.country || 'India'}
                      </div>
                      {s.address && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px] flex items-center gap-1 mt-0.5" title={s.address}>
                          <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">
                        {s.contact_person || 'Plant Procurement Head'}
                      </div>
                      {directPhone && (
                        <div>
                          <a
                            href={`tel:${directPhone.replace(/\s+/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 font-mono mt-0.5"
                            title="Click to Call"
                          >
                            <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{directPhone}</span>
                          </a>
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition w-fit font-sans"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 shrink-0" />
                              <span>WhatsApp Supplier</span>
                            </a>
                          )}
                        </div>
                      )}
                      {primaryEmail && (
                        <a
                          href={`mailto:${primaryEmail}`}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 truncate max-w-[170px] mt-0.5"
                          title="Primary Email"
                        >
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{primaryEmail}</span>
                        </a>
                      )}
                      {secondaryEmail && (
                        <a
                          href={`mailto:${secondaryEmail}`}
                          className="text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 truncate max-w-[170px] mt-0.5"
                          title="Secondary / Inbox Email"
                        >
                          <Mail className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span className="truncate">{secondaryEmail} (Inbox)</span>
                        </a>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-300 max-w-[200px]" title={s.matched_varieties}>
                      <div className="truncate font-medium">{s.matched_varieties || 'Non-Basmati & Parboiled Grains'}</div>
                      {s.fssai_or_sfda_status && (
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>{s.fssai_or_sfda_status}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          s.priority_score >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.priority_score || 85}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectDossier(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                        >
                          Dossier
                        </button>
                        <button
                          onClick={() => onConvertToContract(s)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition"
                        >
                          + Contract
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-800/40 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing Page {page} of {pages} ({total} Total Suppliers)
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
