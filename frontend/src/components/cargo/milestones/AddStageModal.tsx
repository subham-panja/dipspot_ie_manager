'use client';

import React, { useState } from 'react';

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stage: { name: string; description: string; is_terminal: boolean }) => Promise<void>;
  isLight: boolean;
}

export default function AddStageModal({
  isOpen,
  onClose,
  onSave,
  isLight,
}: AddStageModalProps) {
  const [newStageName, setNewStageName] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [isTerminal, setIsTerminal] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    await onSave({
      name: newStageName.trim(),
      description: newStageDesc.trim(),
      is_terminal: isTerminal,
    });
    setNewStageName('');
    setNewStageDesc('');
    setIsTerminal(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Add Master Milestone Stage
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Stage Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. SGS Quality Inspection & Fumigation"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Stage Description</label>
            <input
              type="text"
              placeholder="Third-party surveyor inspection and phytosanitary seal"
              value={newStageDesc}
              onChange={(e) => setNewStageDesc(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="terminalCheck"
              checked={isTerminal}
              onChange={(e) => setIsTerminal(e.target.checked)}
              className="rounded border-slate-700"
            />
            <label htmlFor="terminalCheck" className="text-slate-300 font-medium cursor-pointer">
              Mark as terminal final delivery stage
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Save Master Stage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
