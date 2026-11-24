'use client';

import { useState, useEffect } from 'react';
import { fetchJson, API_BASE } from '@/lib/api';
import { LeadItem, LeadsApiResponse } from './leadTypes';

interface UseLeadsDirectoryOptions {
  endpoint: string;
  leadType: 'importer' | 'wb_mill';
  urlParams: {
    customLabel?: string;
    jobId?: string;
    country?: string;
  };
  initialSortBy?: string;
}

export function useLeadsDirectory({
  endpoint,
  leadType,
  urlParams,
  initialSortBy = 'score_desc',
}: UseLeadsDirectoryOptions) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [aggregations, setAggregations] = useState<LeadsApiResponse['aggregations'] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length && leads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusUpdate = async (status: string, onSuccess?: () => void) => {
    if (selectedIds.size === 0) return;
    try {
      await fetchJson('/leads/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds), deal_status: status }),
      });
      alert(`Updated ${selectedIds.size} leads to status: ${status}`);
      clearSelection();
      onSuccess?.();
    } catch (err: any) {
      alert('Failed to bulk update: ' + err.message);
    }
  };

  const handleBulkDelete = async (onSuccess?: () => void) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) return;
    try {
      await fetchJson('/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      alert(`Successfully deleted ${selectedIds.size} items`);
      clearSelection();
      onSuccess?.();
    } catch (err: any) {
      alert('Failed to bulk delete: ' + err.message);
    }
  };

  const buildExportUrl = (
    fmt = 'csv',
    filterParams: Record<string, string | number>,
    selectedOnly = false
  ) => {
    const params = new URLSearchParams();
    params.append('lead_type', leadType);
    params.append('format', fmt);
    if (selectedOnly && selectedIds.size > 0) {
      params.append('ids', Array.from(selectedIds).join(','));
    } else {
      Object.entries(filterParams).forEach(([key, val]) => {
        if (val !== '' && val !== undefined && val !== null) {
          params.append(key, String(val));
        }
      });
      if (search.trim()) params.append('search', search.trim());
      if (urlParams.customLabel) params.append('custom_label', urlParams.customLabel);
      if (urlParams.jobId) params.append('job_id', urlParams.jobId);
      params.append('sort_by', sortBy);
    }
    return `${API_BASE}/leads/export/${fmt}?${params.toString()}`;
  };

  return {
    leads,
    setLeads,
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
  };
}
