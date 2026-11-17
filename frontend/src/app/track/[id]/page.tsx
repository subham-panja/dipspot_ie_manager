'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/api';
import Link from 'next/link';
import {
  Globe2,
  Ship,
  CheckCircle2,
  Clock,
  ArrowRight,
  Anchor,
  Box,
  MapPin,
  Calendar,
  AlertCircle,
  RefreshCw,
  Share2,
  FileText,
  ChevronLeft
} from 'lucide-react';

interface Milestone {
  stage_id: string;
  name: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending';
  location?: string;
  actual_date?: string;
  notes?: string;
}

interface PublicShipmentData {
  found: boolean;
  tracking_number: string;
  cargo_description: string;
  origin_port: string;
  destination_port: string;
  vessel_name: string;
  carrier: string;
  etd: string;
  eta: string;
  current_stage: string;
  progress_percent: number;
  is_delivered: boolean;
  milestones: Milestone[];
  last_updated: string;
}

export default function PublicShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trackingNumber = params?.id as string;

  const [data, setData] = useState<PublicShipmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadShipment = async () => {
    if (!trackingNumber) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchJson<PublicShipmentData>(`/shipments/track/${trackingNumber}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Shipment not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipment();
  }, [trackingNumber]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Querying live vessel telemetry & milestone status...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <header className="border-b border-slate-800 bg-slate-900/60 p-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/track" className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" />
              Back to Tracking Search
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto text-center px-6 py-20">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Tracking Record Not Found</h2>
          <p className="text-sm text-slate-400 mt-2">
            No active shipment matching reference <strong className="text-white font-mono">{trackingNumber}</strong> was located in the registry.
          </p>
          <div className="mt-6">
            <Link
              href="/track"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-2.5 rounded-xl inline-block shadow-md"
            >
              Search Again
            </Link>
          </div>
        </main>

        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          TradePulse EXIM Progression Engine
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                TradePulse <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold">TRACK</span>
              </span>
              <p className="text-[11px] text-slate-400">Cargo Progression Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyShareLink}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
            </button>
            <Link
              href="/track"
              className="text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              New Search
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Status Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                  {data.tracking_number}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded ${
                    data.is_delivered
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {data.is_delivered ? 'Delivered Consignment' : 'In Transit'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-2">
                {data.cargo_description}
              </h1>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Current Milestone</span>
              <span className="text-lg font-bold text-emerald-400 flex items-center sm:justify-end gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {data.current_stage}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="py-6 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Voyage Progression
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {data.progress_percent}% Completed
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 shadow-inner">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-3 rounded-full transition-all duration-700"
                style={{ width: `${data.progress_percent}%` }}
              />
            </div>
          </div>

          {/* Route Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Anchor className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Port of Loading (POL)</span>
                <h3 className="text-base font-bold text-white mt-0.5">{data.origin_port}</h3>
                <span className="text-xs text-slate-400 mt-0.5 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Departure (ETD): <strong className="text-slate-200">{data.etd}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Port of Discharge (POD)</span>
                <h3 className="text-base font-bold text-white mt-0.5">{data.destination_port}</h3>
                <span className="text-xs text-slate-400 mt-0.5 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Estimated Arrival (ETA): <strong className="text-emerald-400">{data.eta}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Carrier & Vessel specs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs text-slate-400">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Vessel Name</span>
              <span className="text-slate-200 font-medium block mt-0.5">{data.vessel_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Ocean Carrier</span>
              <span className="text-slate-200 font-medium block mt-0.5">{data.carrier}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Last Update Timestamp</span>
              <span className="text-slate-200 font-mono block mt-0.5">{data.last_updated.slice(0, 16).replace('T', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Milestone Progression Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Chain-of-Custody Progression Milestones
            </h2>
            <button
              onClick={loadShipment}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Status
            </button>
          </div>

          {/* Timeline Nodes */}
          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {data.milestones?.map((m, idx) => {
              const isCompleted = m.status === 'completed';
              const isInProgress = m.status === 'in_progress';
              const isPending = m.status === 'pending';

              return (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Node Icon */}
                  <div
                    className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                        : isInProgress
                        ? 'bg-slate-950 border-blue-400 text-blue-400 ring-4 ring-blue-500/20'
                        : 'bg-slate-950 border-slate-700 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isInProgress ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 rounded-xl p-4 border transition ${
                      isInProgress
                        ? 'bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-500/5'
                        : isCompleted
                        ? 'bg-slate-950/80 border-slate-800/80'
                        : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h4
                        className={`text-sm font-bold ${
                          isInProgress ? 'text-blue-300' : isCompleted ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {m.name}
                      </h4>
                      {m.actual_date && (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded self-start sm:self-auto">
                          {m.actual_date}
                        </span>
                      )}
                    </div>

                    {m.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{m.location}</span>
                      </div>
                    )}

                    {m.notes && (
                      <p className="text-xs text-slate-300 mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-sans">
                        {m.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        TradePulse EXIM Cargo Progression &bull; Master-Stage Monitored Logistics
      </footer>
    </div>
  );
}

