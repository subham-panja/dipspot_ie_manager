'use client';

import React, { useState } from 'react';
import { Ship, X } from 'lucide-react';
import { CreateShipmentFormData } from './cargoTypes';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateShipmentFormData) => Promise<void>;
  isSubmitting: boolean;
  isLight: boolean;
}

const initialForm: CreateShipmentFormData = {
  customer_name: '',
  destination_country: 'United Arab Emirates',
  cargo_description: 'Non-Basmati Parboiled Rice (IR-64) in 50kg PP Bags',
  container_numbers: 'MSCU7829104, MSCU8102941',
  bl_number: 'BL-2026-CCU-9182',
  vessel_name: 'MSC ALTAIR V.024W',
  carrier: 'MSC Mediterranean Shipping',
  origin_port: 'Syama Prasad Mookerjee Port, Kolkata (INCCU)',
  destination_port: 'Jebel Ali Port, Dubai (AEJEA)',
  etd: '2026-11-20',
  eta: '2026-12-04',
};

export default function CreateShipmentModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  isLight,
}: CreateShipmentModalProps) {
  const [form, setForm] = useState<CreateShipmentFormData>(initialForm);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm(initialForm);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl transition max-h-[90vh] overflow-y-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-cyan-400" />
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Book New Ocean Consignment
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Customer / Importer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Dhiyafa Foodstuff Trading LLC"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Destination Country</label>
              <input
                type="text"
                value={form.destination_country}
                onChange={(e) => setForm({ ...form, destination_country: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Cargo Description & Spec</label>
            <input
              type="text"
              value={form.cargo_description}
              onChange={(e) => setForm({ ...form, cargo_description: e.target.value })}
              className={`w-full p-2.5 rounded-xl border outline-none ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Container Numbers (comma separated)</label>
              <input
                type="text"
                placeholder="MSCU7829104, MSCU8102941"
                value={form.container_numbers}
                onChange={(e) => setForm({ ...form, container_numbers: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Bill of Lading (B/L Number)</label>
              <input
                type="text"
                placeholder="BL-2026-CCU-9182"
                value={form.bl_number}
                onChange={(e) => setForm({ ...form, bl_number: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Port of Loading (Origin)</label>
              <input
                type="text"
                value={form.origin_port}
                onChange={(e) => setForm({ ...form, origin_port: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Discharge Port (Destination) *</label>
              <input
                type="text"
                required
                value={form.destination_port}
                onChange={(e) => setForm({ ...form, destination_port: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Vessel & Voyage</label>
              <input
                type="text"
                placeholder="MSC ALTAIR V.024W"
                value={form.vessel_name}
                onChange={(e) => setForm({ ...form, vessel_name: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Shipping Carrier</label>
              <input
                type="text"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">ETD (Estimated Departure)</label>
              <input
                type="date"
                value={form.etd}
                onChange={(e) => setForm({ ...form, etd: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">ETA (Estimated Arrival)</label>
              <input
                type="date"
                value={form.eta}
                onChange={(e) => setForm({ ...form, eta: e.target.value })}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              />
            </div>
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              {isSubmitting ? 'Booking...' : 'Confirm Ocean Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
