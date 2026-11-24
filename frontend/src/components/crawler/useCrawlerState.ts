'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/api';
import {
  CrawlerJob,
  CrawlerSource,
  LeadPreviewItem,
  PortPreset,
} from './crawlerTypes';

export function useCrawlerState() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [customLabel, setCustomLabel] = useState('Dubai Basmati Q1 Harvest');
  const [leadType, setLeadType] = useState<'importer' | 'supplier'>('importer');
  const [selectedCountryPreset, setSelectedCountryPreset] = useState('United Arab Emirates');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [city, setCity] = useState('Dubai');
  const [commodity, setCommodity] = useState('Basmati Rice');
  const [depth, setDepth] = useState(50);
  const [extractionNotes, setExtractionNotes] = useState(
    'High-priority Basmati wholesale buyers and registered trade licensees.'
  );

  const effectiveCountry =
    selectedCountryPreset === 'CUSTOM'
      ? customCountryInput.trim() || 'Global'
      : selectedCountryPreset;

  const [availableSources, setAvailableSources] = useState<CrawlerSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [sourceSearch, setSourceSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [loadingSources, setLoadingSources] = useState(false);
  const [enableGoogleDork, setEnableGoogleDork] = useState(true);
  const [customDorkQuery, setCustomDorkQuery] = useState('');
  const [enableProxyShield, setEnableProxyShield] = useState(true);

  const [activeJob, setActiveJob] = useState<CrawlerJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'leads'>('terminal');
  const [liveLeads, setLiveLeads] = useState<LeadPreviewItem[]>([]);
  const [loadingLiveLeads, setLoadingLiveLeads] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const [historyRuns, setHistoryRuns] = useState<CrawlerJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const lType = leadType === 'importer' ? 'Buyers' : 'Suppliers';
    if (!customLabel || customLabel.includes('Harvest') || customLabel.includes('Dubai Basmati Q1 Harvest')) {
      setCustomLabel(`${effectiveCountry} ${commodity} ${lType} Q1 Harvest`);
    }

    if (effectiveCountry === 'Togo' && (!city || city === 'Dubai')) {
      setCity('Lome');
    } else if (effectiveCountry === 'United Arab Emirates' && (!city || city === 'Lome')) {
      setCity('Dubai');
    } else if (effectiveCountry === 'Saudi Arabia' && (!city || city === 'Dubai' || city === 'Lome')) {
      setCity('Riyadh');
    } else if (effectiveCountry === 'India' && (!city || city === 'Dubai' || city === 'Lome')) {
      setCity('Kolkata');
    } else if (effectiveCountry === 'Singapore' && (!city || city === 'Dubai' || city === 'Lome')) {
      setCity('Singapore');
    }
  }, [commodity, effectiveCountry, leadType]);

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const params = new URLSearchParams();
      params.append('lead_type', leadType);
      if (effectiveCountry && effectiveCountry !== 'Global') {
        params.append('country', effectiveCountry);
      }
      const res = await fetchJson<{ sources: CrawlerSource[] }>(`/crawler/sources?${params.toString()}`);
      const list = res.sources || [];
      setAvailableSources(list);

      const allIds = new Set(list.map((s) => s.id));
      setSelectedSourceIds(allIds);
    } catch (e) {
      console.error('Failed to load sources:', e);
    } finally {
      setLoadingSources(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetchJson<{ history: CrawlerJob[] }>('/crawler/history?limit=30');
      setHistoryRuns(res.history || []);
    } catch (e) {
      console.error('Failed to load crawling history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadLiveJobLeads = async (jobId: number) => {
    try {
      setLoadingLiveLeads(true);
      const res = await fetchJson<{ leads?: LeadPreviewItem[]; items?: LeadPreviewItem[] }>(
        `/leads?job_id=${jobId}&limit=50`
      );
      const items = res.leads || res.items || [];
      setLiveLeads(items);
    } catch (e) {
      console.error('Failed to load live leads preview:', e);
    } finally {
      setLoadingLiveLeads(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const checkActiveJob = async () => {
      try {
        const res = await fetchJson<{ job: CrawlerJob | null }>('/scrape/jobs/live');
        if (res.job) {
          setActiveJob(res.job);
          if (res.job.status === 'running') {
            setCurrentStep(3);
          }
        }
      } catch (e) {
        // Silently catch background poll on mount
      }
    };
    checkActiveJob();
  }, []);

  useEffect(() => {
    if (currentStep !== 3 || !activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const jobId = activeJob.job_id;
        const res = await fetchJson<{ job: CrawlerJob }>(`/scrape/jobs/${jobId}`);
        if (res.job) {
          setActiveJob(res.job);
          if (res.job.status === 'completed' || res.job.status === 'failed') {
            loadHistory();
            loadLiveJobLeads(jobId);
          }
        }
      } catch (e) {
        console.error('Error polling active crawler job:', e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentStep, activeJob?.status, activeJob?.job_id]);

  useEffect(() => {
    if (currentStep === 3 && activeJob?.job_id && activeTab === 'leads') {
      loadLiveJobLeads(activeJob.job_id);
    }
  }, [currentStep, activeTab, activeJob?.job_id]);

  useEffect(() => {
    if (currentStep === 3 && activeTab === 'terminal' && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeJob?.logs?.length, currentStep, activeTab]);

  const handleProceedToStep2 = () => {
    loadSources();
    setCurrentStep(2);
  };

  const handleLaunchCrawler = async () => {
    try {
      setIsSubmitting(true);
      const selectedList = Array.from(selectedSourceIds);

      const payload = {
        lead_type: leadType,
        country: effectiveCountry,
        custom_city: city,
        commodity: commodity,
        depth: depth,
        custom_label: customLabel.trim() || 'Standard Harvest',
        extraction_notes: extractionNotes.trim(),
        selected_sources: selectedList.length > 0 ? selectedList : undefined,
        custom_dork: enableGoogleDork ? customDorkQuery.trim() : undefined,
        enable_proxy_shield: enableProxyShield,
      };

      const res = await fetchJson<{ job_id: number; status: string; message: string }>('/scrape/crawl-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.job_id) {
        const initialJob: CrawlerJob = {
          job_id: res.job_id,
          lead_type: leadType,
          country: effectiveCountry,
          commodity: commodity,
          depth: depth,
          custom_label: customLabel,
          status: 'running',
          progress_pct: 10,
          current_step: 'Crawler dispatched to background queue...',
          leads_found: 0,
          logs: [
            {
              timestamp: new Date().toISOString(),
              level: 'INFO',
              message: `Crawler job #${res.job_id} dispatched: ${customLabel}`,
              elapsed_seconds: 0,
            },
          ],
        };
        setActiveJob(initialJob);
        setCurrentStep(3);
        setActiveTab('terminal');
        loadHistory();
      }
    } catch (e: any) {
      alert(`Failed to launch crawler: ${e.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDorkModifier = (chipText: string) => {
    setCustomDorkQuery((prev) => {
      if (prev.includes(chipText)) {
        return prev.replace(chipText, '').trim();
      }
      return `${prev} ${chipText}`.trim();
    });
  };

  const resetDorkQuery = () => {
    const term = leadType === 'importer' ? 'importers' : 'manufacturers';
    setCustomDorkQuery(`intitle:"${term}" "${commodity}" "${effectiveCountry}" -filetype:pdf`);
  };

  const filteredSources = useMemo(() => {
    return availableSources.filter((s) => {
      if (selectedCategoryTab !== 'all') {
        const cat = s.category.toLowerCase();
        if (selectedCategoryTab === 'b2b' && !cat.includes('b2b') && !cat.includes('marketplace') && !cat.includes('portal')) return false;
        if (selectedCategoryTab === 'customs' && !cat.includes('customs') && !cat.includes('manifest') && !cat.includes('maritime') && !cat.includes('port')) return false;
        if (selectedCategoryTab === 'gov' && !cat.includes('government') && !cat.includes('authority') && !cat.includes('board') && !cat.includes('registry') && !cat.includes('ministry')) return false;
        if (selectedCategoryTab === 'geo' && !cat.includes('map') && !cat.includes('geospatial') && !cat.includes('directory')) return false;
      }
      if (!sourceSearch.trim()) return true;
      const q = sourceSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.country_coverage.toLowerCase().includes(q)
      );
    });
  }, [availableSources, sourceSearch, selectedCategoryTab]);

  const toggleSourceSelection = (id: string) => {
    const updated = new Set(selectedSourceIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedSourceIds(updated);
  };

  const selectAllSources = () => {
    const all = new Set(availableSources.map((s) => s.id));
    setSelectedSourceIds(all);
  };

  const deselectAllSources = () => {
    setSelectedSourceIds(new Set());
  };

  const selectCurrentCategoryOnly = () => {
    const ids = new Set(selectedSourceIds);
    filteredSources.forEach((s) => ids.add(s.id));
    setSelectedSourceIds(ids);
  };

  const applyCustomsManifestTrick = (portPreset: PortPreset) => {
    setLeadType('importer');
    setCommodity('Non-Basmati & Parboiled Rice (HS 100630)');
    setSelectedCountryPreset(portPreset.country);
    setCity(portPreset.city);
    setCustomLabel(`HS 100630 Manifest - ${portPreset.portName} (1-3 FCL SMEs)`);
    setDepth(50);
    setExtractionNotes(
      `The Reverse-Engineer Customs Data Trick: Target small-to-mid importers (1-3 containers/month, 25-75 MT) of HS 100630 rice landing at ${portPreset.portName}. Exclude giant conglomerates.`
    );
    setEnableGoogleDork(true);
    setCustomDorkQuery(`site:volza.com OR site:zauba.com OR site:importgenius.com "HS 100630" "${portPreset.portName}" "importer"`);
  };

  const cloneHistoricalRun = (run: CrawlerJob) => {
    if (run.custom_label) setCustomLabel(`${run.custom_label} (Re-run)`);
    if (run.lead_type === 'importer' || run.lead_type === 'supplier') setLeadType(run.lead_type);
    if (run.country) {
      setSelectedCountryPreset(run.country);
      if (run.country === 'Global') setSelectedCountryPreset('Global');
    }
    if (run.commodity) setCommodity(run.commodity);
    if (run.depth) setDepth(run.depth);
    setCurrentStep(1);
  };

  const navigateToLeadsFiltered = (job?: CrawlerJob) => {
    const targetJob = job || activeJob;
    const lType = targetJob?.lead_type === 'supplier' ? 'supplier' : 'importer';
    const cLabel = targetJob?.custom_label || customLabel;
    const cCountry = targetJob?.country || effectiveCountry;
    const jId = targetJob?.job_id;

    const params = new URLSearchParams();
    if (lType) params.append('lead_type', lType);
    if (cLabel) params.append('custom_label', cLabel);
    if (cCountry && cCountry !== 'Global') params.append('country', cCountry);
    if (jId) params.append('job_id', String(jId));

    const targetPath = lType === 'supplier' ? '/leads/suppliers' : '/leads/importers';
    router.push(`${targetPath}?${params.toString()}`);
  };

  const downloadCsvExport = (jobId?: number) => {
    const targetId = jobId ?? activeJob?.job_id;
    const params = new URLSearchParams();
    if (targetId) params.append('job_id', String(targetId));
    if (leadType) params.append('lead_type', leadType);
    window.open(`/api/leads/export?${params.toString()}`, '_blank');
  };

  const downloadJsonExport = async (jobId?: number) => {
    const targetId = jobId ?? activeJob?.job_id;
    try {
      const res = await fetchJson<{ leads: any[] }>(`/leads?job_id=${targetId}&limit=500`);
      const leads = res.leads || [];
      const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TradeLeads_Job_${targetId || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const crawlVelocity = useMemo(() => {
    if (!activeJob || !activeJob.elapsed_seconds || activeJob.elapsed_seconds <= 0) return '0.0';
    const found = activeJob.leads_found || activeJob.inserted_count || 0;
    return (found / activeJob.elapsed_seconds).toFixed(1);
  }, [activeJob?.leads_found, activeJob?.inserted_count, activeJob?.elapsed_seconds]);

  return {
    currentStep,
    setCurrentStep,
    customLabel,
    setCustomLabel,
    leadType,
    setLeadType,
    selectedCountryPreset,
    setSelectedCountryPreset,
    customCountryInput,
    setCustomCountryInput,
    city,
    setCity,
    commodity,
    setCommodity,
    depth,
    setDepth,
    extractionNotes,
    setExtractionNotes,
    effectiveCountry,
    availableSources,
    selectedSourceIds,
    sourceSearch,
    setSourceSearch,
    selectedCategoryTab,
    setSelectedCategoryTab,
    loadingSources,
    enableGoogleDork,
    setEnableGoogleDork,
    customDorkQuery,
    setCustomDorkQuery,
    enableProxyShield,
    setEnableProxyShield,
    activeJob,
    isSubmitting,
    activeTab,
    setActiveTab,
    liveLeads,
    loadingLiveLeads,
    terminalBottomRef,
    historyRuns,
    loadingHistory,
    filteredSources,
    crawlVelocity,
    loadHistory,
    handleProceedToStep2,
    handleLaunchCrawler,
    toggleDorkModifier,
    resetDorkQuery,
    toggleSourceSelection,
    selectAllSources,
    deselectAllSources,
    selectCurrentCategoryOnly,
    applyCustomsManifestTrick,
    cloneHistoricalRun,
    navigateToLeadsFiltered,
    downloadCsvExport,
    downloadJsonExport,
  };
}
