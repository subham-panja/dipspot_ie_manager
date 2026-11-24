'use client';

import React from 'react';
import { Send, X } from 'lucide-react';
import { MessageTemplate } from './templateTypes';

interface QuickTestModalProps {
  template: MessageTemplate | null;
  onClose: () => void;
  testRecipient: string;
  setTestRecipient: (rec: string) => void;
  isDispatching: boolean;
  onSend: (tpl: MessageTemplate) => Promise<void>;
  isLight: boolean;
  accentClasses: any;
}

export default function QuickTestModal({
  template,
  onClose,
  testRecipient,
  setTestRecipient,
  isDispatching,
  onSend,
  isLight,
  accentClasses,
}: QuickTestModalProps) {
  if (!template) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Quick Test Dispatch</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Template:</span>
            <span className="font-bold text-white">{template.name}</span>
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Send Test To:</label>
            <input
              type="text"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder={template.channel === 'Email' ? 'procurement@client.com' : '+971501234567'}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDispatching}
            onClick={() => onSend(template)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn}`}
          >
            {isDispatching ? 'Transmitting...' : 'Send Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
