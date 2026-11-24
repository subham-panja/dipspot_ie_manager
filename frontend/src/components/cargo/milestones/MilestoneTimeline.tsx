'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check,
  Clock,
  Circle,
  ArrowRight,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Shipment } from '@/components/cargo/cargoTypes';

interface MilestoneTimelineProps {
  selectedShipment: Shipment | null;
  onAdvanceStage: (trackingNumber: string, stageId: string) => Promise<void>;
  isLight: boolean;
}

export default function MilestoneTimeline({
  selectedShipment,
  onAdvanceStage,
  isLight,
}: MilestoneTimelineProps) {
  if (!selectedShipment) {
    return (
      <div className="p-16 text-center text-slate-400 border rounded-2xl border-dashed border-slate-800">
        No consignment selected
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-2xl border transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/40 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400">
              {selectedShipment.tracking_number}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                selectedShipment.is_delivered
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              {selectedShipment.current_stage_name}
            </span>
          </div>
          <h2 className={`text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {selectedShipment.customer_name} &bull; {selectedShipment.cargo_description}
          </h2>
        </div>

        <Link
          href={`/track?ref=${selectedShipment.tracking_number}`}
          target="_blank"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          <span>Public Buyer Tracker</span>
        </Link>
      </div>

      <div className="mt-6 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {selectedShipment.milestones?.map((m, idx) => {
          const isDone = m.status === 'completed';
          const isInProgress = m.status === 'in_progress';
          const isCurrent = selectedShipment.current_stage_id === m.stage_id;

          return (
            <div key={m.stage_id} className="relative group">
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center transition ${
                  isDone
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : isInProgress
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20 animate-pulse'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : isInProgress ? (
                  <Clock className="w-3 h-3" />
                ) : (
                  <Circle className="w-2 h-2" />
                )}
              </div>

              <div
                className={`p-4 rounded-xl border transition ${
                  isCurrent
                    ? isLight
                      ? 'bg-cyan-50/50 border-cyan-300 shadow-sm'
                      : 'bg-cyan-950/20 border-cyan-800/60'
                    : isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">Stage {idx + 1}</span>
                      <h4
                        className={`text-xs font-bold ${
                          isDone ? 'text-emerald-400' : isInProgress ? 'text-cyan-400' : 'text-slate-300'
                        }`}
                      >
                        {m.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {m.description || 'Verified progression gate for customs and logistics.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => onAdvanceStage(selectedShipment.tracking_number, m.stage_id)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1"
                      >
                        <span>Advance to Here</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/40 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
                  {m.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{m.location}</span>
                    </div>
                  )}
                  {m.actual_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      <span>Completed: {m.actual_date}</span>
                    </div>
                  )}
                  {m.notes && (
                    <div className="italic text-slate-300">
                      &ldquo;{m.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
