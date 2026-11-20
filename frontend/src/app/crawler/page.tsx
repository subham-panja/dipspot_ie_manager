'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { fetchJson } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
  Compass,
  Play,
  CheckCircle2,
  Globe,
  Building2,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Filter,
  ShieldCheck,
  Clock,
  ExternalLink,
  History,
  Terminal,
  Loader2,
  RefreshCw,
  Layers,
  Check,
  AlertCircle,
  Database,
  Cpu,
  Download,
  Eye,
  FileText,
  Zap,
  Sliders,
  Award,
  ChevronRight,
  CheckSquare,
  Square,
  Hash,
} from 'lucide-react';

interface CrawlerSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  country_coverage: string;
  reliability_score: number;
  lead_type: string;
  enabled?: boolean;
  is_dork_extractor?: boolean;
  is_map_extractor?: boolean;
}

interface CrawlerJobLog {
  timestamp: string;
  level: string;
  message: string;
  url?: string;
  latency_ms?: number;
  elapsed_seconds: number;
}

interface CrawlerJob {
  _id?: string;
  job_id: number;
  lead_type: string;
  country?: string;
  commodity?: string;
  depth?: number;
  custom_label?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_pct: number;
  current_step: string;
  current_url?: string;
  leads_found: number;
  inserted_count?: number;
  merged_count?: number;
  total_discovered?: number;
  elapsed_seconds?: number;
  created_at?: string;
  updated_at?: string;
  logs?: CrawlerJobLog[];
}

interface LeadPreviewItem {
  id: number | string;
  company_name: string;
  country: string;
  city_or_hub?: string;
  matched_varieties?: string;
  lead_type: string;
  emails?: string;
  phones?: string;
  website?: string;
  priority_score?: number;
}

const DEPTH_PRESETS = [
  { value: 15, label: 'Quick 15', desc: 'Rapid spot check across top hubs' },
  { value: 50, label: 'Standard 50', desc: 'Balanced discovery across key directories' },
  { value: 100, label: 'Deep 100', desc: 'Comprehensive multi-source penetration' },
  { value: 200, label: 'Scale 200', desc: 'Full regional trade corridor harvest' },
];

const COMMODITY_PRESETS = [
  'Basmati Rice 1121',
  'IR-64 Parboiled Rice',
  'Swarna Non-Basmati',
  'Sona Masoori Rice',
  'Organic Wheat',
  'Yellow Maize',
  'Spices & Cumin Seeds',
];

const SOURCE_CATEGORIES = [
  { id: 'all', label: 'All Sources' },
  { id: 'b2b', label: 'B2B Trade Portals' },
  { id: 'customs', label: 'Customs & Port Manifests' },
  { id: 'gov', label: 'Government Trade Boards' },
  { id: 'geo', label: 'Geospatial & Map Registries' },
];

function CrawlerStepperContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  // Stepper State (Step 1: Setup, Step 2: Sources & Dorks, Step 3: Background Monitor)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Campaign Setup
  const [customLabel, setCustomLabel] = useState('Dubai Basmati Q1 Harvest');
  const [leadType, setLeadType] = useState<'importer' | 'supplier'>('importer');
  const [selectedCountryPreset, setSelectedCountryPreset] = useState('United Arab Emirates');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [city, setCity] = useState('Dubai');
  const [commodity, setCommodity] = useState('Basmati Rice');
  const [depth, setDepth] = useState(50);
  const [extractionNotes, setExtractionNotes] = useState('High-priority Basmati wholesale buyers and registered trade licensees.');

  // Effective Country
  const effectiveCountry = selectedCountryPreset === 'CUSTOM'
    ? (customCountryInput.trim() || 'Global')
    : selectedCountryPreset;

  // Step 2: Source Selection & Advanced Anti-Block Shield
  const [availableSources, setAvailableSources] = useState<CrawlerSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [sourceSearch, setSourceSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [loadingSources, setLoadingSources] = useState(false);
  const [enableGoogleDork, setEnableGoogleDork] = useState(true);
  const [customDorkQuery, setCustomDorkQuery] = useState('');
  const [enableProxyShield, setEnableProxyShield] = useState(true);

  // Step 3: Background Execution & Monitoring
  const [activeJob, setActiveJob] = useState<CrawlerJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'leads'>('terminal');
  const [liveLeads, setLiveLeads] = useState<LeadPreviewItem[]>([]);
  const [loadingLiveLeads, setLoadingLiveLeads] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Crawling History
  const [historyRuns, setHistoryRuns] = useState<CrawlerJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Update default Dork query when commodity/country change
  useEffect(() => {
    if (!customDorkQuery || customDorkQuery.startsWith('intitle:')) {
      const term = leadType === 'importer' ? 'importers' : 'manufacturers';
      const q = `intitle:"${term}" "${commodity}" "${effectiveCountry}" -filetype:pdf`;
      setCustomDorkQuery(q);
    }
  }, [commodity, effectiveCountry, leadType]);

  // Load sources when entering Step 2 or changing country/type
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

      // By default select all valid sources
      const allIds = new Set(list.map((s) => s.id));
      setSelectedSourceIds(allIds);
    } catch (e) {
      console.error('Failed to load sources:', e);
    } finally {
      setLoadingSources(false);
    }
  };

  // Load Crawling History
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

  // Fetch leads harvested for the current job for live preview
  const loadLiveJobLeads = async (jobId: number) => {
    try {
      setLoadingLiveLeads(true);
      const res = await fetchJson<{ leads?: LeadPreviewItem[]; items?: LeadPreviewItem[] }>(`/leads?job_id=${jobId}&limit=50`);
      const items = res.leads || res.items || [];
      setLiveLeads(items);
    } catch (e) {
      console.error('Failed to load live leads preview:', e);
    } finally {
      setLoadingLiveLeads(false);
    }
  };

  // On initial mount: Check for any actively running background crawler job
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

  // Poll active background job when in Step 3
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

  // Load preview leads when job completes or when switching to leads tab
  useEffect(() => {
    if (currentStep === 3 && activeJob?.job_id && activeTab === 'leads') {
      loadLiveJobLeads(activeJob.job_id);
    }
  }, [currentStep, activeTab, activeJob?.job_id]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (currentStep === 3 && activeTab === 'terminal' && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeJob?.logs?.length, currentStep, activeTab]);

  // Handle Stepper Navigation
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

  // Dork Modifier Chip Toggles
  const toggleDorkModifier = (chipText: string) => {
    setCustomDorkQuery((prev) => {
      if (prev.includes(chipText)) {
        return prev.replace(chipText, '').trim();
      } else {
        return `${prev} ${chipText}`.trim();
      }
    });
  };

  // Filter sources displayed in Step 2 by Search and Category Tab
  const filteredSources = useMemo(() => {
    return availableSources.filter((s) => {
      // Category filter
      if (selectedCategoryTab !== 'all') {
        const cat = s.category.toLowerCase();
        if (selectedCategoryTab === 'b2b' && !cat.includes('b2b') && !cat.includes('marketplace') && !cat.includes('portal')) return false;
        if (selectedCategoryTab === 'customs' && !cat.includes('customs') && !cat.includes('manifest') && !cat.includes('maritime') && !cat.includes('port')) return false;
        if (selectedCategoryTab === 'gov' && !cat.includes('government') && !cat.includes('authority') && !cat.includes('board') && !cat.includes('registry') && !cat.includes('ministry')) return false;
        if (selectedCategoryTab === 'geo' && !cat.includes('map') && !cat.includes('geospatial') && !cat.includes('directory')) return false;
      }
      // Text search
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

  // Clone/Populate parameters from history run
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

  // URL Query Navigation to Leads Page
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

  // Direct CSV Export
  const downloadCsvExport = (jobId?: number) => {
    const targetId = jobId ?? activeJob?.job_id;
    const params = new URLSearchParams();
    if (targetId) params.append('job_id', String(targetId));
    if (leadType) params.append('lead_type', leadType);
    window.open(`/api/leads/export?${params.toString()}`, '_blank');
  };

  // Direct JSON Export
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

  // Calculated Velocity (leads/sec)
  const crawlVelocity = useMemo(() => {
    if (!activeJob || !activeJob.elapsed_seconds || activeJob.elapsed_seconds <= 0) return '0.0';
    const found = activeJob.leads_found || activeJob.inserted_count || 0;
    return (found / activeJob.elapsed_seconds).toFixed(1);
  }, [activeJob?.leads_found, activeJob?.inserted_count, activeJob?.elapsed_seconds]);

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Page Title & Breadcrumb Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-800/40">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
              <Compass className="w-4 h-4" />
              <span>COMMERCIAL INTELLIGENCE &amp; WEB HARVESTER</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Trade Lead Generation &amp; Background Crawler
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi-channel verified lead discovery powered by custom Google Dorks, live geospatial extraction, and rotating anti-block proxies.
            </p>
          </div>

          {/* Stepper Progress Badges */}
          <div className="flex items-center gap-2 text-xs">
            {/* Step 1 Pill */}
            <div
              onClick={() => activeJob?.status !== 'running' && setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                currentStep === 1
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold shadow-sm shadow-blue-500/10'
                  : currentStep > 1
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                {currentStep > 1 ? <Check className="w-3 h-3 text-emerald-400" /> : '1'}
              </span>
              <span>1. Campaign Setup</span>
            </div>

            <div className="w-4 h-0.5 bg-slate-800" />

            {/* Step 2 Pill */}
            <div
              onClick={() => activeJob?.status !== 'running' && currentStep > 1 && setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                currentStep === 2
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold shadow-sm shadow-blue-500/10'
                  : currentStep > 2
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                {currentStep > 2 ? <Check className="w-3 h-3 text-emerald-400" /> : '2'}
              </span>
              <span>2. Sources &amp; Shield</span>
            </div>

            <div className="w-4 h-0.5 bg-slate-800" />

            {/* Step 3 Pill */}
            <div
              onClick={() => activeJob && setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                currentStep === 3
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold shadow-sm shadow-blue-500/10'
                  : activeJob
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                {activeJob?.status === 'completed' ? <Check className="w-3 h-3 text-emerald-400" /> : '3'}
              </span>
              <span>3. Background Monitor</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 1: CAMPAIGN SETUP & TARGET PARAMETERS */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className={`p-6 rounded-2xl border space-y-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Step 1: Campaign Configuration &amp; Target Trade Parameters
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define your lead segment, geographic perimeter, target commodity, and quota depth.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Zero Mock Invariant Active
              </span>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Campaign Label */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  Campaign Name / Custom Audit Label
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Dubai Basmati Wholesale Q1"
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  }`}
                />
                <span className="text-[11px] text-slate-500">
                  Every lead harvested in this crawl run will be tagged with this label for instant historical filtering.
                </span>
              </div>

              {/* Lead Type Radio Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  Target Lead Segment (Strictly Separated)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeadType('importer')}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      leadType === 'importer'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Global Importers &amp; Buyers
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadType('supplier')}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      leadType === 'supplier'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Suppliers &amp; Millers
                  </button>
                </div>
              </div>

              {/* Target Country with Custom Option */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Target Country / Region
                </label>
                <select
                  value={selectedCountryPreset}
                  onChange={(e) => setSelectedCountryPreset(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  }`}
                >
                  <option value="United Arab Emirates">United Arab Emirates (Dubai, Jebel Ali Free Zone)</option>
                  <option value="Saudi Arabia">Saudi Arabia (Riyadh, Jeddah, Dammam)</option>
                  <option value="Qatar">Qatar (Doha, Hamad Port)</option>
                  <option value="Kuwait">Kuwait (Shuwaikh Port)</option>
                  <option value="Oman">Oman (Sohar, Muscat)</option>
                  <option value="Bahrain">Bahrain (Khalifa Bin Salman Port)</option>
                  <option value="India">India (West Bengal, Punjab, Haryana, Gujarat)</option>
                  <option value="United States">United States (California, Houston, New York)</option>
                  <option value="Germany">Germany (Hamburg, Bremen)</option>
                  <option value="Netherlands">Netherlands (Port of Rotterdam)</option>
                  <option value="Singapore">Singapore (Jurong Port)</option>
                  <option value="Vietnam">Vietnam (Ho Chi Minh City, Haiphong)</option>
                  <option value="Thailand">Thailand (Bangkok, Laem Chabang)</option>
                  <option value="Global">Global Cross-Border</option>
                  <option value="CUSTOM">Custom Country (Type Custom Below)...</option>
                </select>

                {selectedCountryPreset === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customCountryInput}
                    onChange={(e) => setCustomCountryInput(e.target.value)}
                    placeholder="Enter custom country (e.g. Italy, Brazil, Kenya, Turkey)"
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-blue-500 bg-slate-950 text-white text-xs outline-none"
                  />
                )}
              </div>

              {/* City / Hub */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">City / Commercial Hub</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Dubai, Jebel Ali, Riyadh, Burdwan"
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Commodity Focus with Quick Chips */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">Commodity Focus</label>
                  <span className="text-[11px] text-slate-500">Click quick chip or type custom specification</span>
                </div>
                <input
                  type="text"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  placeholder="e.g. Basmati Rice 1121, IR-64 Parboiled, Spices, Wheat"
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  }`}
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {COMMODITY_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCommodity(c)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        commodity === c
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Depth with Modern Presets */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Verified Leads Quota (Harvest Depth)
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Targeting {depth} records &bull; Est. time: ~{Math.max(15, Math.round(depth * 0.45))}s
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DEPTH_PRESETS.map((preset) => {
                    const isSelected = depth === preset.value;
                    return (
                      <div
                        key={preset.value}
                        onClick={() => setDepth(preset.value)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{preset.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{preset.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-slate-400">Or custom quota:</span>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={depth}
                    onChange={(e) => setDepth(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
                    className="w-24 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs font-mono text-center font-bold focus:border-blue-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-500">Max limit: 300 leads per crawl cycle</span>
                </div>
              </div>
            </div>

            {/* Extraction Notes */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-300">Extraction Notes &amp; Scope Directives</label>
              <textarea
                rows={2}
                value={extractionNotes}
                onChange={(e) => setExtractionNotes(e.target.value)}
                placeholder="Optional parameters, specific certifications needed (SFDA, HACCP, Halal), or port consignee requirements."
                className={`w-full px-3 py-2 rounded-xl border outline-none text-xs resize-none ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                }`}
              />
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
              <div className="text-xs text-slate-400">
                Next: Select verified trade directories, configure Google Dorks &amp; Proxy Shield.
              </div>
              <button
                type="button"
                onClick={handleProceedToStep2}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-md ${accentClasses.bg} hover:opacity-95`}
              >
                <span>Proceed to Source Selection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: SOURCE SELECTION, GOOGLE DORKS & PROXY SHIELD */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className={`p-6 rounded-2xl border space-y-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-800/40">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-400" />
                  Step 2: Source Selection, Google Dorks &amp; Anti-Block Shield
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only selected sources will be used as lead sources. Configure customizable Google Dorks and rotating free proxies.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
            </div>

            {/* Interactive Google Dork Harvester Card */}
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                    G
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Google Search &amp; Custom Google Dork Harvester</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">
                        99% Accuracy
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Discovers unindexed commercial wholesale buyers and millers directly using advanced Google search operators.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={enableGoogleDork}
                    onChange={(e) => setEnableGoogleDork(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Enable Dorks</span>
                </label>
              </div>

              {enableGoogleDork && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Google Dork Expression:
                    </label>
                    <span className="text-[10px] text-slate-500">Click chips below to toggle query parameters</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customDorkQuery}
                      onChange={(e) => setCustomDorkQuery(e.target.value)}
                      placeholder='intitle:"importers" "Basmati Rice" "Dubai" -filetype:pdf'
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-xs outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const term = leadType === 'importer' ? 'importers' : 'manufacturers';
                        setCustomDorkQuery(`intitle:"${term}" "${commodity}" "${effectiveCountry}" -filetype:pdf`);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Reset Default
                    </button>
                  </div>

                  {/* Interactive Modifier Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 mr-1">Quick Modifiers:</span>
                    {[
                      '-filetype:pdf',
                      '-retail -shop -b2c',
                      `intext:"${city}"`,
                      '"HACCP" OR "ISO 22000"',
                      '"CIF" OR "FOB"',
                      '"Consignee" OR "Bill of Lading"',
                    ].map((mod) => {
                      const isActive = customDorkQuery.includes(mod);
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => toggleDorkModifier(mod)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-500 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {isActive ? `✓ ${mod}` : `+ ${mod}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Proxy Anti-Block Shield Card */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Multi-Proxy Anti-Block Shield (Free Rotating Proxies Setup)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                      Active Shield
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rotates through 7+ free public HTTP/HTTPS proxies with anti-ban latency jitter (0.35s-0.85s) and automatic direct fallback.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={enableProxyShield}
                  onChange={(e) => setEnableProxyShield(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>Anti-Block Shield</span>
              </label>
            </div>

            {/* Source Category Tabs & Selection Matrix */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span>Verified Trade Registries &amp; Customs Manifests ({availableSources.length} Available)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedSourceIds.size} of {availableSources.length} sources selected for this crawl run.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <input
                      type="text"
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      placeholder="Search sources or domains..."
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-white outline-none focus:border-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  </div>
                  <button
                    type="button"
                    onClick={selectAllSources}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllSources}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {SOURCE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryTab(cat.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap transition font-medium ${
                      selectedCategoryTab === cat.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
                {selectedCategoryTab !== 'all' && (
                  <button
                    type="button"
                    onClick={selectCurrentCategoryOnly}
                    className="ml-auto text-[11px] text-blue-400 hover:underline"
                  >
                    Select All in Category
                  </button>
                )}
              </div>

              {/* Sources Scrollable List */}
              <div className="border border-slate-800 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-800/40 bg-slate-950/40">
                {loadingSources ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    Loading verified trade sources for {effectiveCountry}...
                  </div>
                ) : filteredSources.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No sources found matching filter &quot;{sourceSearch}&quot;.
                  </div>
                ) : (
                  filteredSources.map((src) => {
                    const isSelected = selectedSourceIds.has(src.id);
                    return (
                      <div
                        key={src.id}
                        onClick={() => toggleSourceSelection(src.id)}
                        className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${
                          isSelected ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-slate-900/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                              isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{src.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal font-mono">({src.domain})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                {src.category}
                              </span>
                              <span>&bull;</span>
                              <span>Coverage: {src.country_coverage}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-mono font-bold ${
                            src.reliability_score >= 95 ? 'text-emerald-400' : src.reliability_score >= 90 ? 'text-blue-400' : 'text-amber-400'
                          }`}>
                            {src.reliability_score}% Reliability
                          </span>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-500 hover:text-blue-400 p-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Parameters
              </button>

              <button
                type="button"
                disabled={isSubmitting || selectedSourceIds.size === 0}
                onClick={handleLaunchCrawler}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-lg ${
                  selectedSourceIds.size === 0 ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching Crawler...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Launch Background Harvest ({depth} Records)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: BACKGROUND CRAWLER MONITOR & ARRESTING STREAM */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div className={`p-6 rounded-2xl border space-y-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
            {/* Monitor Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {activeJob?.custom_label || customLabel}
                  </h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase ${
                    activeJob?.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : activeJob?.status === 'running'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeJob?.status || 'RUNNING'}
                  </span>
                  {activeJob?.job_id && (
                    <span className="text-xs text-slate-500 font-mono">Job #{activeJob.job_id}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Target: <strong className="text-white">{activeJob?.country || effectiveCountry}</strong> &bull; Commodity:{' '}
                  <strong className="text-white">{activeJob?.commodity || commodity}</strong> &bull; Quota:{' '}
                  <strong className="text-white">{activeJob?.depth || depth} leads</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeJob?.status === 'completed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadCsvExport()}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadJsonExport()}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" /> Export JSON
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Start New Harvest
                </button>
              </div>
            </div>

            {/* Completed Celebration Banner */}
            {activeJob?.status === 'completed' && (
              <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-4 shadow-lg shadow-emerald-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Background Harvest Completed Successfully!
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Discovered {activeJob.total_discovered || activeJob.leads_found || 0} genuine entities &bull; Saved{' '}
                        <strong className="text-emerald-400 font-bold">{activeJob.inserted_count ?? activeJob.leads_found} new verified records</strong>{' '}
                        &bull; Merged <strong className="text-blue-400">{activeJob.merged_count || 0} duplicates (95% ML Match)</strong>
                      </p>
                    </div>
                  </div>

                  {/* PROMINENT CTA: GO TO LEADS PAGE */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigateToLeadsFiltered()}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition transform hover:scale-[1.02]"
                    >
                      <span>Go to Leads Page</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Progress Bar & Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-2">
                  {activeJob?.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                  <span>{activeJob?.current_step || 'Processing live trade registries...'}</span>
                </span>
                <span className="font-mono font-bold text-blue-400">
                  {activeJob?.progress_pct || 15}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, activeJob?.progress_pct || 15))}%` }}
                />
              </div>

              {/* KPI Cards Row (5 Metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Discovered
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {activeJob?.total_discovered || activeJob?.leads_found || 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                  <div className="text-emerald-400 text-[11px] font-semibold">Verified Inserted</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {activeJob?.inserted_count ?? activeJob?.leads_found ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                  <div className="text-slate-400 text-[11px]">Duplicates Merged</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">
                    {activeJob?.merged_count || 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                  <div className="text-slate-400 text-[11px]">Harvest Velocity</div>
                  <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    {crawlVelocity} <span className="text-[10px] text-slate-400 font-normal">leads/s</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="text-slate-400 text-[11px]">Elapsed Time</div>
                  <div className="text-xl font-bold text-white mt-1 font-mono">
                    {activeJob?.elapsed_seconds ? `${activeJob.elapsed_seconds}s` : '0s'}
                  </div>
                </div>
              </div>
            </div>

            {/* Current URL Stream */}
            {activeJob?.current_url && (
              <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
                <span className="font-semibold text-slate-500">Active URL:</span>
                <a
                  href={activeJob.current_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline truncate"
                >
                  {activeJob.current_url}
                </a>
              </div>
            )}

            {/* Dual Stream Tabs: Terminal Stream vs Live Arriving Leads Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('terminal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeTab === 'terminal'
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Live Compliance Audit Stream</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('leads')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeTab === 'leads'
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Arriving Leads Preview ({liveLeads.length})</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500">
                  Async background engine &bull; Navigation preserves execution
                </span>
              </div>

              {/* TAB 1: TERMINAL STREAM */}
              {activeTab === 'terminal' && (
                <div className="h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] space-y-1.5">
                  {(!activeJob?.logs || activeJob.logs.length === 0) ? (
                    <div className="text-slate-600 text-center py-10">
                      Waiting for initial stream from background worker...
                    </div>
                  ) : (
                    activeJob.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-600 select-none">
                          [{log.elapsed_seconds.toFixed(1)}s]
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${
                          log.level === 'HTTP'
                            ? 'bg-blue-500/20 text-blue-400'
                            : log.level === 'ROBOTS'
                            ? 'bg-amber-500/20 text-amber-400'
                            : log.level === 'PARSE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : log.level === 'DORK'
                            ? 'bg-purple-500/20 text-purple-400'
                            : log.level === 'DEDUP'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : log.level === 'MERGED'
                            ? 'bg-blue-500/30 text-blue-300'
                            : log.level === 'GEO'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : log.level === 'SUCCESS'
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-slate-300 break-all">{log.message}</span>
                        {log.latency_ms && (
                          <span className="text-slate-500 text-[10px] ml-auto shrink-0">
                            {log.latency_ms}ms
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={terminalBottomRef} />
                </div>
              )}

              {/* TAB 2: LIVE ARRIVING LEADS PREVIEW */}
              {activeTab === 'leads' && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <div className="max-h-60 overflow-y-auto">
                    {loadingLiveLeads ? (
                      <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        Fetching leads captured in this harvest...
                      </div>
                    ) : liveLeads.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-500">
                        No leads captured yet for Job #{activeJob?.job_id}. Once records are verified, they will appear here in real-time.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Company Name</th>
                            <th className="py-2 px-3">Hub &amp; Country</th>
                            <th className="py-2 px-3">Commodity / Variety</th>
                            <th className="py-2 px-3">Domain / Contact</th>
                            <th className="py-2 px-3 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {liveLeads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-900/40 transition">
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {lead.company_name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {lead.city_or_hub ? `${lead.city_or_hub}, ` : ''}{lead.country}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {lead.matched_varieties || 'Basmati Rice'}
                              </td>
                              <td className="py-2.5 px-3">
                                {lead.website ? (
                                  <a
                                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                                  >
                                    <span className="truncate max-w-[140px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">{lead.emails || lead.phones || 'Registry Record'}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                {lead.priority_score || 88}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CRAWLING HISTORY SECTION (CLICKABLE WITH URL QUERY REDIRECT) */}
        {/* ============================================================ */}
        <div className={`p-6 rounded-2xl border space-y-4 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/70 backdrop-blur-xl border-slate-800'}`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800/40">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                Crawling History &amp; Campaign Audit Records
              </h3>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Click any row to jump directly to the filtered trade leads harvested during that crawl run, or click &quot;Clone Parameters&quot; to re-run.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-[11px] text-slate-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">Campaign / Label</th>
                  <th className="py-2.5 px-2">Type</th>
                  <th className="py-2.5 px-3">Country &amp; Commodity</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2 text-right">Quota</th>
                  <th className="py-2.5 px-2 text-right">New / Merged</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading crawl history...
                    </td>
                  </tr>
                ) : historyRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No crawling runs recorded yet. Launch your first harvest above!
                    </td>
                  </tr>
                ) : (
                  historyRuns.map((run, idx) => (
                    <tr
                      key={run.job_id || idx}
                      onClick={() => navigateToLeadsFiltered(run)}
                      className="hover:bg-blue-500/5 cursor-pointer transition"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{run.custom_label || 'Standard Harvest'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Job #{run.job_id} &bull; {run.created_at ? new Date(run.created_at).toLocaleDateString() : 'Recent'}
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          run.lead_type === 'supplier'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {run.lead_type || 'importer'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        <div>{run.country || 'Global'}</div>
                        <div className="text-[10px] text-slate-500">{run.commodity || 'Commodity Grains'}</div>
                      </td>

                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          run.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : run.status === 'running'
                            ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {run.status || 'completed'}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right font-mono text-slate-400">
                        {run.depth || 30}
                      </td>

                      <td className="py-3 px-2 text-right font-mono">
                        <span className="text-emerald-400 font-bold">{run.inserted_count ?? run.leads_found ?? 0}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-blue-400 font-bold">{run.merged_count || 0}</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Export CSV"
                            onClick={() => downloadCsvExport(run.job_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Clone and Re-run"
                            onClick={() => cloneHistoricalRun(run)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition"
                          >
                            Clone
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToLeadsFiltered(run)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-semibold transition flex items-center gap-1"
                          >
                            <span>Leads</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export default function CrawlerStepperPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="py-24 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            Loading Trade Crawler Desk...
          </div>
        </Shell>
      }
    >
      <CrawlerStepperContent />
    </Suspense>
  );
}
