'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import { useTheme } from '@/context/ThemeContext';
import CustomerDossier from '@/components/CustomerDossier';
import { Deal, NewDealFormData, NewStageFormData } from '@/components/pipeline/pipelineTypes';
import PipelineHeader from '@/components/pipeline/PipelineHeader';
import PipelineFilterBar from '@/components/pipeline/PipelineFilterBar';
import KanbanBoard from '@/components/pipeline/KanbanBoard';
import NewDealModal from '@/components/pipeline/NewDealModal';
import DealDetailDrawer from '@/components/pipeline/DealDetailDrawer';
import StageConfigModal from '@/components/pipeline/StageConfigModal';
import { usePipelineData } from '@/components/pipeline/usePipelineData';

export default function PipelineKanbanPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dossierCustomer, setDossierCustomer] = useState<any | null>(null);

  const {
    stages,
    deals,
    createDeal,
    addStage,
    updateDealStage,
    dropDeal,
    deleteDeal,
  } = usePipelineData();

  const handleCreateDeal = async (formData: NewDealFormData) => {
    await createDeal(formData);
    setShowNewModal(false);
  };

  const handleAddStage = async (formData: NewStageFormData) => {
    await addStage(formData);
  };

  const handleStageChange = async (dealId: string, newStageId: string) => {
    await updateDealStage(dealId, newStageId);
    if (selectedDeal?.deal_id === dealId) {
      setSelectedDeal((prev) => (prev ? { ...prev, stage_id: newStageId } : null));
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    await deleteDeal(dealId);
    setSelectedDeal(null);
  };

  const openDossierForDeal = (deal: Deal) => {
    setDossierCustomer({
      id: 9999,
      company_name: deal.company_name,
      country: deal.country,
      contact_person: 'Executive Trade Buyer Desk',
      matched_varieties: deal.commodity,
      priority_score: 85,
      lead_type: 'importer',
    });
  };

  const filteredDeals = deals.filter((d) => {
    const matchesSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      d.commodity.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = !countryFilter || d.country.toLowerCase().includes(countryFilter.toLowerCase());
    return matchesSearch && matchesCountry;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalQuantity = filteredDeals.reduce((sum, d) => sum + (d.quantity_mt || 0), 0);
  const totalValue = filteredDeals.reduce(
    (sum, d) => sum + (d.value_usd ?? (d.quantity_mt || 0) * 470),
    0
  );
  const countries = Array.from(new Set(deals.map((d) => d.country).filter(Boolean)));

  return (
    <Shell>
      <PipelineHeader
        stagesCount={stages.length}
        onOpenConfig={() => setShowConfigModal(true)}
        onOpenNewDeal={() => setShowNewModal(true)}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <PipelineFilterBar
        search={search}
        onSearchChange={setSearch}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        countries={countries}
        activeDealsCount={filteredDeals.length}
        totalValue={totalValue}
        totalQuantity={totalQuantity}
        formatCurrency={formatCurrency}
        isLight={isLight}
      />

      <KanbanBoard
        stages={stages}
        deals={filteredDeals}
        draggedDealId={draggedDealId}
        dragOverStageId={dragOverStageId}
        onDragStart={(e, dealId) => {
          e.dataTransfer.setData('text/plain', dealId);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedDealId(dealId);
        }}
        onDragEnd={() => {
          setDraggedDealId(null);
          setDragOverStageId(null);
        }}
        onDragOverStage={(e, stageId) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverStageId !== stageId) setDragOverStageId(stageId);
        }}
        onDragLeaveStage={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOverStageId(null);
        }}
        onDropDeal={(dealId, targetStageId) => {
          setDragOverStageId(null);
          setDraggedDealId(null);
          dropDeal(dealId, targetStageId);
        }}
        onSelectDeal={setSelectedDeal}
        onOpenDossier={openDossierForDeal}
        onStageChange={handleStageChange}
        formatCurrency={formatCurrency}
        isLight={isLight}
        accentTextClass={accentClasses.text}
      />

      <StageConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        stages={stages}
        onAddStage={handleAddStage}
        isLight={isLight}
        accentBgClass={accentClasses.bg}
      />

      <NewDealModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateDeal}
        stages={stages}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <DealDetailDrawer
        deal={selectedDeal}
        stages={stages}
        onClose={() => setSelectedDeal(null)}
        onStageChange={handleStageChange}
        onDeleteDeal={handleDeleteDeal}
        onOpenDossier={openDossierForDeal}
        formatCurrency={formatCurrency}
        isLight={isLight}
        accentBadgeBg={accentClasses.badgeBg}
      />

      <CustomerDossier
        customer={dossierCustomer}
        onClose={() => setDossierCustomer(null)}
        onConvertToDeal={() => {
          setDossierCustomer(null);
          setShowNewModal(true);
        }}
      />
    </Shell>
  );
}
