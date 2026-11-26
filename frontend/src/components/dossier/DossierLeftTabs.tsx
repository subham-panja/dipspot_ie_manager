'use client';

import React, { useState, useEffect } from 'react';
import { Users, Send, Clock } from 'lucide-react';
import { CustomerLead, CompanyContact } from './dossierTypes';
import DossierContacts from './DossierContacts';
import DossierXraySection from './DossierXraySection';
import DossierOutreachTab from './DossierOutreachTab';
import DossierNotes from './DossierNotes';

interface DossierLeftTabsProps {
  lead: CustomerLead;
  isLight: boolean;
  accentClasses: {
    bg: string;
    bgHover: string;
    text: string;
    badgeBg: string;
    btn?: string;
  };
  onEnrollContact?: (contact: CompanyContact) => void;
}

export default function DossierLeftTabs({
  lead,
  isLight,
  accentClasses,
  onEnrollContact,
}: DossierLeftTabsProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'outreach' | 'timeline'>('contacts');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setActiveTab('contacts');
  }, [lead.id]);

  const tabClass = (active: boolean) =>
    `px-3 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 ${
      active
        ? isLight
          ? 'border-blue-600 text-blue-700 bg-blue-50'
          : 'border-blue-500 text-blue-400 bg-blue-500/10'
        : isLight
        ? 'border-transparent text-slate-500 hover:text-slate-900'
        : 'border-transparent text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div
      className={`rounded-xl border flex flex-col flex-1 min-h-[380px] ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      {/* 3 Tab Navigation Header */}
      <div
        className={`flex items-center justify-between border-b px-3 pt-2 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={tabClass(activeTab === 'contacts')}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contacts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outreach')}
            className={tabClass(activeTab === 'outreach')}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Communication / Outreach History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={tabClass(activeTab === 'timeline')}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Notes / Timeline</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <DossierXraySection
              lead={lead}
              isLight={isLight}
              onPersisted={() => setRefreshToken((p) => p + 1)}
            />
            <DossierContacts
              lead={lead}
              isLight={isLight}
              accentTextClass={accentClasses.text}
              refreshToken={refreshToken}
              onEnrollContact={onEnrollContact}
            />
          </div>
        )}

        {activeTab === 'outreach' && (
          <DossierOutreachTab lead={lead} isLight={isLight} />
        )}

        {activeTab === 'timeline' && (
          <DossierNotes lead={lead} isLight={isLight} />
        )}
      </div>
    </div>
  );
}
