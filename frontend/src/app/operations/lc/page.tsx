'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  FileText,
  DollarSign,
  CheckSquare,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Building2,
  Calendar,
  Anchor,
  HelpCircle,
  Sparkles,
  Printer
} from 'lucide-react';

interface LcCheckItem {
  id: string;
  article: string;
  title: string;
  description: string;
  status: 'passed' | 'warning' | 'failed';
  notes: string;
}

export default function LcCheckerPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [lcNumber, setLcNumber] = useState('LC-2026-ENBD-88912');
  const [issuingBank, setIssuingBank] = useState('Emirates NBD Bank PJSC, Dubai');
  const [beneficiary, setBeneficiary] = useState('TradePulse Commercial Export Ltd');
  const [applicant, setApplicant] = useState('Al-Dhiyafa Foodstuff Trading LLC');
  const [amountUsd, setAmountUsd] = useState(122850);
  const [latestShipDate, setLatestShipDate] = useState('2026-04-15');
  const [expiryDate, setExpiryDate] = useState('2026-05-06');
  const [loadingPort, setLoadingPort] = useState('Kolkata Port (INCCU)');
  const [dischargePort, setDischargePort] = useState('Jebel Ali Port (AEJEA)');

  const [rules, setRules] = useState<LcCheckItem[]>([
    {
      id: 'rule-1',
      article: 'UCP 600 Art. 14(d)',
      title: 'Beneficiary Name & Address Exact Match',
      description: 'The beneficiary name on invoice, B/L, and origin certificate must match the credit verbatim.',
      status: 'passed',
      notes: 'Matches registered corporate legal entity perfectly.',
    },
    {
      id: 'rule-2',
      article: 'UCP 600 Art. 18(c)',
      title: 'Commercial Invoice Goods Description',
      description: 'Description of goods in commercial invoice must correspond strictly with the credit description.',
      status: 'passed',
      notes: 'IR-64 Parboiled Rice 5% Broken conforms to clause 45A.',
    },
    {
      id: 'rule-3',
      article: 'UCP 600 Art. 20 / 27',
      title: 'Clean On-Board Ocean Bill of Lading',
      description: 'Marine B/L must clearly state "Clean on Board" without adverse condition clauses.',
      status: 'passed',
      notes: 'Carrier issued Clean Shipped On Board notation verified.',
    },
    {
      id: 'rule-4',
      article: 'UCP 600 Art. 14(c)',
      title: 'Presentation Period (21 Days Post-Shipment)',
      description: 'Documents must be presented to advising bank within 21 days of shipment date and prior to L/C expiry.',
      status: 'passed',
      notes: 'Shipment date: Apr 10, presentation deadline: May 1 (Expiry May 6).',
    },
    {
      id: 'rule-5',
      article: 'UCP 600 Art. 30(b)',
      title: 'Quantity & Amount Tolerance (+/- 5%)',
      description: 'Unless credit stipulates not to exceed, a 5% quantity tolerance is permitted for bulk agricultural commodities.',
      status: 'warning',
      notes: 'Invoice shows 250 MT (+0%). Ensure tolerance is honored if container net differs.',
    },
    {
      id: 'rule-6',
      article: 'UCP 600 Art. 28',
      title: 'Marine Cargo Insurance Policy Coverage',
      description: 'Insurance document must cover at least 110% of CIF value and be dated no later than B/L on-board date.',
      status: 'passed',
      notes: 'Institute Cargo Clauses (A) all-risks cover for 110% ($135,135).',
    },
    {
      id: 'rule-7',
      article: 'UCP 600 Art. 31',
      title: 'Partial Shipments & Transshipment Clause',
      description: 'L/C allows partial shipments and containerized transshipment.',
      status: 'passed',
      notes: 'Field 43P: Allowed. Field 43T: Allowed.',
    },
    {
      id: 'rule-8',
      article: 'UCP 600 Art. 14(f)',
      title: 'Third-Party Inspection & Phytosanitary Certificates',
      description: 'SGS quality and plant quarantine fumigation certificate dated prior to departure.',
      status: 'passed',
      notes: 'Independent surveyor report submitted and verified.',
    },
  ]);

  const toggleRuleStatus = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus = r.status === 'passed' ? 'warning' : r.status === 'warning' ? 'failed' : 'passed';
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  const navItems: PageSubNavItem[] = [
    {
      id: 'docs',
      label: 'Commercial Invoices & Documents',
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      href: '/operations/documents',
      active: false,
      desc: 'Proforma, Commercial & Packing lists',
    },
    {
      id: 'fx',
      label: 'FX Hedging & Converter',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
      href: '/operations/fx',
      active: false,
      desc: 'Multi-currency rates & spread',
    },
    {
      id: 'lc',
      label: 'L/C Discrepancy Checker',
      icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
      href: '/operations/lc',
      active: true,
      desc: 'UCP 600 compliance verification',
    },
    {
      id: 'compliance',
      label: 'Sanctions & Port Screener',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      href: '/operations/compliance',
      active: false,
      desc: 'Denied parties, OFAC & DGFT lists',
    },
  ];

  const passedCount = rules.filter((r) => r.status === 'passed').length;
  const warningCount = rules.filter((r) => r.status === 'warning').length;
  const failedCount = rules.filter((r) => r.status === 'failed').length;
  const complianceScore = Math.round((passedCount / rules.length) * 100);

  return (
    <Shell>
      <PageLeftNav
        title="Trade Operations"
        badge="Export Execution"
        items={navItems}
        headerAction={
          <button
            onClick={() => window.print()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Audit Report
          </button>
        }
      >
        <div className="space-y-6">
          {/* Header Summary */}
          <div
            className={`p-5 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    ICC UCP 600 Standard
                  </span>
                  <span className="text-xs text-slate-400">Documentary Credit Compliance Analyzer</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">Letter of Credit Discrepancy Checker</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Prevent costly bank discrepancy fees ($75–$150/rejection) and export payment delays by pre-auditing your documentary package.
                </p>
              </div>

              {/* Compliance Score Pill */}
              <div
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${
                  failedCount > 0
                    ? isLight
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-rose-950/20 border-rose-800/40'
                    : warningCount > 0
                    ? isLight
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-amber-950/20 border-amber-800/40'
                    : isLight
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-emerald-950/20 border-emerald-800/40'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Score</div>
                  <div
                    className={`text-2xl font-bold ${
                      failedCount > 0 ? 'text-rose-500' : warningCount > 0 ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  >
                    {complianceScore}%
                  </div>
                </div>
                <div className="text-xs space-y-0.5 border-l pl-4 border-slate-200 dark:border-slate-800">
                  <div className="text-emerald-500 font-medium">{passedCount} Passed</div>
                  <div className="text-amber-500 font-medium">{warningCount} Warnings</div>
                  <div className="text-rose-500 font-medium">{failedCount} Fatal Flaws</div>
                </div>
              </div>
            </div>
          </div>

          {/* LC Parameters Metadata */}
          <div
            className={`p-5 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-400" />
              Documentary Credit Reference
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">L/C Instrument No.</label>
                <input
                  type="text"
                  value={lcNumber}
                  onChange={(e) => setLcNumber(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-mono font-semibold ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Issuing Bank</label>
                <input
                  type="text"
                  value={issuingBank}
                  onChange={(e) => setIssuingBank(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Beneficiary (Exporter)</label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Applicant (Buyer)</label>
                <input
                  type="text"
                  value={applicant}
                  onChange={(e) => setApplicant(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Credit Amount (USD)</label>
                <input
                  type="number"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-mono font-semibold ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Latest Shipment Date</label>
                <input
                  type="date"
                  value={latestShipDate}
                  onChange={(e) => setLatestShipDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">L/C Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Port of Loading / Discharge</label>
                <div className="text-[11px] font-mono text-slate-300 py-2 truncate">
                  {loadingPort} ➔ {dischargePort}
                </div>
              </div>
            </div>
          </div>

          {/* Check Rules List */}
          <div
            className={`p-5 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold tracking-wide">UCP 600 Compliance Rules Checklist</h2>
                <p className="text-xs text-slate-400">Click any check status pill to toggle between Passed, Warning, and Failed.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg transition"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {rule.article}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{rule.title}</span>
                    </div>
                    <p className="text-xs text-slate-400">{rule.description}</p>
                    <div className="text-[11px] text-slate-500 italic">Audit Note: {rule.notes}</div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <button
                      onClick={() => toggleRuleStatus(rule.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                        rule.status === 'passed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : rule.status === 'warning'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      {rule.status === 'passed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {rule.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {rule.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                      <span className="capitalize">{rule.status}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLeftNav>
    </Shell>
  );
}

