'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { fetchJson } from '@/lib/api';
import { CustomerLead, CustomerDossierProps } from './dossier/dossierTypes';
import DossierHeader from './dossier/DossierHeader';
import DossierEditForm from './dossier/DossierEditForm';
import DossierMapSection from './dossier/DossierMapSection';
import DossierLeftTabs from './dossier/DossierLeftTabs';
import DossierTradeStats from './dossier/DossierTradeStats';
import DossierActionBar from './dossier/DossierActionBar';
import AuditMergeTrail from './dossier/AuditMergeTrail';

export type { CustomerLead, CustomerDossierProps };

export default function CustomerDossier({
  customer,
  onClose,
  onConvertToDeal,
  onConvert,
  onEnroll,
  onUpdated,
  isEnrollModalOpen = false,
}: CustomerDossierProps) {
  const { theme, detailViewMode, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [lead, setLead] = useState<CustomerLead | null>(customer);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerLead>>({});
  const [isFullPage, setIsFullPage] = useState(detailViewMode === 'full_page');

  useEffect(() => {
    setLead(customer);
    if (customer) {
      setEditForm({ ...customer });
    }
  }, [customer]);

  useEffect(() => {
    setIsEditing(false);
    setIsFullPage(detailViewMode === 'full_page');
  }, [customer?.id, detailViewMode]);

  useEffect(() => {
    if (!lead || isEnrollModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, lead, isEnrollModalOpen]);

  if (!lead) return null;

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      const res = await fetchJson<{ lead: CustomerLead }>(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      if (res.lead) {
        setLead(res.lead);
        onUpdated?.(res.lead);
      }
      setIsEditing(false);
    } catch (err: any) {
      alert('Failed to update lead: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!confirm(`Move ${lead.company_name} to Soft-Delete Trash Bin?`)) return;
    try {
      await fetchJson(`/leads/${lead.id}`, { method: 'DELETE' });
      onClose();
    } catch (err: any) {
      alert('Failed to delete lead: ' + err.message);
    }
  };

  let containerPositionClasses = 'justify-center items-center';
  if (isFullPage) {
    containerPositionClasses = 'justify-center items-center p-0';
  } else if (detailViewMode === 'right_drawer') {
    containerPositionClasses = 'justify-end';
  } else if (detailViewMode === 'left_drawer') {
    containerPositionClasses = 'justify-start';
  }

  const isDrawer = detailViewMode === 'right_drawer' || detailViewMode === 'left_drawer';
  const panelSizingClass = isFullPage
    ? 'w-screen h-screen max-w-none max-h-none m-0 rounded-none'
    : isDrawer
    ? 'w-full md:w-[75vw] md:max-w-[75vw] h-full'
    : 'w-full md:w-[75vw] md:max-w-[75vw] max-h-[92vh] rounded-2xl m-4';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex ${containerPositionClasses} transition-all`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${panelSizingClass} border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
        }`}
      >
        <DossierHeader
          lead={lead}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing(!isEditing)}
          onSoftDelete={handleSoftDelete}
          onClose={onClose}
          isFullPage={isFullPage}
          onToggleFullPage={() => setIsFullPage((prev) => !prev)}
          isLight={isLight}
          accentGradient={accentClasses.gradient}
          accentBadgeBg={accentClasses.badgeBg}
        />

        {isEditing ? (
          <DossierEditForm
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
            saving={savingEdit}
            accentBtnClass={accentClasses.btn}
            isLight={isLight}
          />
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Column: Map Top + 3 Bottom Tabs */}
            <div
              className={`w-full md:w-1/2 flex flex-col min-h-0 overflow-y-auto border-b md:border-b-0 md:border-r ${
                isLight ? 'bg-slate-50/40 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <DossierMapSection
                lead={lead}
                isLight={isLight}
                accentBgClass={accentClasses.bg}
              />
              <DossierLeftTabs
                key={String(lead.id)}
                lead={lead}
                isLight={isLight}
                accentClasses={accentClasses}
                onEnrollContact={
                  onEnroll
                    ? (contact) => onEnroll(lead, contact.contact_id || contact.id)
                    : undefined
                }
              />
            </div>

            {/* Right Column: Trade Intelligence & Lead Source Metadata + Action Bar */}
            <div className="w-full md:w-1/2 p-5 flex flex-col justify-between space-y-4 overflow-y-auto">
              <div className="space-y-4">
                <DossierTradeStats lead={lead} isLight={isLight} />
                <AuditMergeTrail mergedHistory={lead.merged_history} />
              </div>

              <DossierActionBar
                lead={lead}
                onEnroll={onEnroll ? (c) => onEnroll(c) : undefined}
                onConvertToDeal={onConvertToDeal}
                onConvert={onConvert}
                accentBgClass={`${accentClasses.bg} ${accentClasses.bgHover}`}
                isLight={isLight}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
