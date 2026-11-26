'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  Globe,
  MapPin,
  CheckCircle2,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { fetchJson } from '@/lib/api';
import { CompanyContact, CustomerLead } from './dossierTypes';
import DossierContactForm from './DossierContactForm';

interface DossierContactsProps {
  lead: CustomerLead;
  isLight: boolean;
  accentTextClass: string;
  refreshToken?: number;
  onEnrollContact?: (contact: CompanyContact) => void;
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

export default function DossierContacts({
  lead,
  isLight,
  accentTextClass,
  refreshToken = 0,
  onEnrollContact,
}: DossierContactsProps) {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  const hasValidLeadId = Boolean(lead.id && String(lead.id) !== '0');

  const loadContacts = async (targetId = lead.id) => {
    const seq = ++requestSeqRef.current;
    if (!targetId || String(targetId) === '0') {
      setContacts([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetchJson<{ contacts: CompanyContact[] }>(`/leads/${targetId}/contacts`);
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setContacts(Array.isArray(res?.contacts) ? res.contacts : []);
    } catch (err: any) {
      if (!isMountedRef.current || seq !== requestSeqRef.current) return;
      setContacts([]);
      setError(err?.message || 'Unable to load contacts for this company.');
    } finally {
      if (isMountedRef.current && seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setShowAddPanel(false);
    setContacts([]);
    setError(null);
    loadContacts(lead.id);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [lead.id, refreshToken]);

  const handleUnlink = async (contactId: string) => {
    if (!hasValidLeadId) return;
    const targetId = lead.id;
    try {
      setError(null);
      await fetchJson(`/leads/${targetId}/contacts/${contactId}`, { method: 'DELETE' });
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      await loadContacts(targetId);
    } catch (err: any) {
      if (!isMountedRef.current || String(lead.id) !== String(targetId)) return;
      setError(err?.message || 'Failed to unlink contact.');
    }
  };

  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';

  const safeWebsite = safeHttpUrl(lead.website);
  const safeContactPage = safeHttpUrl(lead.contact_page_url || lead.corporate_contact_page_url);
  const safeMapsUrl =
    safeHttpUrl(lead.google_maps_url) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lead.company_name} ${lead.city_or_hub || lead.country || ''}`
    )}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${textMuted}`}>
          <Users className="w-3.5 h-3.5 text-blue-500" />
          <span>Company Contacts ({contacts.length})</span>
        </h4>
        {hasValidLeadId && (
          <button
            type="button"
            onClick={() => setShowAddPanel((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>{showAddPanel ? 'Close' : 'Add / Link Contact'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px]">
          {error}
        </div>
      )}

      {showAddPanel && hasValidLeadId && (
        <DossierContactForm
          leadId={lead.id}
          isLight={isLight}
          onSuccess={async () => {
            setShowAddPanel(false);
            await loadContacts();
          }}
          onError={setError}
        />
      )}

      {!hasValidLeadId ? (
        <div className={`p-3 rounded-xl border text-xs ${cardBg} ${textMuted}`}>
          This pipeline deal is not linked to a directory lead yet. Link it in Importers/Suppliers to manage contacts.
        </div>
      ) : loading ? (
        <div className={`py-6 text-center text-xs flex items-center justify-center gap-2 ${textMuted}`}>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Loading company contacts...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className={`p-4 rounded-xl border text-center text-xs space-y-1 ${cardBg} ${textMuted}`}>
          <p>No individual contacts linked to {lead.company_name} yet.</p>
          <p className="text-[11px]">Run RecruitIn X-Ray Search above or click &ldquo;Add / Link Contact&rdquo;.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {contacts.map((c) => {
            const cid = c.contact_id || c.id;
            const liUrl = safeHttpUrl(c.linkedin_profile_url);
            const waUrl = safeHttpUrl(c.whatsapp_url);
            return (
              <div key={cid} className={`p-3 rounded-xl border text-xs space-y-2 ${cardBg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className={`text-xs ${textPrimary}`}>{c.full_name}</strong>
                      {c.is_primary && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                          Primary
                        </span>
                      )}
                      {c.verified && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Verified
                        </span>
                      )}
                      {c.source && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            isLight
                              ? 'bg-slate-100 border-slate-200 text-slate-600'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {c.source}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${textMuted}`}>
                      {c.job_title || c.role_at_company || 'Role not specified'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {liUrl ? (
                      <a
                        href={liUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <span>LinkedIn</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className={`text-[10px] ${textMuted}`}>No LinkedIn URL</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUnlink(cid)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                      title="Unlink contact from company"
                      aria-label={`Unlink ${c.full_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className={`flex items-center gap-1 hover:underline ${accentTextClass}`}>
                      <Mail className="w-3 h-3" />
                      <span>{c.email}</span>
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/\s+/g, '')}`}
                      className={`flex items-center gap-1 font-mono ${textMuted} hover:text-emerald-400`}
                    >
                      <Phone className="w-3 h-3 text-emerald-500" />
                      <span>{c.phone}</span>
                    </a>
                  )}
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {c.companies && c.companies.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-semibold text-purple-400">
                      Also linked ({c.companies.length} companies):
                    </span>
                    {c.companies.map((comp) => (
                      <span
                        key={String(comp.lead_id)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      >
                        {comp.company_name}
                      </span>
                    ))}
                  </div>
                )}

                {onEnrollContact && (
                  <div
                    className={`pt-1.5 border-t flex justify-end ${
                      isLight ? 'border-slate-200' : 'border-slate-800/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onEnrollContact(c)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Megaphone className="w-3 h-3" />
                      <span>Enroll Contact</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Company Channels & Physical Facility */}
      <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${cardBg}`}>
        <div className={`font-bold uppercase tracking-wider text-[10px] ${textMuted}`}>
          Company Channels &amp; Facility
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {safeWebsite && (
            <a
              href={safeWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              <span>Website</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {safeContactPage && (
            <a
              href={safeContactPage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Contact Page</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <a
            href={safeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            <span>Google Maps POI</span>
          </a>
        </div>
        {lead.address && (
          <div className={textMuted}>
            Address: <span className={textPrimary}>{lead.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
