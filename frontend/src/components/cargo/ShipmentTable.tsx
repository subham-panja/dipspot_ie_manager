'use client';

import React from 'react';
import Link from 'next/link';
import {
  Ship,
  Check,
  Copy,
  ArrowRight,
  Edit,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Shipment } from './cargoTypes';

interface ShipmentTableProps {
  shipments: Shipment[];
  loading: boolean;
  copiedTrack: string | null;
  onCopyLink: (trackingNumber: string) => void;
  onSelectForUpdate: (shipment: Shipment) => void;
  onDelete: (trackingNumber: string) => Promise<void>;
  isLight: boolean;
}

export default function ShipmentTable({
  shipments,
  loading,
  copiedTrack,
  onCopyLink,
  onSelectForUpdate,
  onDelete,
  isLight,
}: ShipmentTableProps) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-400" />
          <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Registered Ocean Consignments
          </h3>
          <span className="text-xs text-slate-400 font-mono">({shipments.length} consignments)</span>
        </div>
        <span className="text-[11px] text-slate-400 italic">
          Customer public link allows buyers to track container progress in real time
        </span>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading cargo consignments...</div>
      ) : shipments.length === 0 ? (
        <div className="p-16 text-center">
          <Ship className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No active consignments found</p>
          <p className="text-xs text-slate-400 mt-1">Book your first ocean cargo container shipment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`text-[11px] uppercase tracking-wider font-semibold border-b ${
                isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950/60 text-slate-400 border-slate-800'
              }`}
            >
              <tr>
                <th className="py-3 px-4">Tracking & Customer</th>
                <th className="py-3 px-4">Commodity & Containers</th>
                <th className="py-3 px-4">Corridor (Origin &rarr; Dest)</th>
                <th className="py-3 px-4">Vessel & Carrier</th>
                <th className="py-3 px-4">Current Progression</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {shipments.map((s) => (
                <tr
                  key={s.tracking_number}
                  className={`transition-colors ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-cyan-400 text-xs">
                        {s.tracking_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCopyLink(s.tracking_number)}
                        title="Copy public tracking link for customer"
                        className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800/60 transition"
                      >
                        {copiedTrack === s.tracking_number ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {s.customer_name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {s.destination_country}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-medium text-slate-200 truncate text-[11px]">
                      {s.cargo_description}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {s.container_numbers?.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-300 border border-slate-700/50"
                        >
                          {c}
                        </span>
                      ))}
                      {s.container_numbers?.length > 2 && (
                        <span className="text-[10px] text-slate-400">
                          +{s.container_numbers.length - 2} more
                        </span>
                      )}
                    </div>
                    {s.bl_number && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">B/L: {s.bl_number}</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                      <span>{s.origin_port?.split(',')[0] || 'Kolkata'}</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-cyan-300">{s.destination_port?.split(',')[0] || 'Jebel Ali'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      ETD: {s.etd || '—'} &bull; ETA: {s.eta || '—'}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-200 text-xs">
                      {s.vessel_name || 'Vessel Pending'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {s.carrier || 'Ocean Carrier'}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 min-w-[180px]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className={`font-semibold ${s.is_delivered ? 'text-emerald-400' : 'text-cyan-400'}`}>
                        {s.current_stage_name}
                      </span>
                      <span className="text-slate-400 font-mono font-medium">{s.progress_percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          s.is_delivered ? 'bg-emerald-400' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${s.progress_percent}%` }}
                      />
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectForUpdate(s)}
                        className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Advance Stage</span>
                      </button>

                      <Link
                        href={`/track?ref=${s.tracking_number}`}
                        target="_blank"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                        title="Open Customer Public View"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                        <span>Portal</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => onDelete(s.tracking_number)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                        title="Delete Booking"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
