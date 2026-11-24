'use client';

import React from 'react';
import Shell from '@/components/Shell';
import PageLeftNav from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  Megaphone,
  ShieldCheck,
  Plus,
  BarChart3,
  MessageSquare,
  Clock,
  Users,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import SmtpStopperBanner from './campaigns/SmtpStopperBanner';
import OmnichannelInboxView from './campaigns/OmnichannelInboxView';
import CadencesView from './campaigns/CadencesView';
import CampaignListTab from './campaigns/CampaignListTab';
import SegmentsTab from './campaigns/SegmentsTab';
import CampaignWizardTab from './campaigns/CampaignWizardTab';
import TemplateEditorTab from './campaigns/TemplateEditorTab';
import NewSegmentModal from './campaigns/NewSegmentModal';
import InspectSegmentModal from './campaigns/InspectSegmentModal';
import EnrollCampaignModal from './campaigns/EnrollCampaignModal';
import { useCampaignsData } from './campaigns/useCampaignsData';

export * from './campaigns/CampaignTypes';

export default function CampaignsView({
  initialTab = 'campaigns',
}: {
  initialTab?: 'segments' | 'campaigns' | 'wizard' | 'templates' | 'inbox' | 'cadences';
}) {
  const { theme, accentClasses, openSettings } = useTheme();
  const isLight = theme === 'light';

  const data = useCampaignsData(initialTab);

  return (
    <Shell>
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Enterprise Outreach Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Enterprise Sequences • Audience Segments & SMTP</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Megaphone className="w-6 h-6 text-purple-400" />
            Campaign Outreach & Audience Suite
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Segment global buyers & suppliers, execute Gmail SMTP sequences, and draft omnichannel WhatsApp and Email templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openSettings('smtp')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            title="Configure Gmail SMTP in Settings"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gmail SMTP Config</span>
          </button>

          <button
            onClick={() => data.setActiveTab('wizard')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      <SmtpStopperBanner
        status={data.smtpStopper}
        onHardBreak={data.handleHardBreak}
        onResume={data.handleResume}
        onResetCounter={data.handleResetCounter}
        onUpdateLimit={data.handleUpdateLimit}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <PageLeftNav
        title="Outreach Hub"
        subtitle="Sequences & Audience"
        items={[
          {
            id: 'campaigns',
            label: 'Active Sequences',
            icon: <BarChart3 className="w-4 h-4" />,
            badge: data.campaigns.length,
            href: '/campaigns',
            onClick: () => data.setActiveTab('campaigns'),
            active: data.activeTab === 'campaigns',
            desc: 'Live outbound outreach',
          },
          {
            id: 'inbox',
            label: 'Omnichannel AI Inbox',
            icon: <MessageSquare className="w-4 h-4 text-purple-400" />,
            href: '/campaigns/inbox',
            onClick: () => data.setActiveTab('inbox'),
            active: data.activeTab === 'inbox',
            desc: 'Centralized Gmail & WhatsApp CMS',
          },
          {
            id: 'cadences',
            label: 'Follow-Up Cadences',
            icon: <Clock className="w-4 h-4 text-emerald-400" />,
            href: '/campaigns/cadences',
            onClick: () => data.setActiveTab('cadences'),
            active: data.activeTab === 'cadences',
            desc: 'Multi-touch automated sequencing',
          },
          {
            id: 'segments',
            label: 'Audience Segments',
            icon: <Users className="w-4 h-4" />,
            badge: data.segments.length,
            href: '/campaigns/segments',
            onClick: () => data.setActiveTab('segments'),
            active: data.activeTab === 'segments',
            desc: 'Target buyer groups',
          },
          {
            id: 'wizard',
            label: 'Campaign Builder',
            icon: <Sparkles className="w-4 h-4 text-purple-400" />,
            href: '/campaigns/wizard',
            onClick: () => data.setActiveTab('wizard'),
            active: data.activeTab === 'wizard',
            desc: 'Draft & launch campaign',
          },
          {
            id: 'templates',
            label: 'Message Templates',
            icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
            badge: data.templates.length,
            href: '/campaigns/templates',
            active: data.activeTab === 'templates',
            desc: 'Multi-channel message drafts',
          },
          {
            id: 'smtp',
            label: 'Email SMTP Gateway',
            icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
            onClick: () => openSettings('smtp'),
            active: false,
            desc: 'Configure Gmail SMTP',
          },
        ]}
        activeId={data.activeTab}
      >
        {data.activeTab === 'inbox' && (
          <OmnichannelInboxView isLight={isLight} accentClasses={accentClasses} />
        )}

        {data.activeTab === 'cadences' && (
          <CadencesView isLight={isLight} accentClasses={accentClasses} />
        )}

        {data.activeTab === 'campaigns' && (
          <CampaignListTab
            campaigns={data.campaigns}
            loadingCampaigns={data.loadingCampaigns}
            isLight={isLight}
            accentClasses={accentClasses}
            broadcastingId={data.broadcastingId}
            onBroadcast={data.handleBroadcast}
            onToggleStatus={data.toggleCampaignStatus}
            onDeleteCampaign={data.handleDeleteCampaign}
            onOpenEnroll={(c) => {
              data.setActiveCampaignForEnroll(c);
              data.setShowEnrollModal(true);
            }}
            onGoToWizard={() => data.setActiveTab('wizard')}
          />
        )}

        {data.activeTab === 'segments' && (
          <SegmentsTab
            segments={data.segments}
            isLight={isLight}
            accentClasses={accentClasses}
            onInspectSegment={data.inspectSegmentLeads}
            onDeleteSegment={data.handleDeleteSegment}
            onLaunchSegmentCampaign={(seg) => {
              data.setWizardData((prev) => ({
                ...prev,
                name: `Outreach to ${seg.name}`,
                segment_id: seg.segment_id,
                target_countries: seg.countries?.join(', ') || 'Global',
              }));
              data.setActiveTab('wizard');
            }}
            onOpenNewSegmentModal={() => data.setShowNewSegmentModal(true)}
          />
        )}

        {data.activeTab === 'wizard' && (
          <CampaignWizardTab
            wizardData={data.wizardData}
            setWizardData={data.setWizardData}
            segments={data.segments}
            isLight={isLight}
            accentClasses={accentClasses}
            onLaunch={data.handleLaunchCampaign}
            onCancel={() => data.setActiveTab('campaigns')}
          />
        )}

        {data.activeTab === 'templates' && (
          <TemplateEditorTab
            templates={data.templates}
            selectedTemplate={data.selectedTemplate}
            filterChannel={data.filterChannel}
            setFilterChannel={data.setFilterChannel}
            onSelectTemplate={data.selectTemplate}
            onCreateNewTemplate={data.handleCreateNewTemplate}
            onDeleteTemplate={data.handleDeleteTemplate}
            onSaveTemplate={data.handleSaveTemplate}
            tplName={data.tplName}
            setTplName={data.setTplName}
            tplChannel={data.tplChannel}
            setTplChannel={data.setTplChannel}
            tplSubject={data.tplSubject}
            setTplSubject={data.setTplSubject}
            tplBody={data.tplBody}
            setTplBody={data.setTplBody}
            isSavingTpl={data.isSavingTpl}
            copiedToken={data.copiedToken}
            insertTokenIntoDraft={data.insertTokenIntoDraft}
            textareaRef={data.textareaRef}
            selectedSampleIndex={data.selectedSampleIndex}
            setSelectedSampleIndex={data.setSelectedSampleIndex}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        )}
      </PageLeftNav>

      <NewSegmentModal
        isOpen={data.showNewSegmentModal}
        onClose={() => data.setShowNewSegmentModal(false)}
        newSegmentForm={data.newSegmentForm}
        setNewSegmentForm={data.setNewSegmentForm}
        onSubmit={data.handleCreateSegment}
        isLight={isLight}
        accentClasses={accentClasses}
      />

      <InspectSegmentModal
        segment={data.inspectingSegment}
        onClose={() => data.setInspectingSegment(null)}
        leads={data.inspectLeads}
        loading={data.loadingLeads}
        isLight={isLight}
      />

      <EnrollCampaignModal
        campaign={data.activeCampaignForEnroll}
        isOpen={data.showEnrollModal}
        onClose={() => data.setShowEnrollModal(false)}
        enrollForm={data.enrollForm}
        setEnrollForm={data.setEnrollForm}
        onSubmit={data.handleEnrollSubmit}
        enrolling={data.enrolling}
        isLight={isLight}
        accentClasses={accentClasses}
      />
    </Shell>
  );
}
