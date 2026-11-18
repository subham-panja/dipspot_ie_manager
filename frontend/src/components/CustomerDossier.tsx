'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  X,
  MapPin,
  Building2,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  Kanban,
  Megaphone,
  Ship,
  Search,
  Layers,
  Scale,
  Award
} from 'lucide-react';

interface CustomerLead {
  id: number;
  company_name: string;
  country: string;
  city_or_hub?: string;
  contact_person?: string;
  phones?: string;
  emails?: string;
  website?: string;
  address?: string;
  matched_varieties?: string;
  commodities_list?: string[];
  hs_codes_applicable?: string;
  priority_score: number;
  lead_type: string;
  gstin?: string;
  pan?: string;
  fssai_or_sfda_status?: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  nearest_port?: string;
  trade_role?: string;
  annual_volume_est?: string;
  risk_tier?: string;
  key_trade_lanes?: string[];
  duplicate_probability?: number;
  duplicate_status?: string;
  source_name?: string;
  source_url?: string;
}

interface CustomerDossierProps {
  customer: CustomerLead | null;
  onClose: () => void;
  onConvertToDeal?: (customer: CustomerLead) => void;
  onConvert?: (customer?: any) => void;
  onEnroll?: (customer: CustomerLead) => void;
}

export default function CustomerDossier({
  customer,
  onClose,
  onConvertToDeal,
  onConvert,
  onEnroll,
}: CustomerDossierProps) {
  const { theme, detailViewMode, accentClasses } = useTheme();
  const isLight = theme === 'light';

  // Map search / coordinate adjustment
  const [mapQuery, setMapQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite'>('roadmap');

  // Escape key handler to close popup
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!customer) return null;

  const lat = customer.latitude || 25.2048;
  const lng = customer.longitude || 55.2708;
  const mapSearchTarget = mapQuery || `${lat},${lng}`;
  const embedMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchTarget)}&t=${mapStyle === 'satellite' ? 'k' : 'm'}&z=13&ie=UTF8&iwloc=&output=embed`;

  // First phone and email
  const firstPhone = customer.phones?.split(',')[0]?.trim();
  const cleanWaNumber = firstPhone?.replace(/[^0-9]/g, '');
  const firstEmail = customer.emails?.split(',')[0]?.trim();

  // Container styling based on user preference (right drawer, modal, left drawer)
  let containerPositionClasses = '';
  if (detailViewMode === 'right_drawer') {
    containerPositionClasses = 'justify-end';
  } else if (detailViewMode === 'left_drawer') {
    containerPositionClasses = 'justify-start';
  } else {
    // centered modal
    containerPositionClasses = 'justify-center items-center';
  }

  const isDrawer = detailViewMode === 'right_drawer' || detailViewMode === 'left_drawer';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex ${containerPositionClasses} transition-all`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${
          isDrawer ? 'max-w-4xl h-full' : 'max-w-5xl max-h-[92vh] rounded-2xl m-4'
        } border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accentClasses.gradient} flex items-center justify-center text-white shadow-sm`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                  customer.lead_type === 'importer'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {customer.lead_type === 'importer' ? 'Global Importer' : 'Verified Supplier'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${accentClasses.badgeBg}`}>
                  Score: {customer.priority_score}/100
                </span>
                {customer.duplicate_probability !== undefined && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    customer.duplicate_probability >= 75
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : customer.duplicate_probability >= 30
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    DB Match: {customer.duplicate_probability}% ({customer.duplicate_status || (customer.duplicate_probability >= 75 ? 'duplicate' : 'unique')})
                  </span>
                )}
              </div>
              <h2 className={`text-base font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {customer.company_name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Layout: {detailViewMode.replace('_', ' ')}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Body: Left Map UI (50%) + Right Contact & Intelligence (50%) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto">
          {/* ============================================================== */}
          {/* LEFT SECTION (50%): INTERACTIVE GOOGLE MAPS UI                */}
          {/* ============================================================== */}
          <div className={`w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r flex flex-col space-y-3 ${
            isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            {/* Map Search Bar & Style Selector */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search coordinates or city on map..."
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  className={`w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border outline-none ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => setMapStyle(mapStyle === 'roadmap' ? 'satellite' : 'roadmap')}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition ${
                  mapStyle === 'satellite'
                    ? `${accentClasses.bg} text-white`
                    : isLight
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {mapStyle === 'satellite' ? 'Satellite' : 'Roadmap'}
              </button>
            </div>

            {/* Interactive Embedded Google Map Canvas */}
            <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden border border-slate-800/80 relative shadow-inner">
              <iframe
                title="Customer Global Location Map"
                src={embedMapUrl}
                className="w-full h-full border-0 absolute inset-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              {/* Pin Coordinates Overlay Card */}
              <div className="absolute top-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-2 text-[10px] text-slate-300 shadow-lg pointer-events-none">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="truncate max-w-[140px]">{customer.company_name}</span>
                </div>
                <div className="font-mono text-emerald-400 mt-0.5">
                  {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                </div>
              </div>
            </div>

            {/* Location Specs & Sea Port Card */}
            <div className={`p-3 rounded-xl border text-xs space-y-2 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Primary Commercial Sea Port
                </span>
                <span className="font-mono text-[10px] text-emerald-500 font-bold">Active Gateway</span>
              </div>
              <div className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <Ship className="w-3.5 h-3.5 text-blue-500" />
                <span>{customer.nearest_port || 'Jebel Ali Port (AEJEA)'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Location: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{customer.city_or_hub || customer.district || customer.country}</strong>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT SECTION (50%): CONTACT DIRECTORY & TRADE INTELLIGENCE   */}
          {/* ============================================================== */}
          <div className="w-full md:w-1/2 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Contact Information Group */}
              <div className="space-y-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Verified Contact Dossier
                </h3>

                <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  {customer.contact_person && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contact Executive:</span>
                      <strong className={isLight ? 'text-slate-800' : 'text-white'}>{customer.contact_person}</strong>
                    </div>
                  )}

                  {firstPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone / WhatsApp:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-white">{firstPhone}</span>
                        {cleanWaNumber && (
                          <a
                            href={`https://wa.me/${cleanWaNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                            title="Open WhatsApp Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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
                        className={`font-mono text-xs ${accentClasses.text} hover:underline truncate max-w-[200px]`}
                      >
                        {firstEmail}
                      </a>
                    </div>
                  )}

                  {customer.website && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Corporate Web:</span>
                      <a
                        href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span className="truncate max-w-[180px]">{customer.website}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {customer.address && (
                    <div className="pt-2 border-t border-slate-800/60 text-[11px]">
                      <span className="text-slate-400 block mb-0.5">Physical Facility / Office:</span>
                      <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{customer.address}</span>
                    </div>
                  )}

                  {customer.gstin && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400 font-mono text-[10px]">Tax ID / GSTIN:</span>
                      <span className="font-mono text-emerald-400 font-bold text-[11px]">{customer.gstin}</span>
                    </div>
                  )}

                  {customer.source_name && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                      <span className="text-slate-400">Verified Manifest Source:</span>
                      {customer.source_url ? (
                        <a
                          href={customer.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                        >
                          <span className="truncate max-w-[170px]">{customer.source_name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-amber-300 font-medium">{customer.source_name}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Trade & Commodity Profile */}
              <div className="space-y-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Trade Intelligence & Commodity Specs
                </h3>

                <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Commercial Role:</span>
                    <span className="font-semibold text-white">{customer.trade_role}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Est. Trade Capacity:</span>
                    <span className="font-mono font-bold text-emerald-400">{customer.annual_volume_est}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Risk Assessment:</span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {customer.risk_tier}
                    </span>
                  </div>

                  {customer.commodities_list && customer.commodities_list.length > 0 && (
                    <div>
                      <span className="text-slate-400 block mb-1">Target Commodities:</span>
                      <div className="flex flex-wrap gap-1">
                        {customer.commodities_list.map((c, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-900 border border-slate-800 text-slate-300'
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom 1-Click Action Bar */}
            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2.5">
              {onEnroll && (
                <button
                  type="button"
                  onClick={() => onEnroll(customer)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Enroll Campaign</span>
                </button>
              )}

              {(onConvertToDeal || onConvert) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onConvertToDeal) onConvertToDeal(customer);
                    else if (onConvert) onConvert(customer);
                  }}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Move to Pipeline</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
