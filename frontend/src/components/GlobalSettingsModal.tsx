'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, SettingsTab } from '@/context/ThemeContext';
import {
  X,
  Settings,
  Palette,
  Mail,
  Globe,
  DollarSign,
  GitBranch,
} from 'lucide-react';
import { useGlobalSettingsData } from './settings/global/useGlobalSettingsData';
import ModalAppearanceTab from './settings/global/ModalAppearanceTab';
import ModalSmtpTab from './settings/global/ModalSmtpTab';
import ModalCrawlerTab from './settings/global/ModalCrawlerTab';
import ModalPricingTab from './settings/global/ModalPricingTab';
import ModalStagesTab from './settings/global/ModalStagesTab';

export default function GlobalSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, settingsTab, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<SettingsTab>(settingsTab || 'appearance');

  const {
    smtp,
    setSmtp,
    showPassword,
    setShowPassword,
    testingSmtp,
    smtpStatusMsg,
    handleSaveSmtp,
    handleTestSmtp,
    crawler,
    setCrawler,
    isCrawling,
    crawlStatusMsg,
    handleSaveCrawler,
    handleTriggerInstantCrawl,
    quotes,
    handleAddCompetitorQuote,
    handleDeleteCompetitorQuote,
    pipelineStages,
    shipmentStages,
  } = useGlobalSettingsData(isOpen);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(settingsTab);
    }
  }, [isOpen, settingsTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Theme & Layout', icon: <Palette className="w-4 h-4 text-purple-400" /> },
    { id: 'smtp', label: 'Gmail SMTP Gateway', icon: <Mail className="w-4 h-4 text-blue-400" /> },
    { id: 'crawler', label: 'Directory Crawlers', icon: <Globe className="w-4 h-4 text-emerald-400" /> },
    { id: 'pricing', label: 'Competitor Pricing', icon: <DollarSign className="w-4 h-4 text-amber-400" /> },
    { id: 'stages', label: 'Lifecycle Stages', icon: <GitBranch className="w-4 h-4 text-cyan-400" /> },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 transition-all"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
        }`}
      >
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${accentClasses.gradient} flex items-center justify-center text-white shadow-md`}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Global System Preferences & Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Centralized control for styling, Gmail SMTP, automated directory crawlers, and competitor intelligence.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800/40 px-5 text-xs font-semibold overflow-x-auto gap-5 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? `${accentClasses.border} ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-6 text-xs">
          {activeTab === 'appearance' && (
            <ModalAppearanceTab isLight={isLight} accentClasses={accentClasses} />
          )}

          {activeTab === 'smtp' && (
            <ModalSmtpTab
              smtp={smtp}
              setSmtp={setSmtp}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              testingSmtp={testingSmtp}
              smtpStatusMsg={smtpStatusMsg}
              onSaveSmtp={handleSaveSmtp}
              onTestSmtp={handleTestSmtp}
              onCloseModal={onClose}
              isLight={isLight}
              accentClasses={accentClasses}
            />
          )}

          {activeTab === 'crawler' && crawler && (
            <ModalCrawlerTab
              crawler={crawler}
              setCrawler={setCrawler}
              isCrawling={isCrawling}
              crawlStatusMsg={crawlStatusMsg}
              onTriggerInstantCrawl={handleTriggerInstantCrawl}
              onSaveCrawler={handleSaveCrawler}
              isLight={isLight}
              accentClasses={accentClasses}
            />
          )}

          {activeTab === 'pricing' && (
            <ModalPricingTab
              quotes={quotes}
              onDeleteQuote={handleDeleteCompetitorQuote}
              onAddQuote={handleAddCompetitorQuote}
              isLight={isLight}
            />
          )}

          {activeTab === 'stages' && (
            <ModalStagesTab
              pipelineStages={pipelineStages}
              shipmentStages={shipmentStages}
              isLight={isLight}
            />
          )}
        </div>
      </div>
    </div>
  );
}
