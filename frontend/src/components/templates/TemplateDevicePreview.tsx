'use client';

import React from 'react';
import {
  Users,
  Sliders,
  Eye,
  Mail,
  Smartphone,
  MessageSquare,
  Send,
} from 'lucide-react';
import { LeadSample } from './templateTypes';

interface TemplateDevicePreviewProps {
  activeLead: LeadSample;
  realLeads: LeadSample[];
  selectedLeadIndex: number;
  setSelectedLeadIndex: (idx: number) => void;
  customLeadOverrides: Record<string, string>;
  setCustomLeadOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showOverrideInputs: boolean;
  setShowOverrideInputs: (show: boolean) => void;
  previewDevice: 'desktop_email' | 'mobile_email' | 'whatsapp' | 'sms';
  setPreviewDevice: (device: 'desktop_email' | 'mobile_email' | 'whatsapp' | 'sms') => void;
  hydratedBody: string;
  hydratedSubject: string;
  smsCharCount: number;
  smsSegments: number;
  testRecipient: string;
  setTestRecipient: (rec: string) => void;
  isDispatching: boolean;
  tplChannel: 'Email' | 'WhatsApp' | 'SMS';
  onExecuteTestDispatch: () => Promise<void>;
  isLight: boolean;
  accentClasses: any;
}

