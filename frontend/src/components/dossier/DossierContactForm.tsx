'use client';

import React, { useState } from 'react';
import { Search, Link2 } from 'lucide-react';
import { fetchJson } from '@/lib/api';
import { CompanyContact } from './dossierTypes';

interface DossierContactFormProps {
  leadId: string | number;
  isLight: boolean;
  onSuccess: () => Promise<void>;
  onError: (msg: string | null) => void;
}

export default function DossierContactForm({
  leadId,
  isLight,
  onSuccess,
  onError,
}: DossierContactFormProps) {
  const [addMode, setAddMode] = useState<'new' | 'link'>('new');
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    full_name: '',
    job_title: '',
    email: '',
    phone: '',
    linkedin_profile_url: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanyContact[]>([]);
  const [searching, setSearching] = useState(false);

  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';
  const inputClass = isLight
    ? 'w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none'
    : 'w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 outline-none';

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!formState.full_name.trim() && !formState.email.trim() && !formState.linkedin_profile_url.trim()) {
      onError('Provide at least a full name, email, or LinkedIn URL.');
      return;
    }
    try {
      setSubmitting(true);
      onError(null);
      await fetchJson(`/leads/${leadId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({
          full_name: formState.full_name.trim(),
          job_title: formState.job_title.trim(),
          role_at_company: formState.job_title.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          linkedin_profile_url: formState.linkedin_profile_url.trim(),
          source: 'manual',
        }),
      });
      setFormState({ full_name: '', job_title: '', email: '', phone: '', linkedin_profile_url: '' });
      await onSuccess();
    } catch (err: any) {
      onError(err?.message || 'Failed to create contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchExisting = async () => {
    if (!searchQuery.trim() || searching) return;
    try {
      setSearching(true);
      onError(null);
      const res = await fetchJson<{ contacts: CompanyContact[] }>(
        `/contacts?q=${encodeURIComponent(searchQuery.trim())}`
      );
      setSearchResults(Array.isArray(res?.contacts) ? res.contacts : []);
    } catch (err: any) {
      onError(err?.message || 'Contact search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleLinkExisting = async (contactId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      onError(null);
      await fetchJson(`/leads/${leadId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contact_id: contactId }),
      });
      await onSuccess();
    } catch (err: any) {
      onError(err?.message || 'Failed to link contact.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`p-3 rounded-xl border space-y-2.5 ${cardBg}`}>
      <div className="flex gap-2 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setAddMode('new')}
          className={`px-2.5 py-1 rounded-lg ${addMode === 'new' ? 'bg-blue-600 text-white' : textMuted}`}
        >
          Create New Contact
        </button>
        <button
          type="button"
          onClick={() => setAddMode('link')}
          className={`px-2.5 py-1 rounded-lg ${addMode === 'link' ? 'bg-blue-600 text-white' : textMuted}`}
        >
          Link Existing Contact
        </button>
      </div>

      {addMode === 'new' ? (
        <form onSubmit={handleCreateContact} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Full name"
            value={formState.full_name}
            onChange={(e) => setFormState({ ...formState, full_name: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Job title / role"
            value={formState.job_title}
            onChange={(e) => setFormState({ ...formState, job_title: e.target.value })}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email"
            value={formState.email}
            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Phone"
            value={formState.phone}
            onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
            className={inputClass}
          />
          <input
            type="url"
            placeholder="LinkedIn profile URL (https://www.linkedin.com/in/...)"
            value={formState.linkedin_profile_url}
            onChange={(e) => setFormState({ ...formState, linkedin_profile_url: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          />
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save & Link Contact'}
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Search contacts by name, email, or LinkedIn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleSearchExisting}
              disabled={searching}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              <span>Find</span>
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {searchResults.map((item) => (
                <div
                  key={item.contact_id || item.id}
                  className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs ${cardBg}`}
                >
                  <div className="min-w-0">
                    <div className={`font-semibold truncate ${textPrimary}`}>{item.full_name}</div>
                    <div className={`text-[10px] truncate ${textMuted}`}>
                      {item.job_title || item.email || 'No title'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLinkExisting(item.contact_id || item.id)}
                    disabled={submitting}
                    className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>Link</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
