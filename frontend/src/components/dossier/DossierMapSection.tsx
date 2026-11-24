'use client';

import React, { useState } from 'react';
import { Search, MapPin, Ship } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierMapSectionProps {
  lead: CustomerLead;
  isLight: boolean;
  accentBgClass: string;
}

export default function DossierMapSection({
  lead,
  isLight,
  accentBgClass,
}: DossierMapSectionProps) {
  const [mapQuery, setMapQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite'>('roadmap');

  const lat = lead.latitude || 25.2048;
  const lng = lead.longitude || 55.2708;
  const mapSearchTarget = mapQuery || `${lat},${lng}`;
  const embedMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchTarget)}&t=${mapStyle === 'satellite' ? 'k' : 'm'}&z=13&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      className={`w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r flex flex-col space-y-3 ${
        isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
      }`}
    >
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
              ? `${accentBgClass} text-white`
              : isLight
              ? 'bg-white border-slate-200 text-slate-700'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {mapStyle === 'satellite' ? 'Satellite' : 'Roadmap'}
        </button>
      </div>

      <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden border border-slate-800/80 relative shadow-inner">
        <iframe
          title="Customer Global Location Map"
          src={embedMapUrl}
          className="w-full h-full border-0 absolute inset-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <div className="absolute top-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-2 text-[10px] text-slate-300 shadow-lg pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
            <span className="truncate max-w-[140px]">{lead.company_name}</span>
          </div>
          <div className="font-mono text-emerald-400 mt-0.5">
            {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
          </div>
        </div>
      </div>

      <div
        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Primary Commercial Sea Port Gateway
          </span>
          <span className="font-mono text-[10px] text-emerald-500 font-bold">Active Gateway</span>
        </div>
        <div className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
          <Ship className="w-3.5 h-3.5 text-blue-500" />
          <span>{lead.nearest_port || 'Jebel Ali Port (AEJEA)'}</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Location: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{lead.city_or_hub || lead.district || lead.country}</strong>
        </div>
      </div>
    </div>
  );
}
