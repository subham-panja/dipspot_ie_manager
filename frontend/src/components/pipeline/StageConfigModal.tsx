'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, X } from 'lucide-react';
import { Stage, NewStageFormData } from './pipelineTypes';

interface StageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  onAddStage: (data: NewStageFormData) => Promise<void>;
  isLight: boolean;
  accentBgClass: string;
}

export default function StageConfigModal({
  isOpen,
  onClose,
  stages,
  onAddStage,
  isLight,
  accentBgClass,
}: StageConfigModalProps) {
  const [form, setForm] = useState<NewStageFormData>({
    name: '',
    color: '#10b981',
    is_terminal: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setSubmitting(true);
      await onAddStage(form);
      setForm({ name: '', color: '#10b981', is_terminal: false });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Sliders className="w-5 h-5 text-emerald-400" />
            Configure Pipeline Stages
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Current Sequence ({stages.length} Stages)
          </span>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {stages.map((st) => (
              <div
                key={st.stage_id}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color || '#3b82f6' }} />
                  <span className="font-semibold">{st.name}</span>
                </div>
                <span className="font-mono text-slate-500 text-[10px]">Order #{st.order}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 pt-4 border-t border-slate-800/50 space-y-3 text-xs">
          <span className="text-xs font-semibold text-white block">Add New Funnel Stage</span>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Stage Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Letter of Credit Authenticated"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Color Tag Hex</label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="termStage"
              checked={form.is_terminal}
              onChange={(e) => setForm({ ...form, is_terminal: e.target.checked })}
              className="accent-emerald-500"
            />
            <label htmlFor="termStage" className="text-slate-300 cursor-pointer">
              Mark as terminal final stage (Won / Lost)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-white font-semibold ${accentBgClass}`}
            >
              {submitting ? 'Saving...' : 'Save Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
