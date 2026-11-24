'use client';

import React from 'react';
import {
  Edit3,
  Mail,
  MessageSquare,
  Smartphone,
  Tag,
  Trash2,
  Save,
} from 'lucide-react';
import {
  MessageTemplate,
  CATEGORIES_LIST,
  TOKEN_SUGGESTIONS,
  PREBUILT_SNIPPETS,
} from './templateTypes';

interface TemplateEditorFormProps {
  tplName: string;
  setTplName: (name: string) => void;
  tplCategory: string;
  setTplCategory: (cat: string) => void;
  tplChannel: 'Email' | 'WhatsApp' | 'SMS';
  setTplChannel: (ch: 'Email' | 'WhatsApp' | 'SMS') => void;
  tplSubject: string;
  setTplSubject: (subj: string) => void;
  tplBody: string;
  setTplBody: React.Dispatch<React.SetStateAction<string>>;
  activeTemplate: MessageTemplate;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
  onCancel: () => void;
  copiedToken: string | null;
  insertTokenIntoDraft: (token: string) => void;
  insertSnippetIntoDraft: (snippet: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  smsCharCount: number;
  smsSegments: number;
  isLight: boolean;
  accentClasses: any;
  setPreviewDevice: (device: 'desktop_email' | 'mobile_email' | 'whatsapp' | 'sms') => void;
}

export default function TemplateEditorForm({
  tplName,
  setTplName,
  tplCategory,
  setTplCategory,
  tplChannel,
  setTplChannel,
  tplSubject,
  setTplSubject,
  tplBody,
  setTplBody,
  activeTemplate,
  isSaving,
  onSave,
  onDelete,
  onCancel,
  copiedToken,
  insertTokenIntoDraft,
  insertSnippetIntoDraft,
  textareaRef,
  smsCharCount,
  smsSegments,
  isLight,
  accentClasses,
  setPreviewDevice,
}: TemplateEditorFormProps) {
  return (
    <div
      className={`lg:col-span-7 p-6 rounded-2xl border space-y-5 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-emerald-400" />
          Template Composition Studio
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          Target Channel: <strong className="text-emerald-400">{tplChannel}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Template Name</label>
          <input
            type="text"
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            placeholder="e.g. FOB Spot Quotation (Rice & Grain)"
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Commercial Category</label>
          <select
            value={tplCategory}
            onChange={(e) => setTplCategory(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          >
            {CATEGORIES_LIST.filter((c) => c !== 'All').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Outbound Channel</label>
        <div className="grid grid-cols-3 gap-2">
          {(['Email', 'WhatsApp', 'SMS'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                setTplChannel(ch);
                if (ch === 'WhatsApp') setPreviewDevice('whatsapp');
                else if (ch === 'SMS') setPreviewDevice('sms');
                else setPreviewDevice('desktop_email');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                tplChannel === ch
                  ? `${accentClasses.badge} shadow-sm font-bold`
                  : isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {ch === 'Email' && <Mail className="w-3.5 h-3.5" />}
              {ch === 'WhatsApp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
              {ch === 'SMS' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
              <span>{ch}</span>
            </button>
          ))}
        </div>
      </div>

      {tplChannel === 'Email' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Email Subject Line <span className="text-rose-400">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Merge variables supported</span>
          </div>
          <input
            type="text"
            value={tplSubject}
            onChange={(e) => setTplSubject(e.target.value)}
            placeholder="e.g. Spot Commercial Offer: Certified {commodity} CIF {port}"
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          />
        </div>
      )}

      {tplChannel === 'WhatsApp' && (
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp Formatting Guide:
          </div>
          <p className="text-[11px] text-emerald-200/80">
            Use <code className="bg-emerald-950/60 px-1 rounded">*bold*</code>, <code className="bg-emerald-950/60 px-1 rounded">_italics_</code>, <code className="bg-emerald-950/60 px-1 rounded">~strikethrough~</code>, and emojis.
          </p>
        </div>
      )}

      {tplChannel === 'SMS' && (
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>GSM Segment Calculator:</span>
          </div>
          <span className="font-mono text-[11px] font-bold">
            {smsCharCount} Chars &bull; {smsSegments} SMS Segment{smsSegments > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            Dynamic Merge Variables (Click to Insert):
          </span>
          {copiedToken && (
            <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
              Inserted {copiedToken}!
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOKEN_SUGGESTIONS.map((t) => (
            <button
              key={t.token}
              type="button"
              onClick={() => insertTokenIntoDraft(t.token)}
              className="px-2 py-1 rounded-lg text-[11px] font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition flex items-center gap-1"
              title={t.desc}
            >
              <Tag className="w-2.5 h-2.5" />
              <span>{t.token}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Quick Pre-Built Trade Paragraphs:
        </span>
        <div className="flex flex-wrap gap-2">
          {PREBUILT_SNIPPETS.map((snip) => (
            <button
              key={snip.label}
              type="button"
              onClick={() => insertSnippetIntoDraft(snip.snippet)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              + {snip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Message Draft Body</span>
          <span className="font-mono text-[11px]">
            {tplBody.length} characters &bull; {tplBody.split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
        <textarea
          ref={textareaRef}
          rows={14}
          value={tplBody}
          onChange={(e) => setTplBody(e.target.value)}
          placeholder="Write your trade message draft with {variable_tokens}..."
          className={`w-full p-4 rounded-xl border font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/30 transition ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}
        />
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => onDelete(activeTemplate.template_id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/20 transition flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Template</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} shadow-md transition flex items-center gap-1.5`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
