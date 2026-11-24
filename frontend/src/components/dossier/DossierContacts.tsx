'use client';

import React from 'react';
import { MapPin, MessageSquare, ExternalLink, Mail, Phone, Globe } from 'lucide-react';
import { CustomerLead } from './dossierTypes';
import AuditMergeTrail from './AuditMergeTrail';

interface DossierContactsProps {
  lead: CustomerLead;
  isLight: boolean;
  accentTextClass: string;
}

export default function DossierContacts({
  lead,
  isLight,
  accentTextClass,
}: DossierContactsProps) {
  const rawEmails = (lead.emails || '').split(';').map((e) => e.trim()).filter(Boolean);
  const primaryEmail = lead.primary_email || rawEmails[0] || (lead.emails?.split(',')[0]?.trim());
  const secondaryEmail =
    lead.secondary_email ||
    (rawEmails.length > 1 ? rawEmails[1] : undefined);

  const rawPhones = (lead.phones || '').split(';').map((p) => p.trim()).filter(Boolean);
  const directPhone = lead.direct_phone || rawPhones[0] || (lead.phones?.split(',')[0]?.trim());
  const cleanWaNumber = directPhone?.replace(/[^0-9]/g, '');

  const linkedinPersona = lead.linkedin_profile_url || lead.linkedin_persona_url;
  const linkedinSearchFallback =
    lead.linkedin_search_url ||
    `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
      lead.company_name + ' Purchase Manager'
    )}`;

  const contactDeskUrl = lead.contact_page_url || lead.corporate_contact_page_url;

  const whatsappUrl =
    lead.whatsapp_url ||
    lead.whatsapp_outreach_url ||
    (cleanWaNumber
      ? `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
          `Dear ${lead.contact_person || lead.company_name} team, we are direct rice millers supplying premium 1-3 FCL consignments of IR-64 and Basmati landing at ${
            lead.nearest_port || 'your discharge port'
          }. Could we share our CIF quotation?`
        )}`
      : undefined);

  const mapsUrl =
    lead.google_maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      lead.company_name + ' ' + (lead.city_or_hub || lead.country)
    )}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Multi-Channel Communication Sources
          </h3>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <MapPin className="w-3 h-3" />
              <span>Google Maps POI</span>
            </a>
          )}
        </div>

        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          {/* 1. Contact Person & LinkedIn Persona / Search */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <span>Contact Executive:</span>
            </span>
            <div className="flex items-center gap-2">
              <strong className={isLight ? 'text-slate-800' : 'text-white'}>
                {lead.contact_person || 'Purchase Manager'}
              </strong>
              {linkedinPersona ? (
                <a
                  href={linkedinPersona}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold flex items-center gap-1 transition border border-blue-500/30"
                  title="Verified Decision-Maker LinkedIn Persona Profile"
                >
                  <span>in</span>
                  <span>Persona</span>
                </a>
              ) : (
                <a
                  href={linkedinSearchFallback}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-semibold flex items-center gap-1 transition"
                  title="Search Purchase Manager on LinkedIn"
                >
                  <span>in</span>
                  <span>LinkedIn</span>
                </a>
              )}
              {lead.github_url && (
                <a
                  href={lead.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition border border-slate-700"
                  title="GitHub Profile"
                >
                  <span>GitHub</span>
                </a>
              )}
            </div>
          </div>

          {/* 2. Direct Telephone */}
          {directPhone && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>Direct Telephone:</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${directPhone.replace(/\s+/g, '')}`}
                  className="font-mono font-medium text-white hover:text-emerald-400 transition"
                  title="Click to Call"
                >
                  {directPhone}
                </a>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-sm"
                    title="Open 1-Click WhatsApp CIF Outreach"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 3. Primary Email */}
          {primaryEmail && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-400" />
                <span>Primary Email:</span>
              </span>
              <a
                href={`mailto:${primaryEmail}`}
                className={`font-mono text-xs ${accentTextClass} hover:underline truncate max-w-[200px]`}
                title="Send Email"
              >
                {primaryEmail}
              </a>
            </div>
          )}

          {/* 4. Secondary / Inbox Email */}
          {secondaryEmail && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Mail className="w-3 h-3 text-purple-400" />
                <span>Secondary / Inbox Email:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={`mailto:${secondaryEmail}`}
                  className="font-mono text-xs text-purple-300 hover:underline truncate max-w-[190px]"
                  title="Secondary Inbox Email"
                >
                  {secondaryEmail}
                </a>
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Inbox
                </span>
              </div>
            </div>
          )}

          {/* 5. Corporate Contact Desk Page */}
          {contactDeskUrl && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <ExternalLink className="w-3 h-3 text-purple-400" />
                <span>Contact Desk:</span>
              </span>
              <a
                href={contactDeskUrl.startsWith('http') ? contactDeskUrl : `https://${contactDeskUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                title="Corporate Contact Page"
              >
                <span className="truncate max-w-[190px]">{contactDeskUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* 6. Corporate Website */}
          {lead.website && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>Corporate Web:</span>
              </span>
              <a
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <span className="truncate max-w-[180px]">{lead.website}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Social Profiles */}
          {lead.twitter_url && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Twitter / X:</span>
              <a
                href={lead.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <span className="truncate max-w-[180px]">{lead.twitter_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {lead.facebook_url && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Facebook Page:</span>
              <a
                href={lead.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <span className="truncate max-w-[180px]">{lead.facebook_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {lead.linkedin_company_url && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">LinkedIn Company:</span>
              <a
                href={lead.linkedin_company_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <span className="truncate max-w-[180px]">{lead.linkedin_company_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* 7. Physical Facility / Address */}
          {lead.address && (
            <div className="pt-2 border-t border-slate-800/60 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Physical Facility / Office:</span>
              </span>
              <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{lead.address}</span>
            </div>
          )}

          {lead.source_name && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
              <span className="text-slate-400">Verified Manifest Source:</span>
              {lead.source_url ? (
                <a
                  href={lead.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                >
                  <span className="truncate max-w-[170px]">{lead.source_name}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-amber-300 font-medium">{lead.source_name}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <AuditMergeTrail mergedHistory={lead.merged_history} />
    </div>
  );
}
