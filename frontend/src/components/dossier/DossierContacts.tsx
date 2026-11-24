'use client';

import React from 'react';
import { MapPin, MessageSquare, ExternalLink } from 'lucide-react';
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
  const firstPhone = lead.phones?.split(';')[0]?.split(',')[0]?.trim();
  const cleanWaNumber = firstPhone?.replace(/[^0-9]/g, '');
  const firstEmail = lead.emails?.split(';')[0]?.split(',')[0]?.trim();

  const linkedinUrl =
    lead.linkedin_search_url ||
    `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
      lead.company_name + ' Purchase Manager'
    )}`;
  const whatsappUrl =
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
            Verified Contact Dossier
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
          {lead.contact_person && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Contact Executive:</span>
              <div className="flex items-center gap-2">
                <strong className={isLight ? 'text-slate-800' : 'text-white'}>{lead.contact_person}</strong>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-semibold flex items-center gap-1 transition"
                  title="Search Purchase Manager on LinkedIn"
                >
                  <span>in</span>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>
          )}

          {firstPhone && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Direct Phone:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-white">{firstPhone}</span>
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

          {firstEmail && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Direct Email:</span>
              <a
                href={`mailto:${firstEmail}`}
                className={`font-mono text-xs ${accentTextClass} hover:underline truncate max-w-[200px]`}
              >
                {firstEmail}
              </a>
            </div>
          )}

          {lead.website && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Corporate Web:</span>
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

          {lead.address && (
            <div className="pt-2 border-t border-slate-800/60 text-[11px]">
              <span className="text-slate-400 block mb-0.5">Physical Facility / Office:</span>
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
