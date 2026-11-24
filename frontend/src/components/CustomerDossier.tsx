'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { fetchJson } from '@/lib/api';
import { CustomerLead, CustomerDossierProps } from './dossier/dossierTypes';
import DossierHeader from './dossier/DossierHeader';
import DossierEditForm from './dossier/DossierEditForm';
import DossierMapSection from './dossier/DossierMapSection';
import DossierTradeStats from './dossier/DossierTradeStats';
import DossierContacts from './dossier/DossierContacts';
import DossierNotes from './dossier/DossierNotes';
import DossierActionBar from './dossier/DossierActionBar';

export type { CustomerLead, CustomerDossierProps };

export default function CustomerDossier({
  customer,
  onClose,
  onConvertToDeal,
  onConvert,
  onEnroll,
  onUpdated,
}: CustomerDossierProps) {
  const { theme, detailViewMode, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [lead, setLead] = useState<CustomerLead | null>(customer);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerLead>>({});
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    setLead(customer);
    if (customer) {
      setEditForm({ ...customer });
    }
  }, [customer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const handleAddActivityNote = async (noteText: string) => {
    try {
      setAddingNote(true);
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const newEntry = `[${timestamp}] ${noteText.trim()}`;
      const updatedNotes = lead.extraction_notes
        ? `${lead.extraction_notes}\n${newEntry}`
        : newEntry;
      const res = await fetchJson<{ lead: CustomerLead }>(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ extraction_notes: updatedNotes }),
      });
      if (res.lead) {
        setLead(res.lead);
        onUpdated?.(res.lead);
      }
    } catch (err: any) {
      alert('Failed to save activity note: ' + err.message);
    } finally {
      setAddingNote(false);
    }
  };

  let containerPositionClasses = 'justify-center items-center';
  if (detailViewMode === 'right_drawer') containerPositionClasses = 'justify-end';
  else if (detailViewMode === 'left_drawer') containerPositionClasses = 'justify-start';

  const isDrawer = detailViewMode === 'right_drawer' || detailViewMode === 'left_drawer';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex ${containerPositionClasses} transition-all`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${
          isDrawer ? 'max-w-4xl h-full' : 'max-w-5xl max-h-[92vh] rounded-2xl m-4'
        } border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
        }`}
      >
        <DossierHeader
          lead={lead}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing(!isEditing)}
          onSoftDelete={handleSoftDelete}
          onClose={onClose}
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
          />
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto">
            <DossierMapSection
              lead={lead}
              isLight={isLight}
              accentBgClass={accentClasses.bg}
            />

            <div className="w-full md:w-1/2 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <DossierTradeStats lead={lead} />
                <DossierContacts
                  lead={lead}
                  isLight={isLight}
                  accentTextClass={accentClasses.text}
                />
                <DossierNotes
                  lead={lead}
                  isLight={isLight}
                  onAddNote={handleAddActivityNote}
                  addingNote={addingNote}
                />
              </div>

              <DossierActionBar
                lead={lead}
                onEnroll={onEnroll}
                onConvertToDeal={onConvertToDeal}
                onConvert={onConvert}
                accentBgClass={`${accentClasses.bg} ${accentClasses.bgHover}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
