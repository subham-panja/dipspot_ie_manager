'use client';

import React from 'react';
import {
  Building2,
  ShieldCheck,
  Ship,
  MapPin,
  ExternalLink,
  Tag,
  Mail,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { LeadItem } from './leadTypes';

interface LeadTableRowProps {
  cust: LeadItem;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onSelectDossier: (lead: LeadItem) => void;
  onConvertToDeal: (lead: LeadItem) => void;
  isLight: boolean;
  accentBgClass: string;
}

export default function LeadTableRow({
  cust,
  isSelected,
  onToggleSelect,
  onSelectDossier,
  onConvertToDeal,
  isLight,
  accentBgClass,
}: LeadTableRowProps) {
  const rawEmails = (cust.emails || cust.email || '').split(';').map((e) => e.trim()).filter(Boolean);
  const primaryEmail = cust.primary_email || rawEmails[0];
  const secondaryEmail = cust.secondary_email || (rawEmails.length > 1 ? rawEmails[1] : undefined);

  const rawPhones = (cust.phones || cust.phone || '').split(';').map((p) => p.trim()).filter(Boolean);
  const directPhone = cust.direct_phone || rawPhones[0];
  const cleanPhoneDigits = directPhone?.replace(/[^0-9]/g, '');
  const whatsappUrl =
    cust.whatsapp_url ||
    cust.whatsapp_outreach_url ||
    (cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits}` : undefined);

  const linkedinPersona = cust.linkedin_profile_url || cust.linkedin_persona_url;
  const contactDeskUrl = cust.contact_page_url || cust.corporate_contact_page_url;

  return (
    <tr
      className={`transition ${
        isSelected ? 'bg-blue-500/10' : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
      }`}
    >
      <td className="py-3 px-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(cust.id)}
          className="rounded border-slate-700 bg-slate-900 text-blue-500 cursor-pointer w-3.5 h-3.5"
        />
      </td>

      <td className="py-3 px-4">
        <div className="space-y-0.5">
          <div
            onClick={() => onSelectDossier(cust)}
            className={`font-bold hover:underline cursor-pointer flex items-center gap-1.5 ${
              isLight ? 'text-slate-900 hover:text-blue-600' : 'text-white hover:text-blue-400'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{cust.company_name}</span>
            <span title="Verified Trade Entity">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {cust.shipment_volume && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-medium">
                <Ship className="w-2.5 h-2.5 shrink-0" />
                <span>{cust.shipment_volume}</span>
              </div>
            )}

            {cust.twitter_url && (
              <a
                href={cust.twitter_url}
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
            ) : cust.linkedin_search_url ? (
              <a
                href={cust.linkedin_search_url}
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

            {cust.github_url && (
              <a
                href={cust.github_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-slate-300 hover:underline font-bold bg-slate-700/40 px-1.5 py-0.5 rounded border border-slate-600/40 flex items-center gap-1"
                title="GitHub Profile"
              >
                <span>GitHub</span>
              </a>
            )}

            {cust.google_maps_url && (
              <a
                href={cust.google_maps_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-emerald-400 hover:underline font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"
                title="View on Google Maps"
              >
                <MapPin className="w-2.5 h-2.5" />
                <span>Map POI</span>
              </a>
            )}
          </div>

          {cust.website && (
            <a
              href={cust.website.startsWith('http') ? cust.website : `https://${cust.website}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[180px]">
                {cust.website.replace(/^https?:\/\/(www\.)?/, '')}
              </span>
            </a>
          )}
          {cust.custom_label && (
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Tag className="w-2.5 h-2.5 text-slate-500" />
              <span>{cust.custom_label}</span>
            </div>
          )}
        </div>
      </td>

      <td className="py-3 px-3 text-slate-400">
        <div className="font-medium text-slate-200">
          {cust.city ? `${cust.city}, ` : cust.city_or_hub ? `${cust.city_or_hub}, ` : ''}
          {cust.country}
        </div>
        {cust.nearest_port && (
          <div
            className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5 truncate max-w-[190px]"
            title={cust.nearest_port}
          >
            <Ship className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{cust.nearest_port.split('(')[0].trim()}</span>
          </div>
        )}
        {cust.address && (
          <div className="text-[10px] text-slate-500 truncate max-w-[180px] flex items-center gap-1 mt-0.5" title={cust.address}>
            <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <span className="truncate">{cust.address}</span>
          </div>
        )}
      </td>

      <td className="py-3 px-3">
        <div className="font-medium text-slate-200">
          {cust.contact_person || 'Purchase Manager'}
        </div>
        {primaryEmail && (
          <a
            href={`mailto:${primaryEmail}`}
            className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 truncate max-w-[180px] mt-0.5"
            title="Primary Email"
          >
            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{primaryEmail}</span>
          </a>
        )}
        {secondaryEmail && (
          <a
            href={`mailto:${secondaryEmail}`}
            className="text-[10px] text-slate-400 hover:text-blue-300 flex items-center gap-1 truncate max-w-[180px] mt-0.5"
            title="Secondary / Inbox Email"
          >
            <Mail className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <span className="truncate">{secondaryEmail} (Inbox)</span>
          </a>
        )}
      </td>

      <td className="py-3 px-3 font-mono text-slate-300">
        {directPhone ? (
          <div>
            <a
              href={`tel:${directPhone.replace(/\s+/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] hover:text-emerald-400 transition"
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
                title="Message on WhatsApp with pre-filled CIF quote intro"
              >
                <MessageCircle className="w-3 h-3 shrink-0" />
                <span>WhatsApp Buyer</span>
              </a>
            )}
          </div>
        ) : (
          <span className="text-slate-600 text-[11px]">N/A</span>
        )}
      </td>

      <td className="py-3 px-3 text-slate-300 max-w-[200px]" title={cust.matched_varieties}>
        <div className="truncate font-medium">{cust.matched_varieties || 'Commodity Grains'}</div>
        {cust.hs_codes_applicable && (
          <div className="text-[10px] text-slate-500 font-mono">
            HS: {cust.hs_codes_applicable}
          </div>
        )}
      </td>

      <td className="py-3 px-2 text-center">
        <span
          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
            cust.priority_score >= 80
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : cust.priority_score >= 60
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {cust.priority_score}
        </span>
        {(cust.merge_count || 1) > 1 && (
          <div className="text-[9px] text-blue-400 font-bold mt-0.5">
            Merged x{cust.merge_count}
          </div>
        )}
      </td>

      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onSelectDossier(cust)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
          >
            Dossier
          </button>
          <button
            onClick={() => onConvertToDeal(cust)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${accentBgClass} shadow-sm transition`}
          >
            + Deal
          </button>
        </div>
      </td>
    </tr>
  );
}
