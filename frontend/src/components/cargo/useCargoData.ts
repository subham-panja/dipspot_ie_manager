'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import { Shipment, MasterStage, CreateShipmentFormData } from './cargoTypes';

export function useCargoData() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stages, setStages] = useState<MasterStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTrack, setCopiedTrack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, stagesRes] = await Promise.all([
        fetchJson<{ shipments: Shipment[] }>('/shipments'),
        fetchJson<{ stages: MasterStage[] }>('/shipments/stages'),
      ]);
      setShipments(shipmentsRes.shipments || []);
      setStages(stagesRes.stages || []);
    } catch (e) {
      console.error('Failed to load cargo shipments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = (trackingNumber: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/track?ref=${trackingNumber}`;
    navigator.clipboard.writeText(link);
    setCopiedTrack(trackingNumber);
    setTimeout(() => setCopiedTrack(null), 2500);
  };

  const handleCreateShipment = async (form: CreateShipmentFormData) => {
    setIsSubmitting(true);
    try {
      const containerList = form.container_numbers
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await fetchJson('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          container_numbers: containerList,
        }),
      });

      loadData();
    } catch (err: any) {
      alert('Error booking consignment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStage = async (
    trackingNumber: string,
    data: { stage_id: string; stage_note: string; location: string }
  ) => {
    try {
      await fetchJson(`/shipments/${trackingNumber}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      loadData();
    } catch (err: any) {
      alert('Failed to update consignment milestone: ' + err.message);
    }
  };

  const handleDelete = async (trackingNumber: string) => {
    if (!confirm(`Delete consignment ${trackingNumber}?`)) return;
    try {
      await fetchJson(`/shipments/${trackingNumber}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert('Failed to delete consignment: ' + err.message);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.tracking_number.toLowerCase().includes(term) ||
      s.customer_name.toLowerCase().includes(term) ||
      s.cargo_description.toLowerCase().includes(term) ||
      (s.container_numbers && s.container_numbers.some((c) => c.toLowerCase().includes(term))) ||
      s.destination_port.toLowerCase().includes(term) ||
      s.vessel_name.toLowerCase().includes(term)
    );
  });

  const activeInTransit = shipments.filter((s) => !s.is_delivered).length;
  const deliveredCount = shipments.filter((s) => s.is_delivered).length;

  return {
    shipments,
    stages,
    loading,
    searchTerm,
    setSearchTerm,
    filteredShipments,
    activeInTransit,
    deliveredCount,
    copiedTrack,
    handleCopyLink,
    isSubmitting,
    handleCreateShipment,
    handleUpdateStage,
    handleDelete,
  };
}
