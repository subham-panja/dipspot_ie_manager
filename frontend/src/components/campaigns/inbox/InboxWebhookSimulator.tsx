'use client';

import React from 'react';

interface InboxWebhookSimulatorProps {
  simText: string;
  setSimText: (t: string) => void;
  simulatingInbound: boolean;
  onSimulateInbound: () => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

export default function InboxWebhookSimulator({
  simText,
  setSimText,
  simulatingInbound,
  onSimulateInbound,
  disabled = false,
  disabledReason,
}: InboxWebhookSimulatorProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={simText}
        onChange={(e) => setSimText(e.target.value)}
        disabled={disabled}
        placeholder="Simulate client reply text..."
        className="w-64 px-2.5 py-1 text-[11px] rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={onSimulateInbound}
        disabled={simulatingInbound || disabled}
        className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled && disabledReason ? disabledReason : 'Simulates client reply, triggers AI sentiment and pauses cadence'}
      >
        <span>{simulatingInbound ? 'Simulating...' : 'Simulate Inbound'}</span>
      </button>
    </div>
  );
}
