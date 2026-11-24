'use client';

import React, { Suspense } from 'react';
import Shell from '@/components/Shell';
import { useTheme } from '@/context/ThemeContext';
import { Compass, Check, Loader2 } from 'lucide-react';
import { useCrawlerState } from '@/components/crawler/useCrawlerState';
import CrawlerStep1Config from '@/components/crawler/CrawlerStep1Config';
import CrawlerStep2Sources from '@/components/crawler/CrawlerStep2Sources';
import CrawlerStep3Execution from '@/components/crawler/CrawlerStep3Execution';
import CrawlerHistoryDrawer from '@/components/crawler/CrawlerHistoryDrawer';

function CrawlerStepperContent() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';
  const state = useCrawlerState();

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
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

          <div className="flex items-center gap-2 text-xs">
            <div
              onClick={() => state.activeJob?.status !== 'running' && state.setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                state.currentStep === 1
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold shadow-sm shadow-blue-500/10'
                  : state.currentStep > 1
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                {state.currentStep > 1 ? <Check className="w-3 h-3 text-emerald-400" /> : '1'}
              </span>
              <span>1. Campaign Setup</span>
            </div>

            <div className="w-4 h-0.5 bg-slate-800" />

            <div
              onClick={() => state.activeJob?.status !== 'running' && state.currentStep > 1 && state.setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                state.currentStep === 2
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold shadow-sm shadow-blue-500/10'
                  : state.currentStep > 2
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                {state.currentStep > 2 ? <Check className="w-3 h-3 text-emerald-400" /> : '2'}
              </span>
              <span>2. Sources &amp; Shield</span>
            </div>

            <div className="w-4 h-0.5 bg-slate-800" />

            <div
              onClick={() => state.activeJob && state.setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                state.currentStep === 3
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold shadow-sm shadow-blue-500/10'
                  : state.activeJob
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10">
                {state.activeJob?.status === 'completed' ? <Check className="w-3 h-3 text-emerald-400" /> : '3'}
              </span>
              <span>3. Background Monitor</span>
            </div>
          </div>
        </div>

        {state.currentStep === 1 && (
          <CrawlerStep1Config
            customLabel={state.customLabel}
            setCustomLabel={state.setCustomLabel}
            leadType={state.leadType}
            setLeadType={state.setLeadType}
            selectedCountryPreset={state.selectedCountryPreset}
            setSelectedCountryPreset={state.setSelectedCountryPreset}
            customCountryInput={state.customCountryInput}
            setCustomCountryInput={state.setCustomCountryInput}
            city={state.city}
            setCity={state.setCity}
            commodity={state.commodity}
            setCommodity={state.setCommodity}
            depth={state.depth}
            setDepth={state.setDepth}
            extractionNotes={state.extractionNotes}
            setExtractionNotes={state.setExtractionNotes}
            onApplyCustomsManifestTrick={state.applyCustomsManifestTrick}
            onProceed={state.handleProceedToStep2}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}

        {state.currentStep === 2 && (
          <CrawlerStep2Sources
            isLight={isLight}
            enableGoogleDork={state.enableGoogleDork}
            setEnableGoogleDork={state.setEnableGoogleDork}
            customDorkQuery={state.customDorkQuery}
            setCustomDorkQuery={state.setCustomDorkQuery}
            onToggleDorkModifier={state.toggleDorkModifier}
            onResetDorkQuery={state.resetDorkQuery}
            enableProxyShield={state.enableProxyShield}
            setEnableProxyShield={state.setEnableProxyShield}
            availableSources={state.availableSources}
            selectedSourceIds={state.selectedSourceIds}
            onToggleSourceSelection={state.toggleSourceSelection}
            onSelectAllSources={state.selectAllSources}
            onDeselectAllSources={state.deselectAllSources}
            onSelectCurrentCategoryOnly={state.selectCurrentCategoryOnly}
            filteredSources={state.filteredSources}
            sourceSearch={state.sourceSearch}
            setSourceSearch={state.setSourceSearch}
            selectedCategoryTab={state.selectedCategoryTab}
            setSelectedCategoryTab={state.setSelectedCategoryTab}
            loadingSources={state.loadingSources}
            effectiveCountry={state.effectiveCountry}
            city={state.city}
            depth={state.depth}
            isSubmitting={state.isSubmitting}
            onBack={() => state.setCurrentStep(1)}
            onLaunch={state.handleLaunchCrawler}
          />
        )}

        {state.currentStep === 3 && (
          <CrawlerStep3Execution
            isLight={isLight}
            activeJob={state.activeJob}
            customLabel={state.customLabel}
            effectiveCountry={state.effectiveCountry}
            commodity={state.commodity}
            depth={state.depth}
            liveLeads={state.liveLeads}
            loadingLiveLeads={state.loadingLiveLeads}
            activeTab={state.activeTab}
            setActiveTab={state.setActiveTab}
            terminalBottomRef={state.terminalBottomRef}
            crawlVelocity={state.crawlVelocity}
            onNewHarvest={() => state.setCurrentStep(1)}
            onExportCsv={state.downloadCsvExport}
            onExportJson={state.downloadJsonExport}
            onGoToLeads={state.navigateToLeadsFiltered}
          />
        )}

        <CrawlerHistoryDrawer
          isLight={isLight}
          historyRuns={state.historyRuns}
          loadingHistory={state.loadingHistory}
          onRefresh={state.loadHistory}
          onSelectRun={state.navigateToLeadsFiltered}
          onCloneRun={state.cloneHistoricalRun}
          onExportCsv={state.downloadCsvExport}
        />
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
