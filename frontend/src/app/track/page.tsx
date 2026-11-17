'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Globe2, Ship, ArrowRight, ShieldCheck, Box } from 'lucide-react';
import Link from 'next/link';

export default function PublicTrackSearchPage() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      router.push(`/track/${trackingNumber.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                TradePulse <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold">TRACK</span>
              </span>
              <p className="text-[11px] text-slate-400">Global EXIM Cargo Progression Portal</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            Go to Admin Dashboard &rarr;
          </Link>
        </div>
      </header>

      {/* Hero Tracking Search */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <Ship className="w-4 h-4" />
          <span>Real-time Vessel & Container Tracking</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Track Your Cargo <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
            From Origin Supplier To Destination Port
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Enter your shipment tracking number or Bill of Lading (B/L) reference to see verified live milestone updates, vessel coordinates, and estimated arrival dates.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mt-8">
          <div className="relative flex items-center shadow-2xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-4" />
            <input
              type="text"
              placeholder="e.g. TRK-2026-8921 or MSCKOL829104..."
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 hover:border-slate-600 focus:border-emerald-500 text-white pl-12 pr-36 py-4 rounded-2xl text-base outline-none transition placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <span>Track Cargo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Quick Sample Tracking Numbers */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>Sample demo shipments:</span>
          <button
            onClick={() => setTrackingNumber('TRK-2026-8921')}
            className="font-mono text-emerald-400 hover:underline bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
          >
            TRK-2026-8921
          </button>
          <button
            onClick={() => setTrackingNumber('TRK-2026-4402')}
            className="font-mono text-emerald-400 hover:underline bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
          >
            TRK-2026-4402
          </button>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 w-full text-left">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-sm font-bold text-white">SGS Quality Inspection</h4>
            <p className="text-xs text-slate-400 mt-1">Verified moisture, sortex purity, and fumigation certifications logged before container stuffing.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
            <Ship className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="text-sm font-bold text-white">Carrier Telemetry</h4>
            <p className="text-xs text-slate-400 mt-1">Direct integration with Maersk, MSC, Hapag-Lloyd for live voyage and transshipment tracking.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
            <Box className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-sm font-bold text-white">Container Seal Integrity</h4>
            <p className="text-xs text-slate-400 mt-1">Full 20ft / 40ft container lists with customs bottle seal records and port gate passes.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        TradePulse EXIM Progression Engine &bull; Global Ocean Logistics &bull; Secure Public Tracking
      </footer>
    </div>
  );
}

