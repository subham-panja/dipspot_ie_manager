'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { useTheme } from '@/context/ThemeContext';
import {
  Settings,
  Building2,
  Cpu,
  Mail,
  MessageSquare,
  Palette,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Globe2,
  Compass,
} from 'lucide-react';
import { SettingsTabType } from '@/components/settings/settingsTypes';
import { useSettingsData } from '@/components/settings/useSettingsData';
import CompanyProfileTab from '@/components/settings/CompanyProfileTab';
import SourcesRegistryTab from '@/components/settings/SourcesRegistryTab';
import DeduplicationSettingsTab from '@/components/settings/DeduplicationSettingsTab';
import SmtpGatewayTab from '@/components/settings/SmtpGatewayTab';
import WhatsAppGatewayTab from '@/components/settings/WhatsAppGatewayTab';
import AppearanceTab from '@/components/settings/AppearanceTab';
import TrashBinTab from '@/components/settings/TrashBinTab';

export default function DedicatedSettingsPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<SettingsTabType>('company');
  const d = useSettingsData();

  useEffect(() => {
    if (activeTab === 'trash') d.loadTrash();
  }, [activeTab]);

  const navTabs = [
    { id: 'company', label: 'Company & EXIM Profile', icon: <Building2 className="w-4 h-4" /> },
    {
      id: 'sources',
      label: 'Data Sources & Registries',
      icon: <Compass className="w-4 h-4" />,
      badge: d.sources.length > 0 ? `${d.sources.filter((s) => s.enabled).length}/${d.sources.length}` : undefined,
    },
    { id: 'dedup', label: 'ML Deduplication & Merging', icon: <Cpu className="w-4 h-4" />, badge: `${d.dedup.dedup_threshold}%` },
    { id: 'smtp', label: 'Email & SMTP Gateway', icon: <Mail className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp & SMS Channels', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'appearance', label: 'Themes & UI Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'trash', label: 'Soft-Delete Trash Bin', icon: <Trash2 className="w-4 h-4" />, badge: d.trashLeads.length > 0 ? d.trashLeads.length : undefined },
  ];

  return (
    <Shell>
      <div className="space-y-6 pb-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl ${accentClasses.badgeBg} ${accentClasses.text}`}>
                <Settings className="w-5 h-5" />
              </span>
              <h1 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                System Settings & Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure enterprise EXIM identity, 95% ML deduplication, verified trade sources, SMTP delivery, and soft-delete trash.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              ML Dedup: {d.dedup.dedup_threshold}% Active
            </span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 font-semibold flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              216 Trade Sources
            </span>
          </div>
        </div>

        {d.saveMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              d.saveMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {d.saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{d.saveMsg.text}</span>
          </div>
        )}

        <div
          className={`w-full rounded-2xl border p-2.5 transition ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTabType)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                    isActive
                      ? isLight
                        ? `bg-slate-100 ${accentClasses.text} shadow-sm border border-slate-200`
                        : `bg-slate-800 text-white border ${accentClasses.border}`
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className={isActive ? accentClasses.text : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-1 ${
                        isActive
                          ? isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-700 text-white'
                          : isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'company' && (
          <CompanyProfileTab
            company={d.company}
            setCompany={d.setCompany}
            onSave={d.saveCompany}
            saving={d.saving}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}

        {activeTab === 'sources' && (
          <SourcesRegistryTab
            sources={d.sources}
            saving={d.saving}
            onToggleSource={d.toggleSource}
            onBulkUpdate={d.bulkUpdateSources}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}

        {activeTab === 'dedup' && (
          <DeduplicationSettingsTab
            dedup={d.dedup}
            setDedup={d.setDedup}
            onSave={d.saveDedup}
            saving={d.saving}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}

        {activeTab === 'smtp' && (
          <SmtpGatewayTab
            smtp={d.smtp}
            setSmtp={d.setSmtp}
            smtpStopper={d.smtpStopper}
            onHardBreak={d.handleHardBreak}
            onResume={d.handleResume}
            onResetCounter={d.handleResetCounter}
            onUpdateLimit={d.handleUpdateLimit}
            onSave={d.saveSmtp}
            onTest={d.handleTestSmtp}
            testingSmtp={d.testingSmtp}
            testSmtpResult={d.testSmtpResult}
            saving={d.saving}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppGatewayTab
            whatsapp={d.whatsapp}
            setWhatsapp={d.setWhatsapp}
            onSave={() => d.showNotification('WhatsApp & SMS configuration updated!')}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}

        {activeTab === 'appearance' && <AppearanceTab isLight={isLight} />}

        {activeTab === 'trash' && (
          <TrashBinTab
            trashLeads={d.trashLeads}
            loadingTrash={d.loadingTrash}
            onRefresh={d.loadTrash}
            onRestore={d.handleRestoreLead}
            onPermanentDelete={d.handlePermanentDelete}
            isLight={isLight}
          />
        )}
      </div>
    </Shell>
  );
}
