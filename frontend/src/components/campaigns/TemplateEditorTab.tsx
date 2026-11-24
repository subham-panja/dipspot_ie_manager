'use client';

import React from 'react';
import { Plus, Trash2, Tag, Save, Smartphone } from 'lucide-react';
import { MessageTemplate, SAMPLE_CUSTOMERS, TOKEN_SUGGESTIONS } from './CampaignTypes';

interface TemplateEditorTabProps {
  templates: MessageTemplate[];
  selectedTemplate: MessageTemplate | null;
  filterChannel: string;
  setFilterChannel: (ch: string) => void;
  onSelectTemplate: (tpl: MessageTemplate) => void;
  onCreateNewTemplate: () => void;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onSaveTemplate: () => Promise<void>;
  tplName: string;
  setTplName: (name: string) => void;
  tplChannel: 'Email' | 'WhatsApp' | 'SMS';
  setTplChannel: (ch: 'Email' | 'WhatsApp' | 'SMS') => void;
  tplSubject: string;
  setTplSubject: (subj: string) => void;
  tplBody: string;
  setTplBody: React.Dispatch<React.SetStateAction<string>>;
  isSavingTpl: boolean;
  copiedToken: string | null;
  insertTokenIntoDraft: (token: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  selectedSampleIndex: number;
  setSelectedSampleIndex: (idx: number) => void;
  isLight: boolean;
  accentClasses: any;
}

export default function TemplateEditorTab({
  templates, selectedTemplate, filterChannel, setFilterChannel,
  onSelectTemplate, onCreateNewTemplate, onDeleteTemplate, onSaveTemplate,
  tplName, setTplName, tplChannel, setTplChannel, tplSubject, setTplSubject,
  tplBody, setTplBody, isSavingTpl, copiedToken, insertTokenIntoDraft,
  textareaRef, selectedSampleIndex, setSelectedSampleIndex, isLight, accentClasses,
}: TemplateEditorTabProps) {
  const filteredTemplates = templates.filter(
    (t) => filterChannel === 'All' || t.channel.toLowerCase() === filterChannel.toLowerCase()
  );

  const currentSample = SAMPLE_CUSTOMERS[selectedSampleIndex]?.data || SAMPLE_CUSTOMERS[0].data;
  const hydratedBody = tplBody.replace(/\{(\w+)\}/g, (match, p1) => {
    return (currentSample as any)[p1] !== undefined ? (currentSample as any)[p1] : match;
  });
  const hydratedSubject = tplSubject.replace(/\{(\w+)\}/g, (match, p1) => {
    return (currentSample as any)[p1] !== undefined ? (currentSample as any)[p1] : match;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Omnichannel Message Template Studio
          </h2>
          <p className="text-xs text-slate-400">
            Draft responsive templates with curly brace variable replacement, test against real customer dossiers, and preview on mobile devices.
          </p>
        </div>

        <button
          onClick={onCreateNewTemplate}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} shadow-md transition flex items-center gap-1.5`}
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`lg:col-span-3 p-4 rounded-2xl border space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Templates</span>
            <span className="text-[11px] font-mono text-slate-500">{filteredTemplates.length} Saved</span>
          </div>

          <div className="flex gap-1">
            {(['All', 'Email', 'WhatsApp', 'SMS'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition ${
                  filterChannel === ch ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate?.template_id === tpl.template_id;
              return (
                <div
                  key={tpl.template_id}
                  onClick={() => onSelectTemplate(tpl)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 shadow-sm'
                      : isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{tpl.channel}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{tpl.template_id}</span>
                  </div>
                  <h4 className="font-semibold text-white mt-1.5 line-clamp-1">{tpl.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tpl.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`lg:col-span-5 p-5 rounded-2xl border space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Template Editor</span>
            {selectedTemplate && (
              <button
                onClick={() => onDeleteTemplate(selectedTemplate.template_id)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Template Name</label>
              <input
                type="text"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Channel</label>
                <select
                  value={tplChannel}
                  onChange={(e) => setTplChannel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500"
                >
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject (Email Only)</label>
                <input
                  type="text"
                  disabled={tplChannel !== 'Email'}
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  placeholder={tplChannel === 'Email' ? 'Subject with {tokens}' : 'N/A for SMS/WhatsApp'}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-300 font-semibold">Click Token to Insert into Draft:</span>
                {copiedToken && <span className="text-[10px] text-emerald-400 font-bold">Inserted!</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TOKEN_SUGGESTIONS.map((tok) => (
                  <button
                    key={tok.token}
                    type="button"
                    onClick={() => insertTokenIntoDraft(tok.token)}
                    className="text-[11px] font-mono bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tok.token}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Template Content Draft</label>
              <textarea
                ref={textareaRef}
                rows={10}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-lg outline-none focus:border-purple-500 font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onSaveTemplate}
                disabled={isSavingTpl}
                className={`px-5 py-2 rounded-xl text-white font-semibold ${accentClasses.bg} shadow-md transition flex items-center gap-2`}
              >
                <Save className="w-4 h-4" />
                <span>{isSavingTpl ? 'Saving...' : 'Save Template'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-400" />
              Live Device Preview
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
              Real-time Hydration
            </span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-semibold mb-1">
              Hydrate Variables with Sample Lead:
            </label>
            <select
              value={selectedSampleIndex}
              onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-2.5 py-1.5 rounded-lg outline-none focus:border-purple-500"
            >
              {SAMPLE_CUSTOMERS.map((s, idx) => (
                <option key={idx} value={idx}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="mx-auto max-w-[340px] rounded-[32px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
            <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />

            <div className="p-2.5 rounded-t-xl bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-[10px]">TP</div>
                <div className="truncate">
                  <div className="font-bold text-[11px] truncate">{currentSample.company_name}</div>
                  <div className="text-[9px] text-slate-400">{currentSample.contact_name} &bull; {currentSample.country}</div>
                </div>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono font-bold">Online</span>
            </div>

            <div className="p-3 bg-slate-900/60 min-h-[300px] max-h-[380px] overflow-y-auto space-y-2 text-xs">
              {tplChannel === 'Email' && hydratedSubject && (
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-white font-semibold text-[11px]">
                  Subject: {hydratedSubject}
                </div>
              )}

              <div className={`p-3 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                tplChannel === 'WhatsApp'
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-100 rounded-tl-none'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}>
                {hydratedBody}
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
              Channel: {tplChannel} Gateway
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
