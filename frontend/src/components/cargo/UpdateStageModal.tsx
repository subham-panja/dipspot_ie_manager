'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Shipment, MasterStage } from './cargoTypes';

interface UpdateStageModalProps {
  selectedShipment: Shipment | null;
  stages: MasterStage[];
  onClose: () => void;
  onUpdate: (data: { stage_id: string; stage_note: string; location: string }) => Promise<void>;
  isLight: boolean;
}

export default function UpdateStageModal({
  selectedShipment,
  stages,
  onClose,
  onUpdate,
  isLight,
}: UpdateStageModalProps) {
  const [updateStageId, setUpdateStageId] = useState('');
  const [updateStageNote, setUpdateStageNote] = useState('');
  const [updateLocation, setUpdateLocation] = useState('');

  useEffect(() => {
    if (selectedShipment) {
      setUpdateStageId(selectedShipment.current_stage_id);
      setUpdateStageNote('');
      setUpdateLocation(selectedShipment.destination_port || '');
    }
  }, [selectedShipment]);

  if (!selectedShipment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      stage_id: updateStageId,
      stage_note: updateStageNote,
      location: updateLocation,
    });
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
            Advance Stage: {selectedShipment.tracking_number}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Select Master Progression Stage</label>
            <select
              value={updateStageId}
              onChange={(e) => setUpdateStageId(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            >
              {stages.map((st) => (
                <option key={st.stage_id} value={st.stage_id}>
                  {st.order}. {st.name} {st.is_terminal ? '(Final Destination)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Current Physical Location</label>
            <input
              type="text"
              placeholder="e.g. In Transit - Arabian Sea / Jebel Ali Port Berth 4"
              value={updateLocation}
              onChange={(e) => setUpdateLocation(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Progression Note / Activity Log</label>
            <textarea
              rows={3}
              placeholder="e.g. Customs clearance documents stamped, containers loaded onto feeder vessel."
              value={updateStageNote}
              onChange={(e) => setUpdateStageNote(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
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
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              Update Consignment Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
