'use client';

import React from 'react';
import { Deal, Stage } from './pipelineTypes';
import DealCard from './DealCard';

interface KanbanBoardProps {
  stages: Stage[];
  deals: Deal[];
  draggedDealId: string | null;
  dragOverStageId: string | null;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDragEnd: () => void;
  onDragOverStage: (e: React.DragEvent, stageId: string) => void;
  onDragLeaveStage: (e: React.DragEvent) => void;
  onDropDeal: (dealId: string, targetStageId: string) => void;
  onSelectDeal: (deal: Deal) => void;
  onOpenDossier: (deal: Deal) => void;
  onStageChange: (dealId: string, newStageId: string) => void;
  formatCurrency: (val: number) => string;
  isLight: boolean;
  accentTextClass: string;
}

export default function KanbanBoard({
  stages,
  deals,
  draggedDealId,
  dragOverStageId,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragLeaveStage,
  onDropDeal,
  onSelectDeal,
  onOpenDossier,
  onStageChange,
  formatCurrency,
  isLight,
  accentTextClass,
}: KanbanBoardProps) {
  return (
    <div className="overflow-x-auto pb-4 pt-1">
      <div className="flex gap-4 min-w-[1400px]">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage_id === stage.stage_id);
          const isHovered = dragOverStageId === stage.stage_id;
          const stageTotalValue = stageDeals.reduce(
            (sum, d) => sum + (d.value_usd ?? (d.quantity_mt || 0) * 470),
            0
          );

          return (
            <div
              key={stage.stage_id}
              onDragOver={(e) => onDragOverStage(e, stage.stage_id)}
              onDragLeave={onDragLeaveStage}
              onDrop={(e) => {
                e.preventDefault();
                const dealId = e.dataTransfer.getData('text/plain');
                if (dealId) {
                  onDropDeal(dealId, stage.stage_id);
                }
              }}
              className={`w-72 flex-shrink-0 rounded-2xl border flex flex-col max-h-[76vh] transition-all duration-150 ${
                isHovered
                  ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/60 shadow-lg'
                  : isLight
                  ? 'bg-slate-100/70 border-slate-200'
                  : 'bg-slate-900/50 border-slate-800/80'
              }`}
            >
              <div
                className={`p-3.5 border-b rounded-t-2xl flex items-center justify-between sticky top-0 z-10 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color || '#10b981' }}
                  />
                  <h3
                    className={`text-xs font-bold tracking-wide truncate max-w-[135px] ${
                      isLight ? 'text-slate-800' : 'text-white'
                    }`}
                  >
                    {stage.name}
                  </h3>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.2 rounded-full ${
                      isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {stageDeals.length}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold mt-0.5">
                    {formatCurrency(stageTotalValue)}
                  </span>
                </div>
              </div>

              {isHovered && (
                <div className="mx-2.5 mt-2 py-2 border-2 border-dashed border-emerald-500/60 rounded-xl bg-emerald-500/10 text-center text-[11px] font-semibold text-emerald-400 animate-pulse">
                  Drop to move to {stage.name}
                </div>
              )}

              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto">
                {stageDeals.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-700/40 rounded-xl">
                    No deals here
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.deal_id}
                      deal={deal}
                      stages={stages}
                      isDragging={draggedDealId === deal.deal_id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onClick={() => onSelectDeal(deal)}
                      onOpenDossier={(e, d) => onOpenDossier(d)}
                      onStageChange={onStageChange}
                      formatCurrency={formatCurrency}
                      isLight={isLight}
                      accentTextClass={accentTextClass}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
