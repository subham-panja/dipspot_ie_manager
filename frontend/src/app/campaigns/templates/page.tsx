'use client';

import React from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  Smartphone, Sparkles, Plus, RefreshCw, CheckCircle2,
  ShieldCheck, Inbox, BarChart3, Users, ArrowLeft, AlertTriangle, Save,
} from 'lucide-react';
import { useTemplateStudio } from '@/components/templates/useTemplateStudio';
import TemplateLibraryView from '@/components/templates/TemplateLibraryView';
import TemplateEditorForm from '@/components/templates/TemplateEditorForm';
import TemplateDevicePreview from '@/components/templates/TemplateDevicePreview';
import QuickTestModal from '@/components/templates/QuickTestModal';
import TemplateOutboxModal from '@/components/templates/TemplateOutboxModal';

export default function CampaignTemplatesStudioPage() {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';
  const studio = useTemplateStudio();

  const navItems: PageSubNavItem[] = [
    { id: 'campaigns', label: 'Active Sequences', icon: <BarChart3 className="w-4 h-4 text-slate-400" />, href: '/campaigns', desc: 'Live outbound outreach' },
    { id: 'segments', label: 'Audience Segments', icon: <Users className="w-4 h-4 text-slate-400" />, href: '/campaigns/segments', desc: 'Target buyer groups' },
    { id: 'wizard', label: 'Campaign Builder', icon: <Sparkles className="w-4 h-4 text-purple-400" />, href: '/campaigns/wizard', desc: 'Draft & launch campaign' },
    { id: 'templates', label: 'Message Templates', icon: <Smartphone className="w-4 h-4 text-emerald-400" />, badge: studio.templates.length, href: '/campaigns/templates', active: true, desc: 'Multi-channel message drafts' },
    { id: 'smtp', label: 'Email SMTP Gateway', icon: <ShieldCheck className="w-4 h-4 text-blue-400" />, onClick: () => openSettings('smtp'), desc: 'Configure Gmail SMTP' },
  ];

  return (
    <Shell>
      <PageLeftNav title="Outreach Hub" subtitle="Sequences & Audience" items={navItems} activeId="templates">
        <div className="space-y-6 w-full">
          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Omnichannel Template Studio
                </span>
                <span className="text-xs text-slate-400 font-mono">{studio.templates.length} Production Templates</span>
              </div>
              <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Smartphone className="w-6 h-6 text-emerald-400" />
                Message & Email Template Studio
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Draft, customize, and pre-test high-converting commercial offers, dispatch notices, and L/C alerts across Email, WhatsApp, and SMS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => studio.setShowOutboxModal(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-blue-400" />
                <span>Outbox Dispatches ({studio.outboxRecords.length})</span>
              </button>

              <button
                onClick={studio.handleResetDefaults}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title="Restore default industry templates"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restore Defaults</span>
              </button>

              {studio.viewMode === 'studio' ? (
                <button
                  onClick={() => studio.setViewMode('library')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Template Library</span>
                </button>
              ) : (
                <button
                  onClick={studio.handleCreateNew}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} flex items-center gap-1.5 shadow-md transition`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Template</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Total Templates</span>
              <div className="text-xl font-bold text-white mt-1">{studio.templates.length}</div>
              <span className="text-[10px] text-slate-500">Stored in Database</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Supported Channels</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">3 Channels</div>
              <span className="text-[10px] text-slate-500">Email, WhatsApp, SMS</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Real Dispatches Sent</span>
              <div className="text-xl font-bold text-blue-400 mt-1">{studio.outboxRecords.length}</div>
              <span className="text-[10px] text-slate-500">Logged in Outbox</span>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[11px] text-slate-400 font-medium">Gateway Relay</span>
              <div className="text-sm font-bold text-purple-400 mt-1 flex items-center gap-1.5 truncate">
                {studio.smtpStatus?.has_password ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Live SMTP Ready
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Sandbox Relay
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 cursor-pointer hover:underline" onClick={() => openSettings('smtp')}>
                Configure Gmail SMTP &rarr;
              </span>
            </div>
          </div>

          {studio.viewMode === 'library' && (
            <TemplateLibraryView
              templates={studio.templates} loading={studio.loading}
              selectedChannel={studio.selectedChannel} setSelectedChannel={studio.setSelectedChannel}
              selectedCategory={studio.selectedCategory} setSelectedCategory={studio.setSelectedCategory}
              searchQuery={studio.searchQuery} setSearchQuery={studio.setSearchQuery}
              onResetDefaults={studio.handleResetDefaults} onDuplicate={studio.handleDuplicateTemplate}
              onDelete={studio.handleDeleteTemplate} onQuickTest={(tpl) => studio.setQuickTestTemplate(tpl)}
              onOpenStudio={studio.handleOpenStudio} isLight={isLight} accentClasses={accentClasses}
            />
          )}

          {studio.viewMode === 'studio' && studio.activeTemplate && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => studio.setViewMode('library')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Template Studio</span>
                      <span className="text-xs text-slate-600">/</span>
                      <span className="text-xs font-bold text-white">{studio.tplName || 'Untitled Template'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{studio.activeTemplate.template_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {studio.dispatchFeedback && (
                    <div className={`text-xs px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${
                      studio.dispatchFeedback.success
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {studio.dispatchFeedback.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span className="truncate max-w-xs">{studio.dispatchFeedback.message}</span>
                    </div>
                  )}

                  <button
                    onClick={studio.handleSaveTemplate}
                    disabled={studio.isSaving}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.btn} flex items-center gap-1.5 shadow-md transition`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{studio.isSaving ? 'Saving...' : 'Save Template'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <TemplateEditorForm
                  tplName={studio.tplName} setTplName={studio.setTplName}
                  tplCategory={studio.tplCategory} setTplCategory={studio.setTplCategory}
                  tplChannel={studio.tplChannel} setTplChannel={studio.setTplChannel}
                  tplSubject={studio.tplSubject} setTplSubject={studio.setTplSubject}
                  tplBody={studio.tplBody} setTplBody={studio.setTplBody}
                  activeTemplate={studio.activeTemplate} isSaving={studio.isSaving}
                  onSave={studio.handleSaveTemplate} onDelete={studio.handleDeleteTemplate}
                  onCancel={() => studio.setViewMode('library')} copiedToken={studio.copiedToken}
                  insertTokenIntoDraft={studio.insertTokenIntoDraft}
                  insertSnippetIntoDraft={studio.insertSnippetIntoDraft}
                  textareaRef={studio.textareaRef} smsCharCount={studio.smsCharCount}
                  smsSegments={studio.smsSegments} isLight={isLight}
                  accentClasses={accentClasses} setPreviewDevice={studio.setPreviewDevice}
                />

                <TemplateDevicePreview
                  activeLead={studio.activeLead} realLeads={studio.realLeads}
                  selectedLeadIndex={studio.selectedLeadIndex} setSelectedLeadIndex={studio.setSelectedLeadIndex}
                  customLeadOverrides={studio.customLeadOverrides} setCustomLeadOverrides={studio.setCustomLeadOverrides}
                  showOverrideInputs={studio.showOverrideInputs} setShowOverrideInputs={studio.setShowOverrideInputs}
                  previewDevice={studio.previewDevice} setPreviewDevice={studio.setPreviewDevice}
                  hydratedBody={studio.hydratedBody} hydratedSubject={studio.hydratedSubject}
                  smsCharCount={studio.smsCharCount} smsSegments={studio.smsSegments}
                  testRecipient={studio.testRecipient} setTestRecipient={studio.setTestRecipient}
                  isDispatching={studio.isDispatching} tplChannel={studio.tplChannel}
                  onExecuteTestDispatch={studio.handleExecuteTestDispatch}
                  isLight={isLight} accentClasses={accentClasses}
                />
              </div>
            </div>
          )}
        </div>

        <QuickTestModal
          template={studio.quickTestTemplate}
          onClose={() => studio.setQuickTestTemplate(null)}
          testRecipient={studio.testRecipient}
          setTestRecipient={studio.setTestRecipient}
          isDispatching={studio.isDispatching}
          onSend={(tpl) => studio.handleExecuteTestDispatch(tpl)}
          isLight={isLight}
          accentClasses={accentClasses}
        />

        <TemplateOutboxModal
          isOpen={studio.showOutboxModal}
          onClose={() => studio.setShowOutboxModal(false)}
          outboxRecords={studio.outboxRecords}
          loadingOutbox={studio.loadingOutbox}
          isLight={isLight}
        />
      </PageLeftNav>
    </Shell>
  );
}
