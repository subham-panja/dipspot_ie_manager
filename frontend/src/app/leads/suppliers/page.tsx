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
import { SUPPLIER_SORT_OPTIONS, SUPPLIER_STAGE_OPTIONS } from '@/components/leads/leadConstants';
import LeadFiltersBar from '@/components/leads/LeadFiltersBar';
import LeadBulkActionBar from '@/components/leads/LeadBulkActionBar';
import SupplierTable from '@/components/leads/SupplierTable';
import LeadCreationModal from '@/components/leads/LeadCreationModal';
import ConvertToDealModal from '@/components/leads/ConvertToDealModal';
import LeadsMetricsCards from '@/components/leads/LeadsMetricsCards';
import SuppliersHeader from '@/components/leads/SuppliersHeader';
import SuppliersFilterDropdowns from '@/components/leads/SuppliersFilterDropdowns';
import { buildSuppliersNavItems } from '@/components/leads/suppliersNavConfig';
import { useLeadsDirectory } from '@/components/leads/useLeadsDirectory';

function VerifiedSuppliersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const urlCustomLabel = searchParams?.get('custom_label') || '';
  const urlJobId = searchParams?.get('job_id') || '';
  const urlCountry = searchParams?.get('country') || '';

  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [commodity, setCommodity] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState<LeadItem | null>(null);
  const [convertCustomer, setConvertCustomer] = useState<LeadItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    leads: suppliers,
    setLeads: setSuppliers,
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
    endpoint: '/leads/suppliers',
    leadType: 'wb_mill',
    urlParams: { customLabel: urlCustomLabel, jobId: urlJobId, country: urlCountry },
  });

  const loadSuppliers = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      if (commodity) params.append('commodity', commodity);
      if (search) params.append('search', search);
      if (minScore !== '') params.append('min_score', String(minScore));
      if (urlCountry) params.append('country', urlCountry);
      if (urlCustomLabel) params.append('custom_label', urlCustomLabel);
      if (urlJobId) params.append('job_id', urlJobId);
      params.append('sort_by', sortBy);
      params.append('page', String(pageNum));
      params.append('per_page', '15');

      const data = await fetchJson<LeadsApiResponse>(`/leads/suppliers?${params.toString()}`);
      setSuppliers(data.suppliers || data.leads || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setAggregations(data.aggregations || null);
    } catch (e) {
      console.error('Failed to load suppliers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(page);
  }, [district, state, commodity, minScore, sortBy, page, urlCustomLabel, urlJobId, urlCountry]);

  const handleResetFilters = () => {
    setDistrict('');
    setState('');
    setCommodity('');
    setSearch('');
    setMinScore('');
    setSortBy('score_desc');
    setPage(1);
  };

  const handleCreateSupplier = async (formData: NewLeadFormData) => {
    try {
      await fetchJson('/leads', {
        method: 'POST',
        body: JSON.stringify({ ...formData, lead_type: 'wb_mill', priority_score: 94 }),
      });
      alert(`Verified processing mill '${formData.company_name}' registered!`);
      setIsAddModalOpen(false);
      setPage(1);
      loadSuppliers(1);
    } catch (err: any) {
      alert('Failed to create supplier: ' + err.message);
    }
  };

  const handleConvertContract = async (formData: DealFormData) => {
    if (!convertCustomer) return;
    try {
      await fetchJson(`/leads/${convertCustomer.id}/convert-to-deal`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      alert(`Supplier ${convertCustomer.company_name} enrolled in Pipeline Kanban!`);
      setConvertCustomer(null);
      loadSuppliers(page);
    } catch (err: any) {
      alert('Conversion failed: ' + err.message);
    }
  };

  const currentExportFilters = {
    district,
    state,
    commodity,
    country: urlCountry,
    custom_label: urlCustomLabel,
    job_id: urlJobId,
    min_score: minScore,
  };

  const navItems = buildSuppliersNavItems({
    total,
    district,
    setDistrict,
    setPage,
  });

  return (
    <Shell>
      <SuppliersHeader
        total={total}
        isLight={isLight}
        onAddSupplier={() => setIsAddModalOpen(true)}
        exportCsvUrl={buildExportUrl('csv', currentExportFilters)}
        exportJsonUrl={buildExportUrl('json', currentExportFilters)}
      />

      <PageLeftNav title="Directory Scope" subtitle="Supplier Categories" items={navItems} activeId="suppliers">
        <LeadsMetricsCards aggregations={aggregations} isLight={isLight} type="supplier" />

        {(urlCustomLabel || urlJobId || urlCountry) && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-400">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-200">Active Crawl Filter:</span>
              {urlCustomLabel && <span className="font-bold text-white bg-emerald-500/25 px-2.5 py-0.5 rounded border border-emerald-500/30">{urlCustomLabel}</span>}
              {urlJobId && <span className="text-slate-400 font-mono text-[11px]">(Job #{urlJobId})</span>}
              {urlCountry && <span className="text-slate-300">&bull; Origin: <strong className="text-white">{urlCountry}</strong></span>}
            </div>
            <button type="button" onClick={() => router.push('/leads/suppliers')} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ml-auto sm:ml-0">
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        <LeadFiltersBar search={search} onSearchChange={setSearch} onSearchSubmit={(e) => { e.preventDefault(); setPage(1); loadSuppliers(1); }} searchPlaceholder="Search by facility, contact, GSTIN..." sortBy={sortBy} onSortChange={(v) => { setSortBy(v); setPage(1); }} sortOptions={SUPPLIER_SORT_OPTIONS} isLight={isLight} accentTextColor="text-emerald-400">
          <SuppliersFilterDropdowns district={district} onDistrictChange={(v) => { setDistrict(v); setPage(1); }} commodity={commodity} onCommodityChange={(v) => { setCommodity(v); setPage(1); }} minScore={minScore} onMinScoreChange={(v) => { setMinScore(v); setPage(1); }} hasActiveFilters={!!(district || state || commodity || minScore || search)} onResetFilters={handleResetFilters} isLight={isLight} />
        </LeadFiltersBar>

        <LeadBulkActionBar
          selectedCount={selectedIds.size}
          exportCsvUrl={buildExportUrl('csv', currentExportFilters, true)}
          exportJsonUrl={buildExportUrl('json', currentExportFilters, true)}
          onBulkStatusUpdate={(s) => handleBulkStatusUpdate(s, () => loadSuppliers(page))}
          onBulkDelete={() => handleBulkDelete(() => loadSuppliers(page))}
          onClearSelection={clearSelection}
          stagePlaceholder="Set Pipeline Stage..."
          stageOptions={SUPPLIER_STAGE_OPTIONS}
          badgeBgColor="bg-emerald-500"
          borderColor="border-emerald-500/50"
          itemNoun="Suppliers"
        />

        <SupplierTable
          suppliers={suppliers}
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
          onConvertToContract={setConvertCustomer}
          isLight={isLight}
        />
      </PageLeftNav>

      <LeadCreationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleCreateSupplier} leadType="wb_mill" isLight={isLight} />
      <ConvertToDealModal lead={convertCustomer} isOpen={!!convertCustomer} onClose={() => setConvertCustomer(null)} onSubmit={handleConvertContract} isLight={isLight} modalTitle="Enroll Supplier in Supply Contract" submitButtonText="Enroll Supplier" iconType="factory" accentClass="bg-emerald-600 hover:bg-emerald-500" />
      <CustomerDossier customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    </Shell>
  );
}

export default function VerifiedSuppliersPage() {
  return (
    <Suspense fallback={<Shell><div className="py-24 text-center text-xs text-slate-500"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />Loading Verified Processing Facilities &amp; Suppliers...</div></Shell>}>
      <VerifiedSuppliersContent />
    </Suspense>
  );
}
