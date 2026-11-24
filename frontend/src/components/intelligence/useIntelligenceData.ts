'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchJson } from '@/lib/api';
import {
  IntelligenceTab,
  IntelligenceSummary,
  Competitor,
  FreightRoute,
  PriceBenchmark,
  TariffRule,
  CompetitorQuote,
  CompetitorFormData,
  QuoteFormData,
  RouteFormData,
  PriceFormData,
} from './intelligenceTypes';

export function useIntelligenceData() {
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('competitors');
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorQuotes, setCompetitorQuotes] = useState<CompetitorQuote[]>([]);
  const [freight, setFreight] = useState<FreightRoute[]>([]);
  const [pricing, setPricing] = useState<PriceBenchmark[]>([]);
  const [tariffs, setTariffs] = useState<TariffRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddPrice, setShowAddPrice] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddCompetitor(false);
        setShowAddQuote(false);
        setShowAddRoute(false);
        setShowAddPrice(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qTab = new URLSearchParams(window.location.search).get('tab');
      if (qTab && ['competitors', 'quotes', 'freight', 'pricing', 'tariffs'].includes(qTab)) {
        setActiveTab(qTab as IntelligenceTab);
      }
    }
  }, []);

  const loadAllIntel = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, compRes, quotesRes, frtRes, prcRes, trfRes] = await Promise.all([
        fetchJson<IntelligenceSummary>('/intelligence/summary'),
        fetchJson<{ competitors: Competitor[] }>('/intelligence/competitors'),
        fetchJson<{ competitor_quotes: CompetitorQuote[] }>('/intelligence/competitor-pricing'),
        fetchJson<{ freight_index: FreightRoute[] }>('/intelligence/freight'),
        fetchJson<{ price_benchmarks: PriceBenchmark[] }>('/intelligence/pricing'),
        fetchJson<{ tariffs: TariffRule[] }>('/intelligence/tariffs'),
      ]);
      setSummary(sumRes);
      setCompetitors(compRes.competitors || []);
      setCompetitorQuotes(quotesRes.competitor_quotes || []);
      setFreight(frtRes.freight_index || []);
      setPricing(prcRes.price_benchmarks || []);
      setTariffs(trfRes.tariffs || []);
    } catch (e) {
      console.error('Failed to load intelligence data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllIntel();
  }, [loadAllIntel]);

  const handleAddCompetitor = async (formData: CompetitorFormData) => {
    await fetchJson('/intelligence/competitors', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        primary_export_markets: formData.primary_export_markets.split(',').map((s) => s.trim()),
        export_ports: formData.export_ports.split(',').map((s) => s.trim()),
      }),
    });
    await loadAllIntel();
  };

  const handleAddQuote = async (formData: QuoteFormData) => {
    await fetchJson('/intelligence/competitor-pricing', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    await loadAllIntel();
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this competitor quote?')) return;
    try {
      await fetchJson(`/intelligence/competitor-pricing/${quoteId}`, { method: 'DELETE' });
      await loadAllIntel();
    } catch (err: any) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  const handleAddRoute = async (formData: RouteFormData) => {
    await fetchJson('/intelligence/freight', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    await loadAllIntel();
  };

  const handleAddPrice = async (formData: PriceFormData) => {
    await fetchJson('/intelligence/pricing', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    await loadAllIntel();
  };

  return {
    activeTab,
    setActiveTab,
    summary,
    competitors,
    competitorQuotes,
    freight,
    pricing,
    tariffs,
    loading,
    showAddCompetitor,
    setShowAddCompetitor,
    showAddQuote,
    setShowAddQuote,
    showAddRoute,
    setShowAddRoute,
    showAddPrice,
    setShowAddPrice,
    loadAllIntel,
    handleAddCompetitor,
    handleAddQuote,
    handleDeleteQuote,
    handleAddRoute,
    handleAddPrice,
  };
}
