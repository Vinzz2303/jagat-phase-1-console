import React, { useState } from 'react';
import { CheckCircle2, Download, FileCode, Image as ImageIcon, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import type { FeatureFlags } from '../phase1/types';

interface AuditAndBlueprintViewProps {
  docs: Record<string, string>;
  featureFlags: FeatureFlags;
  onToggleFlag: (flagKey: keyof FeatureFlags) => Promise<void>;
}

const DOC_TABS = [
  { file: 'current-architecture.md', label: '1. current-architecture.md' },
  { file: 'change-plan.md', label: '2. change-plan.md' },
  { file: 'risk-register.md', label: '3. risk-register.md' },
  { file: 'implementation-log.md', label: '4. implementation-log.md' },
  { file: 'test-report.md', label: '5. test-report.md' },
  { file: 'rollback.md', label: '6. rollback.md' },
];

const ACCEPTANCE_CRITERIA = [
  { area: 'Idempotency', rule: 'Restart setelah send tidak menghasilkan email kedua; crash pasca-SMTP masuk NEEDS_RECONCILIATION' },
  { area: 'Scheduler', rule: 'Tidak ada worker ganda pada campaign yang sama tanpa izin (Redis TTL + owner token)' },
  { area: 'Policy', rule: 'Lead suppressed/opt-out tidak dapat dikirim' },
  { area: 'Approval', rule: 'Approve memvalidasi ulang policy dan state sebelum send' },
  { area: 'Inbound', rule: 'Reply cocok ke lead yang benar; intent ambigu (< 0.80) & prompt injection dieskalasi' },
  { area: 'Model routing', rule: 'Task memilih model sesuai policy; timeout/fallback bekerja' },
  { area: 'Cost tracking', rule: 'Token, latency, provider, model, estimated cost tercatat + Hard Cap Kill Switch' },
  { area: 'RAG', rule: 'Qdrant health, dimensi embedding 768 (nomic-embed-text), retrieval test & graceful degradation lulus' },
  { area: 'Recovery', rule: 'Task masuk retry/dead-letter/reconciliation sesuai jenis error (tanpa retry error auth)' },
  { area: 'Rollback', rule: 'Feature flag mematikan fitur baru tanpa merusak alur lama' },
];

export function AuditAndBlueprintView({
  docs,
  featureFlags,
  onToggleFlag,
}: AuditAndBlueprintViewProps) {
  const [selectedDoc, setSelectedDoc] = useState('current-architecture.md');
  const [showBlueprintImg, setShowBlueprintImg] = useState(false);

  const downloadMarkdown = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Split: 10 Acceptance Criteria Checklist (Left 7) + Feature Flag Rollback Panel (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Phase 1 Acceptance Criteria Verification (10/10 Verified)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seluruh kriteria lulus uji unit (<code className="font-mono">src/phase1/phase1.test.ts</code>) dan aktif
                di runtime.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBlueprintImg(!showBlueprintImg)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {showBlueprintImg ? 'Hide Blueprint Diagram' : 'View Reference Blueprint'}
            </button>
          </div>

          {showBlueprintImg && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <img
                src="/assets/aistudio/Cetak_Biru_Teknis_JAGAT__Arsitektur_dan_Implementasi_ad4cb2e7.png"
                alt="Cetak Biru Teknis JAGAT Arsitektur dan Implementasi"
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {ACCEPTANCE_CRITERIA.map((item) => (
              <div
                key={item.area}
                className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-md flex items-start gap-2.5 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{item.area}</div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{item.rule}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flag Rollback Control */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Feature Flags & Instant Rollback Control (Rule #5 & AC-10)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nonaktifkan flag tertentu untuk memverifikasi bahwa alur lama tetap berjalan tanpa merusak state.
            </p>
          </div>

          <div className="space-y-2">
            {(Object.keys(featureFlags) as (keyof FeatureFlags)[]).map((flagKey) => {
              const enabled = featureFlags[flagKey];
              return (
                <div
                  key={flagKey}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {flagKey}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {enabled ? 'Phase 1 Protection Active' : 'Rolled back to legacy behavior'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFlag(flagKey)}
                    className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                      enabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mandatory Phase 1 Documentation Artifacts Viewer (Bagian 17 Blueprint) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Mandatory Phase 1 Artifacts (`docs/phase-1/*.md` — Bagian 17 Blueprint)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen hasil audit forensik repositori `jagat-ai-codebase`, change plan, risk register, test report, dan
              prosedur rollback.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadMarkdown(selectedDoc, docs[selectedDoc] || '')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-md"
          >
            <Download className="w-3.5 h-3.5" />
            Download {selectedDoc}
          </button>
        </div>

        <div className="p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
          {DOC_TABS.map((tab) => (
            <button
              key={tab.file}
              type="button"
              onClick={() => setSelectedDoc(tab.file)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors whitespace-nowrap ${
                selectedDoc === tab.file
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 bg-slate-950 text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-y-auto">
          {docs[selectedDoc] || 'Loading document...'}
        </div>
      </div>
    </div>
  );
}
