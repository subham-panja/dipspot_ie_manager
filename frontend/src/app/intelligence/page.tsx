'use client';

import React from 'react';
import Shell from '@/components/Shell';
import PageLeftNav from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  Radar,
  Ship,
  TrendingUp,
  ShieldCheck,
  Plus,
  DollarSign,
  Building,
} from 'lucide-react';
import { useIntelligenceData } from '@/components/intelligence/useIntelligenceData';
import CompetitorsTab from '@/components/intelligence/CompetitorsTab';
import QuotesTab from '@/components/intelligence/QuotesTab';
import FreightRatesTab from '@/components/intelligence/FreightRatesTab';
import PricingBenchmarksTab from '@/components/intelligence/PricingBenchmarksTab';
import TariffsTab from '@/components/intelligence/TariffsTab';
import AddCompetitorModal from '@/components/intelligence/AddCompetitorModal';
import AddQuoteModal from '@/components/intelligence/AddQuoteModal';
import AddFreightModal from '@/components/intelligence/AddFreightModal';
import AddPriceModal from '@/components/intelligence/AddPriceModal';

export default function IntelligencePage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';
  const intel = useIntelligenceData();

  return (
    <Shell>
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Market &amp; Trade Intelligence
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Competitor Surveillance &amp; Freight Index</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Radar className={`w-6 h-6 ${accentClasses.text}`} />
            Competitive Intelligence &amp; Spot Pricing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of exporter spot offers, ocean freight TEU indices, commodity benchmarks, and customs policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => intel.setShowAddQuote(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} shadow-md transition flex items-center gap-1.5`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Competitor Quote</span>
          </button>
        </div>
      </div>

      {intel.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Avg 20ft Ocean Freight</span>
              <Ship className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              ${intel.summary.avg_freight_rate_20ft_usd} <span className="text-xs font-normal text-slate-400">/ TEU</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Port of Origin to UAE / Saudi</div>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Benchmark FOB Price</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              ${intel.summary.avg_fob_price_usd_mt} <span className="text-xs font-normal text-slate-400">/ MT</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Export Port Gateways</div>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Competitor Volume</span>
              <Building className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">
              {intel.summary.total_competitor_monthly_volume_mt.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">MT/mo</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{intel.summary.total_tracked_competitors} major exporters monitored</div>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Tariff &amp; HS Codes</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {intel.summary.total_tariff_codes} Codes
            </div>
            <div className="text-xs text-slate-400 mt-1">Export policy &amp; duty rules</div>
          </div>
        </div>
      )}

      <PageLeftNav
        title="Intelligence Scope"
        subtitle="Market Watch &amp; Pricing"
        items={[
          {
            id: 'competitors',
            label: 'Competitor Surveillance',
            icon: <Building className="w-4 h-4" />,
            badge: intel.competitors.length,
            onClick: () => intel.setActiveTab('competitors'),
            active: intel.activeTab === 'competitors',
            desc: 'Profiles & supply capacities',
          },
          {
            id: 'quotes',
            label: 'Spot Pricing Matrix',
            icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
            badge: intel.competitorQuotes.length,
            onClick: () => intel.setActiveTab('quotes'),
            active: intel.activeTab === 'quotes',
            desc: 'FOB/CIF quote comparison',
          },
          {
            id: 'freight',
            label: 'Ocean Freight Index',
            icon: <Ship className="w-4 h-4 text-blue-400" />,
            badge: intel.freight.length,
            onClick: () => intel.setActiveTab('freight'),
            active: intel.activeTab === 'freight',
            desc: '20ft/40ft TEU benchmark rates',
          },
          {
            id: 'pricing',
            label: 'Commodity Benchmarks',
            icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
            badge: intel.pricing.length,
            onClick: () => intel.setActiveTab('pricing'),
            active: intel.activeTab === 'pricing',
            desc: 'Spot pricing & weekly deltas',
          },
          {
            id: 'tariffs',
            label: 'Customs & Tariffs',
            icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
            badge: intel.tariffs.length,
            onClick: () => intel.setActiveTab('tariffs'),
            active: intel.activeTab === 'tariffs',
            desc: 'Export duties & MEP rules',
          },
        ]}
        activeId={intel.activeTab}
      >
        {intel.activeTab === 'competitors' && (
          <CompetitorsTab
            competitors={intel.competitors}
            isLight={isLight}
            onAddCompetitor={() => intel.setShowAddCompetitor(true)}
          />
        )}

        {intel.activeTab === 'quotes' && (
          <QuotesTab
            quotes={intel.competitorQuotes}
            isLight={isLight}
            onAddQuote={() => intel.setShowAddQuote(true)}
            onDeleteQuote={intel.handleDeleteQuote}
          />
        )}

        {intel.activeTab === 'freight' && (
          <FreightRatesTab
            freight={intel.freight}
            isLight={isLight}
            onAddRoute={() => intel.setShowAddRoute(true)}
          />
        )}

        {intel.activeTab === 'pricing' && (
          <PricingBenchmarksTab
            pricing={intel.pricing}
            isLight={isLight}
            onAddPrice={() => intel.setShowAddPrice(true)}
          />
        )}

        {intel.activeTab === 'tariffs' && (
          <TariffsTab
            tariffs={intel.tariffs}
            isLight={isLight}
          />
        )}
      </PageLeftNav>

      <AddCompetitorModal
        isOpen={intel.showAddCompetitor}
        onClose={() => intel.setShowAddCompetitor(false)}
        onSubmit={intel.handleAddCompetitor}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <AddQuoteModal
        isOpen={intel.showAddQuote}
        onClose={() => intel.setShowAddQuote(false)}
        onSubmit={intel.handleAddQuote}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <AddFreightModal
        isOpen={intel.showAddRoute}
        onClose={() => intel.setShowAddRoute(false)}
        onSubmit={intel.handleAddRoute}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <AddPriceModal
        isOpen={intel.showAddPrice}
        onClose={() => intel.setShowAddPrice(false)}
        onSubmit={intel.handleAddPrice}
        isLight={isLight}
        accentClasses={accentClasses}
      />
    </Shell>
  );
}
