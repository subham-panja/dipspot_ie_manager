'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { fetchJson } from '@/lib/api';
import {
  X,
  MapPin,
  Building2,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  Kanban,
  Megaphone,
  Ship,
  Search,
  Layers,
  Scale,
  Award,
  Edit2,
  Save,
  Trash2,
  Tag,
  History,
  Check,
  MessageCircle,
  Package,
} from 'lucide-react';

export interface CustomerLead {
  id: number;
  company_name: string;
  country: string;
  city_or_hub?: string;
  contact_person?: string;
  phones?: string;
  emails?: string;
  website?: string;
  address?: string;
  matched_varieties?: string;
  commodities_list?: string[];
  hs_codes_applicable?: string;
  priority_score: number;
  lead_type: string;
  gstin?: string;
  pan?: string;
  fssai_or_sfda_status?: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  nearest_port?: string;
  trade_role?: string;
  annual_volume_est?: string;
  risk_tier?: string;
  key_trade_lanes?: string[];
  duplicate_probability?: number;
  duplicate_status?: string;
  source_name?: string;
  source_url?: string;
  custom_label?: string;
  extraction_notes?: string;
  merge_count?: number;
  merged_history?: any[];
  shipment_volume?: string;
  importer_tier?: string;
  whatsapp_outreach_url?: string;
  linkedin_search_url?: string;
  google_maps_url?: string;
  customs_manifest_data?: any;
}

