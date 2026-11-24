'use client';

import React from 'react';
import {
  Mail,
  MessageSquare,
  Smartphone,
  Search,
  FileText,
  Copy,
  Trash2,
  Send,
  Edit3,
} from 'lucide-react';
import { MessageTemplate, CATEGORIES_LIST } from './templateTypes';

interface TemplateLibraryViewProps {
  templates: MessageTemplate[];
  loading: boolean;
  selectedChannel: 'All' | 'Email' | 'WhatsApp' | 'SMS';
  setSelectedChannel: (ch: 'All' | 'Email' | 'WhatsApp' | 'SMS') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onResetDefaults: () => Promise<void>;
  onDuplicate: (tpl: MessageTemplate) => void;
  onDelete: (templateId: string) => Promise<void>;
  onQuickTest: (tpl: MessageTemplate) => void;
  onOpenStudio: (tpl: MessageTemplate) => void;
  isLight: boolean;
  accentClasses: any;
}

export default function TemplateLibraryView({
  templates,
  loading,
  selectedChannel,
  setSelectedChannel,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onResetDefaults,
  onDuplicate,
  onDelete,
  onQuickTest,
  onOpenStudio,
  isLight,
  accentClasses,
}: TemplateLibraryViewProps) {
  const filteredTemplates = templates.filter((t) => {
    if (selectedChannel !== 'All' && t.channel !== selectedChannel) return false;
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchSubj = (t.subject || '').toLowerCase().includes(q);
      const matchBody = t.body.toLowerCase().includes(q);
      const matchId = t.template_id.toLowerCase().includes(q);
      return matchName || matchSubj || matchBody || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Email', 'WhatsApp', 'SMS'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedChannel === ch
                  ? `${accentClasses.badge} shadow-sm`
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {ch === 'All' ? 'All Channels' : ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {CATEGORIES_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates or tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8 pr-3 py-1.5 rounded-lg text-xs border w-48 lg:w-64 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading templates library...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No templates match the current filter</p>
          <p className="text-xs text-slate-500 mt-1">Try switching channel or resetting search filters.</p>
          <button
            onClick={onResetDefaults}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white"
          >
            Reload Default Templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.template_id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition group hover:shadow-lg ${
                isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                      tpl.channel === 'Email'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : tpl.channel === 'WhatsApp'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {tpl.channel === 'Email' && <Mail className="w-3 h-3" />}
                    {tpl.channel === 'WhatsApp' && <MessageSquare className="w-3 h-3" />}
                    {tpl.channel === 'SMS' && <Smartphone className="w-3 h-3" />}
                    {tpl.channel}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                    {tpl.category || 'General'}
                  </span>
                </div>

                <h3 className={`text-sm font-bold line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {tpl.name}
                </h3>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{tpl.template_id}</div>

                {tpl.channel === 'Email' && tpl.subject && (
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Subject:</span>
                    <span className="text-slate-200 font-medium line-clamp-1">{tpl.subject}</span>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-400 line-clamp-4 leading-relaxed whitespace-pre-line font-sans">
                  {tpl.body}
                </p>

                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1">
                    {tpl.variables.slice(0, 4).map((v) => (
                      <span key={v} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {v}
                      </span>
                    ))}
                    {tpl.variables.length > 4 && (
                      <span className="text-[9px] font-mono text-slate-500 px-1">
                        +{tpl.variables.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onDuplicate(tpl)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                    title="Duplicate Template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(tpl.template_id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuickTest(tpl)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-emerald-400" />
                    <span>Test</span>
                  </button>

                  <button
                    onClick={() => onOpenStudio(tpl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${accentClasses.btn} flex items-center gap-1 transition shadow-sm`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit in Studio</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
