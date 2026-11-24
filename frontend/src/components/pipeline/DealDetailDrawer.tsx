'use client';

import React, { useState, useEffect } from 'react';
import { Building2, X, Sparkles, Clock, Trash2 } from 'lucide-react';
import { fetchJson } from '@/lib/api';
import { Deal, Stage, DealComment } from './pipelineTypes';
import DealCommentsSection from './DealCommentsSection';

interface DealDetailDrawerProps {
  deal: Deal | null;
  stages: Stage[];
  onClose: () => void;
  onStageChange: (dealId: string, newStageId: string) => void;
  onDeleteDeal: (dealId: string) => void;
  onOpenDossier: (deal: Deal) => void;
  formatCurrency: (val: number) => string;
  isLight: boolean;
  accentBadgeBg: string;
}

export default function DealDetailDrawer({
  deal,
  stages,
  onClose,
  onStageChange,
  onDeleteDeal,
  onOpenDossier,
  formatCurrency,
  isLight,
  accentBadgeBg,
}: DealDetailDrawerProps) {
  const [dealComments, setDealComments] = useState<DealComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (deal?.deal_id) {
      loadComments(deal.deal_id);
    } else {
      setDealComments([]);
    }
  }, [deal?.deal_id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deal, onClose]);

  if (!deal) return null;

  const loadComments = async (dealId: string) => {
    try {
      setLoadingComments(true);
      const res = await fetchJson<{ comments: DealComment[] }>(`/pipeline/deals/${dealId}/comments`);
      setDealComments(res.comments || []);
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (text: string, author: string, tag: string) => {
    try {
      const res = await fetchJson<{ comment: DealComment }>(`/pipeline/deals/${deal.deal_id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text, author, tag }),
      });
      if (res.comment) {
        setDealComments((prev) => [...prev, res.comment]);
      }
    } catch (err: any) {
      alert('Failed to post comment: ' + err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetchJson(`/pipeline/deals/${deal.deal_id}/comments/${commentId}`, { method: 'DELETE' });
      setDealComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

  const dealValue = deal.value_usd ?? (deal.quantity_mt || 0) * 470;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between border-l ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800/40">
            <div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${accentBadgeBg}`}>
                {deal.deal_id}
              </span>
              <h2 className={`text-lg font-bold mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {deal.title}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {deal.company_name} &bull; {deal.country}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onOpenDossier(deal)}
              className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-500/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              View Interactive Map &amp; Full Dossier
            </button>
          </div>

          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Contract Value:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{formatCurrency(dealValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Commodity:</span>
              <span className="font-semibold text-white">{deal.commodity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tonnage:</span>
              <span className="font-semibold text-white">{deal.quantity_mt} MT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Incoterms:</span>
              <span className="font-semibold text-white">{deal.incoterm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Terms:</span>
              <span className="font-semibold text-white">{deal.payment_terms}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Update Stage</label>
            <select
              value={deal.stage_id}
              onChange={(e) => onStageChange(deal.deal_id, e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
            >
              {stages.map((st) => (
                <option key={st.stage_id} value={st.stage_id}>
                  {st.name} {st.is_terminal ? '(Terminal)' : ''}
                </option>
              ))}
            </select>
          </div>

          {deal.notes && deal.notes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/40">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Deal Activity &amp; Transition Log
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {deal.notes.map((n, idx) => (
                  <div key={idx} className="text-[11px] bg-slate-950/70 border border-slate-800/70 rounded-lg p-2 font-mono text-slate-300">
                    {n}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DealCommentsSection
            dealComments={dealComments}
            loadingComments={loadingComments}
            onPostComment={handlePostComment}
            onDeleteComment={handleDeleteComment}
          />
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => onDeleteDeal(deal.deal_id)}
            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Deal
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
