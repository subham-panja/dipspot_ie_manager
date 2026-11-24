'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import PageLeftNav from '@/components/PageLeftNav';
import CustomerDossier from '@/components/CustomerDossier';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, Filter, X } from 'lucide-react';
import { LeadItem, LeadsApiResponse, NewLeadFormData, DealFormData } from '@/components/leads/leadTypes';
import { IMPORTER_SORT_OPTIONS, IMPORTER_STAGE_OPTIONS } from '@/components/leads/leadConstants';
import LeadFiltersBar from '@/components/leads/LeadFiltersBar';
import LeadBulkActionBar from '@/components/leads/LeadBulkActionBar';
import LeadTable from '@/components/leads/LeadTable';
import LeadCreationModal from '@/components/leads/LeadCreationModal';
import ConvertToDealModal from '@/components/leads/ConvertToDealModal';
import LeadsMetricsCards from '@/components/leads/LeadsMetricsCards';
import ImportersHeader from '@/components/leads/ImportersHeader';
import ImportersFilterDropdowns from '@/components/leads/ImportersFilterDropdowns';
import { buildImportersNavItems } from '@/components/leads/importersNavConfig';
import { useLeadsDirectory } from '@/components/leads/useLeadsDirectory';

function GlobalImportersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const urlCustomLabel = searchParams?.get('custom_label') || '';
  const urlJobId = searchParams?.get('job_id') || '';
  const urlCountry = searchParams?.get('country') || '';

  const [country, setCountry] = useState(urlCountry || '');
  const [port, setPort] = useState(searchParams?.get('port') || '');
  const [tier, setTier] = useState(searchParams?.get('tier') || '');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState<LeadItem | null>(null);
  const [convertCustomer, setConvertCustomer] = useState<LeadItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    leads: importers,
    setLeads: setImporters,
    aggregations,
    setAggregations,
    total,
    setTotal,
    page,
    setPage,
    pages,
    setPages,
    loading,
    setLoading,
    sortBy,
    setSortBy,
    search,
    setSearch,
    selectedIds,
    toggleSelectAll,
    toggleSelectRow,
    clearSelection,
    handleBulkStatusUpdate,
    handleBulkDelete,
    buildExportUrl,
  } = useLeadsDirectory({
    endpoint: '/leads/importers',
    leadType: 'importer',
    urlParams: { customLabel: urlCustomLabel, jobId: urlJobId, country: urlCountry },
  });

  const loadImporters = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('per_page', '15');
      params.append('sort_by', sortBy);
      const effectiveCountry = country || urlCountry;
      if (effectiveCountry) params.append('country', effectiveCountry);
      if (port) params.append('port', port);
      if (tier) params.append('tier', tier);
      if (minScore) params.append('min_score', String(minScore));
      if (search.trim()) params.append('search', search.trim());
      if (urlCustomLabel) params.append('custom_label', urlCustomLabel);
      if (urlJobId) params.append('job_id', urlJobId);

      const res = await fetchJson<LeadsApiResponse>(`/leads/importers?${params.toString()}`);
      setImporters(res.importers || res.leads || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setPages(res.pages || 1);
      if (res.aggregations) setAggregations(res.aggregations);
    } catch (e) {
      console.error('Failed to load importers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImporters(page);
  }, [page, country, port, tier, minScore, sortBy, urlCustomLabel, urlJobId, urlCountry]);

  const handleCreateLead = async (formData: NewLeadFormData) => {
    try {
      await fetchJson('/leads', {
        method: 'POST',
        body: JSON.stringify({ ...formData, lead_type: 'importer', priority_score: 92 }),
      });
      alert(`Verified importer '${formData.company_name}' saved to directory!`);
      setIsAddModalOpen(false);
      loadImporters(1);
    } catch (err: any) {
      alert('Failed to create lead: ' + err.message);
    }
  };

  const handleConvertDeal = async (formData: DealFormData) => {
    if (!convertCustomer) return;
    try {
      await fetchJson('/pipeline/deals', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title || `${formData.quantity_mt} MT ${formData.commodity} - ${convertCustomer.company_name}`,
          company_name: convertCustomer.company_name,
          country: convertCustomer.country,
          commodity: formData.commodity,
          quantity_mt: Number(formData.quantity_mt),
          incoterm: formData.incoterm,
          payment_terms: formData.payment_terms,
          stage_id: 'inquiry',
          note: `Converted from verified importer directory lead #${convertCustomer.id}`,
        }),
      });
      alert('Customer deal created successfully! Moved to Pipeline Kanban.');
      setConvertCustomer(null);
    } catch (err: any) {
      alert('Failed to convert to deal: ' + err.message);
    }
  };

  const currentExportFilters = {
    country: country || urlCountry,
    port,
    tier,
    min_score: minScore,
    custom_label: urlCustomLabel,
    job_id: urlJobId,
  };

  const navItems = buildImportersNavItems({
    total,
    tier,
    port,
    minScore,
    setTier,
    setPort,
    setCountry,
    setMinScore,
    setPage,
  });

  return (
    <Shell>
      <ImportersHeader
        isLight={isLight}
        accentBadgeBg={accentClasses.badgeBg}
        onAddLead={() => setIsAddModalOpen(true)}
        exportCsvUrl={buildExportUrl('csv', currentExportFilters)}
        exportJsonUrl={buildExportUrl('json', currentExportFilters)}
      />

      <PageLeftNav title="Directory Scope" subtitle="Filter & Category Index" items={navItems} activeId="importers">
        <LeadsMetricsCards aggregations={aggregations} isLight={isLight} type="importer" />

        {(urlCustomLabel || urlJobId || urlCountry) && (
          <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-400">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-200">Active Crawl Filter:</span>
              {urlCustomLabel && <span className="font-bold text-white bg-blue-500/25 px-2.5 py-0.5 rounded border border-blue-500/30">{urlCustomLabel}</span>}
              {urlJobId && <span className="text-slate-400 font-mono text-[11px]">(Job #{urlJobId})</span>}
              {urlCountry && <span className="text-slate-300">&bull; Geography: <strong className="text-white">{urlCountry}</strong></span>}
            </div>
            <button type="button" onClick={() => router.push('/leads/importers')} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ml-auto sm:ml-0">
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        <LeadFiltersBar search={search} onSearchChange={setSearch} onSearchSubmit={(e) => { e.preventDefault(); setPage(1); loadImporters(1); }} sortBy={sortBy} onSortChange={(v) => { setSortBy(v); setPage(1); }} sortOptions={IMPORTER_SORT_OPTIONS} isLight={isLight}>
          <ImportersFilterDropdowns country={country} onCountryChange={(v) => { setCountry(v); setPage(1); }} minScore={minScore} onMinScoreChange={(v) => { setMinScore(v); setPage(1); }} port={port} onPortChange={(v) => { setPort(v); setPage(1); }} tier={tier} onTierChange={(v) => { setTier(v); setPage(1); }} isLight={isLight} />
        </LeadFiltersBar>

        <LeadBulkActionBar
          selectedCount={selectedIds.size}
          exportCsvUrl={buildExportUrl('csv', currentExportFilters, true)}
          exportJsonUrl={buildExportUrl('json', currentExportFilters, true)}
          onBulkStatusUpdate={(s) => handleBulkStatusUpdate(s, () => loadImporters(page))}
          onBulkDelete={() => handleBulkDelete(() => loadImporters(page))}
          onClearSelection={clearSelection}
          stageOptions={IMPORTER_STAGE_OPTIONS}
        />

        <LeadTable
          leads={importers}
          loading={loading}
          selectedIds={selectedIds}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectRow={toggleSelectRow}
          sortBy={sortBy}
          onSortChange={(val) => { setSortBy(val); setPage(1); }}
          page={page}
          pages={pages}
          total={total}
          onPageChange={setPage}
          onSelectDossier={setSelectedCustomer}
          onConvertToDeal={(lead) => setConvertCustomer(lead)}
          isLight={isLight}
          accentBgClass={accentClasses.bg}
        />
      </PageLeftNav>

      <LeadCreationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleCreateLead} leadType="importer" isLight={isLight} />
      <ConvertToDealModal lead={convertCustomer} isOpen={!!convertCustomer} onClose={() => setConvertCustomer(null)} onSubmit={handleConvertDeal} isLight={isLight} modalTitle="Convert Importer to Pipeline Deal" submitButtonText="Add to Funnel" accentClass={`${accentClasses.bg} ${accentClasses.bgHover}`} />
      <CustomerDossier customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onConvertToDeal={(c) => { setSelectedCustomer(null); setConvertCustomer(c || selectedCustomer); }} />
    </Shell>
  );
}

export default function GlobalImportersPage() {
  return (
    <Suspense fallback={<Shell><div className="py-24 text-center text-xs text-slate-500"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />Loading Global Importers &amp; Trade Desks...</div></Shell>}>
      <GlobalImportersContent />
    </Suspense>
  );
}
