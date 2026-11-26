'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Users, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { CustomerLead, CompanyContact, OutreachEnrollment } from './dossierTypes';
import { fetchJson } from '@/lib/api';

export interface DossierEnrollModalProps {
  lead: CustomerLead | null;
  isOpen: boolean;
  onClose: () => void;
  initialContactId?: string | null;
  onSuccess?: () => void;
  isLight?: boolean;
  accentBgClass?: string;
  accentClasses?: {
    bg: string;
    bgHover: string;
    text: string;
    btn?: string;
  };
}

interface CampaignOption {
  campaign_id: string;
  name: string;
  channel?: string;
  status?: string;
}

export default function DossierEnrollModal({
  lead,
  isOpen,
  onClose,
  initialContactId,
  onSuccess,
  isLight = false,
  accentBgClass,
  accentClasses,
}: DossierEnrollModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [enrollmentMode, setEnrollmentMode] = useState<'all_contacts' | 'single_contact'>(
    initialContactId ? 'single_contact' : 'all_contacts'
  );
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>(initialContactId || '');
  const [existingEnrollments, setExistingEnrollments] = useState<OutreachEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasValidLeadId = Boolean(lead?.id && String(lead.id) !== '0');
  const resolvedAccentBg =
    accentBgClass ||
    (accentClasses ? `${accentClasses.bg} ${accentClasses.bgHover}` : 'bg-blue-600 hover:bg-blue-700');

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !lead) return;

    let active = true;
    setFeedback(null);
    setExistingEnrollments([]);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (initialContactId) {
      setEnrollmentMode('single_contact');
      setSelectedContactId(initialContactId);
    } else {
      setEnrollmentMode('all_contacts');
      setSelectedContactId('');
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [campRes, contactRes] = await Promise.all([
          fetchJson<{ campaigns: CampaignOption[] }>('/campaigns'),
          hasValidLeadId
            ? fetchJson<{ contacts: CompanyContact[] }>(`/leads/${lead.id}/contacts`)
            : Promise.resolve({ contacts: [] as CompanyContact[] }),
        ]);

        if (!active) return;

        const nextCampaigns = Array.isArray(campRes?.campaigns) ? campRes.campaigns : [];
        setCampaigns(nextCampaigns);
        setSelectedCampaignId((prev) =>
          prev && nextCampaigns.some((c) => c.campaign_id === prev)
            ? prev
            : nextCampaigns[0]?.campaign_id || ''
        );

        const realContacts = Array.isArray(contactRes?.contacts) ? contactRes.contacts : [];
        setContacts(realContacts);

        if (realContacts.length > 0) {
          const matchingInitial = initialContactId
            ? realContacts.find(
                (c) => String(c.contact_id || c.id || '') === String(initialContactId)
              )
            : null;
          const chosen = matchingInitial || realContacts[0];
          setSelectedContactId(String(chosen.contact_id || chosen.id || ''));
        } else {
          setSelectedContactId('');
        }
      } catch (err: any) {
        if (!active) return;
        setFeedback({
          type: 'error',
          message: err?.message || 'Failed to load campaigns or company contacts.',
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [isOpen, lead?.id, initialContactId, hasValidLeadId]);

  useEffect(() => {
    if (!isOpen || !lead || !hasValidLeadId || !selectedCampaignId) {
      setExistingEnrollments([]);
      return;
    }
    let active = true;
    const loadExisting = async () => {
      try {
        const res = await fetchJson<{ enrollments: (OutreachEnrollment & { lead_id?: string | number })[] }>(
          `/campaigns/${selectedCampaignId}/enrollments`
        );
        if (!active) return;
        const all = Array.isArray(res?.enrollments) ? res.enrollments : [];
        const matched = all.filter((e) => String(e.lead_id || '') === String(lead.id));
        setExistingEnrollments(matched);
      } catch {
        if (active) setExistingEnrollments([]);
      }
    };
    loadExisting();
    return () => {
      active = false;
    };
  }, [isOpen, lead?.id, hasValidLeadId, selectedCampaignId]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidLeadId) {
      setFeedback({ type: 'error', message: 'Link this deal to a directory lead before enrolling.' });
      return;
    }
    if (!selectedCampaignId) {
      setFeedback({ type: 'error', message: 'Please select an outreach campaign.' });
      return;
    }
    if (contacts.length === 0) {
      setFeedback({ type: 'error', message: 'No contacts linked to this company yet.' });
      return;
    }
    if (enrollmentMode === 'single_contact' && !selectedContactId) {
      setFeedback({ type: 'error', message: 'Please select a specific contact to enroll.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const payload: Record<string, any> = {
        lead_id: lead.id,
        enrollment_mode: enrollmentMode,
      };
      if (enrollmentMode === 'single_contact') {
        payload.contact_id = selectedContactId;
      }

      const res = await fetchJson<{ message?: string; enrolled_count?: number }>(
        `/campaigns/${selectedCampaignId}/enroll`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      setFeedback({
        type: 'success',
        message: res?.message || 'Successfully enrolled into campaign!',
      });

      closeTimerRef.current = setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to enroll in campaign. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || loading || !hasValidLeadId || campaigns.length === 0 || !selectedCampaignId || contacts.length === 0 || (enrollmentMode === 'single_contact' && !selectedContactId);

  const labelText = isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = isLight ? 'text-slate-500' : 'text-slate-400';
  const borderCol = isLight ? 'border-slate-200' : 'border-slate-800/60';
  const warnBox = isLight
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  const selectClass = isLight
    ? 'w-full bg-white border border-slate-300 text-slate-900 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 font-medium'
    : 'w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 font-medium';
  const radioCardInactive = isLight
    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
    : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40';

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${borderCol}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg text-white ${resolvedAccentBg}`}>
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Enroll in Campaign</h3>
              <p className={`text-xs ${mutedText}`}>{lead.company_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Close"
            aria-label="Close enrollment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
              feedback.type === 'success'
                ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {!hasValidLeadId && (
            <div className={`p-3 rounded-xl border text-xs ${warnBox}`}>
              This pipeline deal is not linked to a directory lead yet. Link it first to enroll contacts.
            </div>
          )}

          <div>
            <label className={`block font-semibold mb-1.5 ${labelText}`}>
              Select Target Campaign <span className="text-rose-500">*</span>
            </label>
            {loading ? (
              <div className={`p-2 text-xs flex items-center gap-2 ${mutedText}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Loading campaigns &amp; contacts...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className={`p-3 rounded-lg border ${warnBox}`}>
                No campaigns available. Create a campaign first.
              </div>
            ) : (
              <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)} className={selectClass}>
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.name} {c.channel ? `(${c.channel})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {existingEnrollments.length > 0 && (
            <div className={`p-2.5 rounded-xl border text-[11px] ${isLight ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-500/10 border-blue-500/30 text-blue-300'}`}>
              Already enrolled in this campaign ({existingEnrollments.length} record{existingEnrollments.length > 1 ? 's' : ''}). Re-enrolling will skip duplicates.
            </div>
          )}

          <div>
            <label className={`block font-semibold mb-2 ${labelText}`}>
              Select Enrollment Mode <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${enrollmentMode === 'all_contacts' ? 'border-blue-500 bg-blue-500/10' : radioCardInactive}`}>
                <input type="radio" name="enrollment_mode" value="all_contacts" checked={enrollmentMode === 'all_contacts'} onChange={() => setEnrollmentMode('all_contacts')} className="mt-0.5 text-blue-500" />
                <div className="flex-1">
                  <div className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>All Contacts of this Company ({contacts.length})</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${mutedText}`}>Enroll all contacts linked to this lead across all decision personas.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${enrollmentMode === 'single_contact' ? 'border-blue-500 bg-blue-500/10' : radioCardInactive}`}>
                <input type="radio" name="enrollment_mode" value="single_contact" checked={enrollmentMode === 'single_contact'} onChange={() => setEnrollmentMode('single_contact')} className="mt-0.5 text-blue-500" />
                <div className="flex-1">
                  <div className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <User className="w-4 h-4 text-emerald-500" />
                    <span>Single Specific Contact</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${mutedText}`}>Select and add a single specific contact from this organization.</p>
                </div>
              </label>
            </div>
          </div>

          {!loading && contacts.length === 0 && hasValidLeadId && (
            <div className={`p-3 rounded-xl border text-[11px] ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>
              No contacts found for {lead.company_name}. Discover contacts via RecruitIn X-Ray or add a contact in the Contacts tab first.
            </div>
          )}

          {enrollmentMode === 'single_contact' && (
            <div className={`p-3 rounded-xl border space-y-2 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/80'}`}>
              <label className={`block font-semibold text-[11px] ${labelText}`}>Choose Person from {lead.company_name}:</label>
              {contacts.length === 0 ? (
                <p className={`text-[11px] ${mutedText}`}>No contacts available to select.</p>
              ) : (
                <select value={selectedContactId} onChange={(e) => setSelectedContactId(e.target.value)} className={selectClass}>
                  <option value="">-- Select a contact --</option>
                  {contacts.map((c) => {
                    const cid = String(c.contact_id || c.id || '');
                    return (
                      <option key={cid} value={cid}>
                        {c.full_name} — {c.role_at_company || c.job_title || 'Trade Contact'}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${borderCol}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl transition ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`px-5 py-2 rounded-xl font-semibold text-white ${resolvedAccentBg} shadow-md transition disabled:opacity-50`}
            >
              {submitting ? 'Enrolling...' : 'Confirm Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
