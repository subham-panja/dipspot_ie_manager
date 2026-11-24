'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import { Deal, Stage, NewDealFormData, NewStageFormData } from './pipelineTypes';

export function usePipelineData() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stagesRes, dealsRes] = await Promise.all([
        fetchJson<{ stages: Stage[] }>('/pipeline/stages'),
        fetchJson<{ deals: Deal[]; total_deals: number }>('/pipeline/deals'),
      ]);
      setStages(stagesRes.stages || []);
      setDeals(dealsRes.deals || []);
    } catch (e) {
      console.error('Failed to load pipeline data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createDeal = async (formData: NewDealFormData) => {
    try {
      await fetchJson('/pipeline/deals', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          notes: formData.note ? [formData.note] : [],
        }),
      });
      loadData();
    } catch (err: any) {
      alert('Error creating deal: ' + err.message);
      throw err;
    }
  };

  const addStage = async (newStageForm: NewStageFormData) => {
    try {
      await fetchJson('/pipeline/stages', {
        method: 'POST',
        body: JSON.stringify(newStageForm),
      });
      loadData();
    } catch (err: any) {
      alert('Failed to add stage: ' + err.message);
      throw err;
    }
  };

  const updateDealStage = async (dealId: string, newStageId: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.deal_id === dealId ? { ...d, stage_id: newStageId } : d))
    );

    try {
      await fetchJson(`/pipeline/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stage_id: newStageId,
          note: `Stage changed to ${newStageId.toUpperCase().replace('_', ' ')}`,
        }),
      });
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
      loadData();
    }
  };

  const dropDeal = async (dealId: string, targetStageId: string) => {
    const currentDeal = deals.find((d) => d.deal_id === dealId);
    if (!currentDeal || currentDeal.stage_id === targetStageId) return;
    await updateDealStage(dealId, targetStageId);
  };

  const deleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this customer deal?')) return;
    try {
      await fetchJson(`/pipeline/deals/${dealId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert('Failed to delete deal: ' + err.message);
    }
  };

  return {
    stages,
    deals,
    loading,
    loadData,
    createDeal,
    addStage,
    updateDealStage,
    dropDeal,
    deleteDeal,
  };
}