interface CustomerDossierProps {
  customer: CustomerLead | null;
  onClose: () => void;
  onConvertToDeal?: (customer: CustomerLead) => void;
  onConvert?: (customer?: any) => void;
  onEnroll?: (customer: CustomerLead) => void;
  onUpdated?: (updated: CustomerLead) => void;
}

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

  // Current lead data state (supports live updates)
  const [lead, setLead] = useState<CustomerLead | null>(customer);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerLead>>({});

  // Map search / coordinate adjustment
  const [mapQuery, setMapQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite'>('roadmap');

  React.useEffect(() => {
    setLead(customer);
    if (customer) {
      setEditForm({ ...customer });
    }
  }, [customer]);

  // Escape key handler to close popup
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!lead) return null;

  const lat = lead.latitude || 25.2048;
  const lng = lead.longitude || 55.2708;
  const mapSearchTarget = mapQuery || `${lat},${lng}`;
  const embedMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchTarget)}&t=${mapStyle === 'satellite' ? 'k' : 'm'}&z=13&ie=UTF8&iwloc=&output=embed`;

  const firstPhone = lead.phones?.split(';')[0]?.split(',')[0]?.trim();
  const cleanWaNumber = firstPhone?.replace(/[^0-9]/g, '');
  const firstEmail = lead.emails?.split(';')[0]?.split(',')[0]?.trim();

  const linkedinUrl = lead.linkedin_search_url || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.company_name + ' Purchase Manager')}`;
  const whatsappUrl = lead.whatsapp_outreach_url || (cleanWaNumber ? `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(`Dear ${lead.contact_person || lead.company_name} team, we are direct rice millers supplying premium 1-3 FCL consignments of IR-64 and Basmati landing at ${lead.nearest_port || 'your discharge port'}. Could we share our CIF quotation?`)}` : undefined);
  const mapsUrl = lead.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.company_name + ' ' + (lead.city_or_hub || lead.country))}`;

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      const res = await fetchJson<{ lead: CustomerLead }>(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      if (res.lead) {
        setLead(res.lead);
        if (onUpdated) onUpdated(res.lead);
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

  // Container styling based on user preference
  let containerPositionClasses = '';
  if (detailViewMode === 'right_drawer') {
    containerPositionClasses = 'justify-end';
  } else if (detailViewMode === 'left_drawer') {
    containerPositionClasses = 'justify-start';
  } else {
    containerPositionClasses = 'justify-center items-center';
  }

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
        {/* Top Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accentClasses.gradient} flex items-center justify-center text-white shadow-sm`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                    lead.lead_type === 'importer'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {lead.lead_type === 'importer' ? 'Global Importer' : 'Verified Supplier'}
                </span>

                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${accentClasses.badgeBg}`}>
                  Score: {lead.priority_score}/100
                </span>

                {lead.custom_label && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-bold">
                    <Tag className="w-2.5 h-2.5" />
                    {lead.custom_label}
                  </span>
                )}

                {lead.merge_count && lead.merge_count > 1 ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Merged x{lead.merge_count}
                  </span>
                ) : null}
              </div>

              <h2 className={`text-base font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lead.company_name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                isEditing
                  ? 'bg-purple-500 text-white border-purple-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Lead'}</span>
            </button>

            <button
              onClick={handleSoftDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Soft-delete lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit Form Mode */}
        {isEditing ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-400" />
                <span>Edit Lead Specifications & Metadata</span>
              </h3>
              <span className="text-xs text-slate-400">All fields update in real-time</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={editForm.company_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Country / Territory</label>
                <input
                  type="text"
                  value={editForm.country || ''}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">City or Commercial Hub</label>
                <input
                  type="text"
                  value={editForm.city_or_hub || ''}
                  onChange={(e) => setEditForm({ ...editForm, city_or_hub: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contact Executive</label>
                <input
                  type="text"
                  value={editForm.contact_person || ''}
                  onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Telephone Numbers (Semi-colon separated)</label>
                <input
                  type="text"
                  value={editForm.phones || ''}
                  onChange={(e) => setEditForm({ ...editForm, phones: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email Addresses (Semi-colon separated)</label>
                <input
                  type="text"
                  value={editForm.emails || ''}
                  onChange={(e) => setEditForm({ ...editForm, emails: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Corporate Website</label>
                <input
                  type="text"
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Entity Role</label>
                <select
                  value={editForm.lead_type || 'importer'}
                  onChange={(e) => setEditForm({ ...editForm, lead_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="importer">Global Importer / Buyer</option>
                  <option value="wb_mill">Commercial Supplier / Mill</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Commodity Lines</label>
                <input
                  type="text"
                  value={editForm.matched_varieties || ''}
                  onChange={(e) => setEditForm({ ...editForm, matched_varieties: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Applicable HS Codes</label>
                <input
                  type="text"
                  value={editForm.hs_codes_applicable || ''}
                  onChange={(e) => setEditForm({ ...editForm, hs_codes_applicable: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Custom Campaign Label</label>
                <input
                  type="text"
                  value={editForm.custom_label || ''}
                  onChange={(e) => setEditForm({ ...editForm, custom_label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-purple-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tax ID / GSTIN / IEC</label>
                <input
                  type="text"
                  value={editForm.gstin || ''}
                  onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">Physical Facility / Port Address</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 ${accentClasses.btn}`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Split Body: Left Map UI (50%) + Right Contact & Intelligence (50%) */
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto">
            {/* LEFT SECTION (50%): INTERACTIVE GOOGLE MAPS UI */}
            <div
              className={`w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r flex flex-col space-y-3 ${
                isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search coordinates or city on map..."
                    value={mapQuery}
                    onChange={(e) => setMapQuery(e.target.value)}
                    className={`w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border outline-none ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMapStyle(mapStyle === 'roadmap' ? 'satellite' : 'roadmap')}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition ${
                    mapStyle === 'satellite'
                      ? `${accentClasses.bg} text-white`
                      : isLight
                      ? 'bg-white border-slate-200 text-slate-700'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {mapStyle === 'satellite' ? 'Satellite' : 'Roadmap'}
                </button>
              </div>

              {/* Embedded Google Map */}
              <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden border border-slate-800/80 relative shadow-inner">
                <iframe
                  title="Customer Global Location Map"
                  src={embedMapUrl}
                  className="w-full h-full border-0 absolute inset-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                <div className="absolute top-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-2 text-[10px] text-slate-300 shadow-lg pointer-events-none">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="truncate max-w-[140px]">{lead.company_name}</span>
                  </div>
                  <div className="font-mono text-emerald-400 mt-0.5">
                    {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                  </div>
                </div>
              </div>

              {/* Sea Port Card */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Primary Commercial Sea Port Gateway
                  </span>
                  <span className="font-mono text-[10px] text-emerald-500 font-bold">Active Gateway</span>
                </div>
                <div className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  <Ship className="w-3.5 h-3.5 text-blue-500" />
                  <span>{lead.nearest_port || 'Jebel Ali Port (AEJEA)'}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Location: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{lead.city_or_hub || lead.district || lead.country}</strong>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION (50%): CONTACT DIRECTORY & TRADE INTELLIGENCE */}
            <div className="w-full md:w-1/2 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Customs Manifest & Scale Badge (The Customs Data Trick) */}
                {(lead.shipment_volume || lead.importer_tier || lead.lead_type === 'importer') && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ship className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Customs Manifest Inbound Scale</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        {lead.hs_codes_applicable || 'HS 100630'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Monthly Inbound Volume:</span>
                        <span className="font-bold text-amber-300 font-mono">
                          {lead.shipment_volume || '1-3 Containers / mo (25-75 MT)'}
                        </span>
                      </div>

                      <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Importer Scale:</span>
                        <span className="font-semibold text-emerald-400">
                          {lead.importer_tier === 'sme_importer' ? 'SME (Owner Direct)' : (lead.importer_tier || 'SME Consignee')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px]">
                      <span className="text-slate-400">Discharge Sea Port:</span>
                      <strong className="text-white flex items-center gap-1 font-mono">
                        <Ship className="w-3 h-3 text-blue-400" />
                        {lead.nearest_port || 'Jebel Ali Port (AEJEA)'}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Contact Dossier Card */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Verified Contact Dossier
                    </h3>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Google Maps POI</span>
                      </a>
                    )}
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {lead.contact_person && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Contact Executive:</span>
                        <div className="flex items-center gap-2">
                          <strong className={isLight ? 'text-slate-800' : 'text-white'}>{lead.contact_person}</strong>
                          <a
                            href={linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-semibold flex items-center gap-1 transition"
                            title="Search Purchase Manager on LinkedIn"
                          >
                            <span>in</span>
                            <span>LinkedIn</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {firstPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Direct Phone:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-white">{firstPhone}</span>
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-sm"
                              title="Open 1-Click WhatsApp CIF Outreach"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {firstEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Direct Email:</span>
                        <a
                          href={`mailto:${firstEmail}`}
                          className={`font-mono text-xs ${accentClasses.text} hover:underline truncate max-w-[200px]`}
                        >
                          {firstEmail}
                        </a>
                      </div>
                    )}

                    {lead.website && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Corporate Web:</span>
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[180px]">{lead.website}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {lead.address && (
                      <div className="pt-2 border-t border-slate-800/60 text-[11px]">
                        <span className="text-slate-400 block mb-0.5">Physical Facility / Office:</span>
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{lead.address}</span>
                      </div>
                    )}

                    {lead.source_name && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                        <span className="text-slate-400">Verified Manifest Source:</span>
                        {lead.source_url ? (
                          <a
                            href={lead.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                          >
                            <span className="truncate max-w-[170px]">{lead.source_name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-amber-300 font-medium">{lead.source_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Merge Trail (If lead was enriched via 95% ML Dedup) */}
                {lead.merged_history && lead.merged_history.length > 0 && (
                  <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-400">
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        ML Deduplication Audit History ({lead.merged_history.length} merges)
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {lead.merged_history.map((ev, i) => (
                        <div key={i} className="text-[10px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                          <div className="flex justify-between font-mono text-[9px] text-slate-400">
                            <span>Score: {ev.similarity_score}% ({ev.match_reason || 'ML Match'})</span>
                            <span>{ev.merged_at ? ev.merged_at.slice(0, 10) : ''}</span>
                          </div>
                          <p className="truncate text-slate-200 mt-0.5">{ev.candidate_company} &bull; {ev.source_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom 1-Click Action Bar */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2.5">
                {onEnroll && (
                  <button
                    type="button"
                    onClick={() => onEnroll(lead)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Enroll Campaign</span>
                  </button>
                )}

                {(onConvertToDeal || onConvert) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onConvertToDeal) onConvertToDeal(lead);
                      else if (onConvert) onConvert(lead);
                    }}
                    className={`text-xs font-semibold px-4 py-2 rounded-xl text-white ${accentClasses.bg} ${accentClasses.bgHover} shadow-md transition flex items-center gap-1.5`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Move to Pipeline</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