export default function TemplateDevicePreview({
  activeLead, realLeads, selectedLeadIndex, setSelectedLeadIndex,
  customLeadOverrides, setCustomLeadOverrides, showOverrideInputs, setShowOverrideInputs,
  previewDevice, setPreviewDevice, hydratedBody, hydratedSubject,
  smsCharCount, smsSegments, testRecipient, setTestRecipient,
  isDispatching, tplChannel, onExecuteTestDispatch, isLight, accentClasses,
}: TemplateDevicePreviewProps) {
  return (
    <div className="lg:col-span-5 space-y-4">
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Hydrate with Real Lead
          </span>
          <button
            type="button"
            onClick={() => setShowOverrideInputs(!showOverrideInputs)}
            className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span>{showOverrideInputs ? 'Hide Custom Overrides' : 'Custom Test Values'}</span>
          </button>
        </div>

        <select
          value={selectedLeadIndex}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setSelectedLeadIndex(idx);
            const lead = realLeads[idx];
            if (lead) {
              setTestRecipient(tplChannel === 'Email' ? lead.emails || '' : lead.phones || '');
            }
          }}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-200'
          }`}
        >
          {realLeads.map((lead, idx) => (
            <option key={idx} value={idx}>{lead.company_name} ({lead.country})</option>
          ))}
        </select>

        {showOverrideInputs && (
          <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <label className="text-slate-400 block mb-0.5">Quantity Spec:</label>
              <input
                type="text"
                value={customLeadOverrides.quantity_mt}
                onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, quantity_mt: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Price Spec:</label>
              <input
                type="text"
                value={customLeadOverrides.price_per_mt}
                onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, price_per_mt: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Incoterm:</label>
              <input
                type="text"
                value={customLeadOverrides.incoterm}
                onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, incoterm: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Payment Terms:</label>
              <input
                type="text"
                value={customLeadOverrides.payment_terms}
                onChange={(e) => setCustomLeadOverrides({ ...customLeadOverrides, payment_terms: e.target.value })}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-5 rounded-2xl border space-y-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            Live Device Preview
          </span>
          <div className="flex items-center gap-1">
            {(['desktop_email', 'mobile_email', 'whatsapp', 'sms'] as const).map((dev) => (
              <button
                key={dev}
                type="button"
                onClick={() => setPreviewDevice(dev)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  previewDevice === dev ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title={dev}
              >
                {dev === 'desktop_email' && <Mail className="w-3.5 h-3.5" />}
                {dev === 'mobile_email' && <Smartphone className="w-3.5 h-3.5" />}
                {dev === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5" />}
                {dev === 'sms' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
          </div>
        </div>

        {previewDevice === 'desktop_email' && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Mail Preview &bull; {activeLead.company_name}</span>
              <span className="text-[10px] text-emerald-400 font-mono">250 OK</span>
            </div>

            <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 space-y-1 text-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500 font-semibold w-12 text-right">From:</span>
                <span className="text-slate-200 font-medium">TradePulse Export Desk &lt;exports@tradepulse.exim&gt;</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500 font-semibold w-12 text-right">To:</span>
                <span className="text-slate-300 font-medium">{activeLead.contact_person} &lt;{activeLead.emails || 'procurement@buyer.com'}&gt;</span>
              </div>
              <div className="flex items-baseline gap-2 pt-1 border-t border-slate-800/40">
                <span className="text-slate-500 font-semibold w-12 text-right">Subject:</span>
                <span className="text-white font-bold">{hydratedSubject || 'No Subject'}</span>
              </div>
            </div>

            <div className="p-4 text-xs font-sans text-slate-200 whitespace-pre-line leading-relaxed max-h-[380px] overflow-y-auto bg-slate-950">
              {hydratedBody}
            </div>
          </div>
        )}

        {previewDevice === 'mobile_email' && (
          <div className="mx-auto max-w-[340px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
            <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />
            <div className="p-2.5 bg-slate-900 rounded-t-xl border-b border-slate-800 flex items-center justify-between text-xs text-white">
              <span className="font-bold text-[11px] truncate">{activeLead.company_name}</span>
              <span className="text-[9px] text-slate-400 font-mono">10:42 AM</span>
            </div>
            <div className="p-2 bg-slate-900/60 border-b border-slate-800 text-[11px]">
              <div className="font-bold text-white line-clamp-1">{hydratedSubject || 'Subject'}</div>
              <div className="text-[10px] text-slate-400 truncate">From: exports@tradepulse.exim</div>
            </div>
            <div className="p-3 bg-slate-900/40 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-[320px] overflow-y-auto">
              {hydratedBody}
            </div>
          </div>
        )}

        {previewDevice === 'whatsapp' && (
          <div className="mx-auto max-w-[340px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
            <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />
            <div className="p-2.5 bg-emerald-900/60 rounded-t-xl border-b border-emerald-800/40 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px]">TP</div>
                <div className="truncate">
                  <div className="font-bold text-[11px] truncate">{activeLead.company_name}</div>
                  <div className="text-[9px] text-emerald-300">Online</div>
                </div>
              </div>
              <span className="text-[9px] font-mono text-emerald-300">Verified</span>
            </div>

            <div className="p-3 bg-slate-900/80 min-h-[300px] max-h-[360px] overflow-y-auto space-y-2">
              <div className="p-3 rounded-2xl rounded-tl-none bg-emerald-950/60 border border-emerald-800/50 text-emerald-100 text-xs whitespace-pre-line leading-relaxed shadow-md">
                {hydratedBody}
                <div className="mt-1 text-right text-[9px] text-emerald-400 font-mono flex items-center justify-end gap-1">
                  <span>10:45 AM</span>
                  <span className="text-cyan-400 font-bold">&check;&check;</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewDevice === 'sms' && (
          <div className="mx-auto max-w-[340px] rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
            <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />
            <div className="p-2.5 bg-slate-900 rounded-t-xl border-b border-slate-800 text-center text-xs text-white">
              <div className="font-bold text-[11px]">{activeLead.contact_person}</div>
              <div className="text-[9px] text-slate-400">{activeLead.phones || '+971 50 123 4567'}</div>
            </div>
            <div className="p-3 bg-slate-900/60 min-h-[260px] max-h-[320px] overflow-y-auto space-y-2">
              <div className="p-3 rounded-2xl rounded-tl-none bg-blue-950/60 border border-blue-800/50 text-blue-100 text-xs whitespace-pre-line leading-relaxed shadow-sm">
                {hydratedBody}
                <div className="mt-1 text-right text-[9px] text-blue-300 font-mono">Delivered SMS</div>
              </div>
            </div>
            <div className="p-2 bg-slate-900 rounded-b-xl border-t border-slate-800 text-center text-[10px] text-slate-400 font-mono">
              {smsCharCount} Chars &bull; {smsSegments} Segment(s)
            </div>
          </div>
        )}
      </div>

      <div className={`p-5 rounded-2xl border space-y-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            Real Test Dispatch Console
          </span>
          <span className="text-[10px] font-mono text-slate-500">Live API</span>
        </div>

        <p className="text-xs text-slate-400">
          Dispatches this hydrated template through your configured Gmail SMTP gateway or sandbox API outbox.
        </p>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Test Recipient ({tplChannel === 'Email' ? 'Email Address' : 'Phone / Mobile No.'}):
          </label>
          <input
            type="text"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder={tplChannel === 'Email' ? 'buyer@company.com' : '+971501234567'}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>

        <button
          type="button"
          disabled={isDispatching}
          onClick={onExecuteTestDispatch}
          className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} shadow-md transition flex items-center justify-center gap-2`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isDispatching ? 'Transmitting Dispatch...' : `Send Test ${tplChannel} Now`}</span>
        </button>
      </div>
    </div>
  );
}
