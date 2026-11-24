'use client';

import React from 'react';
import { TariffRule } from './intelligenceTypes';

interface TariffsTabProps {
  tariffs: TariffRule[];
  isLight: boolean;
}

export default function TariffsTab({ tariffs, isLight }: TariffsTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Export policy compliance: DGFT export duty structures, Minimum Export Price (MEP) status, and destination food safety certifications.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tariffs.map((t, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl border space-y-4 shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  HS {t.hs_code}
                </span>
                <h3 className={`text-sm font-bold mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {t.description}
                </h3>
              </div>
            </div>

            <div className={`p-3.5 rounded-lg border space-y-2.5 text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Export Duty:</span>
                <span className={`font-mono font-bold ${t.indian_export_duty_pct === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {t.indian_export_duty_pct}% Duty
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Minimum Export Price (MEP):</span>
                <span className="font-mono text-slate-200">
                  {t.mep_usd_mt ? `$${t.mep_usd_mt}/MT` : 'None (Unrestricted)'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">APEDA Registration:</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">{t.apeda_registration}</span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">SFDA / Food Safety:</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">{t.gulf_sfda_requirements}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
