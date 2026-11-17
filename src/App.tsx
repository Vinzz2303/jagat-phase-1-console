import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileCode,
  Inbox,
  LayoutDashboard,
  Layers,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import type {
  ApprovalRecord,
  FeatureFlags,
  InboundReplyEvaluation,
  LeadRecord,
  LeadStatus,
  ModelRouteConfig,
  ModelTaskType,
  ModelUsageRecord,
  OutboundMode,
  OutreachEvent,
  OutreachMessage,
  QdrantValidationReport,
  RedisLockEntry,
  AgentTaskRecord,
} from './phase1/types';

import { LeadPipelineView } from './components/LeadPipelineView';
import { TelegramApprovalView } from './components/TelegramApprovalView';
import { InboundCloserView } from './components/InboundCloserView';
import { ModelRouterInfraView } from './components/ModelRouterInfraView';
import { AuditAndBlueprintView } from './components/AuditAndBlueprintView';

type TabType = 'pipeline' | 'approval' | 'inbound' | 'router' | 'audit';

interface SnapshotState {
  outbound_mode: OutboundMode;
  global_pause: boolean;
  paused_campaigns: string[];
  feature_flags: FeatureFlags;
  budget: {
    total_cost_idr: number;
    hard_cap_idr: number;
    daily_alert_idr: number;
    kill_switch_active: boolean;
    utilization_percent: number;
  };
  funnel_metrics: {
    total_leads: number;
    discovered: number;
    qualified_and_verified: number;
    pending_approval: number;
    sent: number;
    replied_positive: number;
    meetings: number;
    proposals: number;
    won: number;
    suppressed_or_unsubscribed: number;
    needs_human_or_reconciliation: number;
    sent_today: number;
    max_emails_per_day: number;
    counts_by_status: Record<string, number>;
  };
  reliability_metrics: {
    total_tasks: number;
    completed_tasks: number;
    dead_letter_tasks: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    active_redis_locks: RedisLockEntry[];
    qdrant_rag: QdrantValidationReport;
  };
  leads: LeadRecord[];
  approvals: ApprovalRecord[];
  messages: OutreachMessage[];
  events: OutreachEvent[];
  model_routes: ModelRouteConfig[];
  model_usage: ModelUsageRecord[];
  tasks: AgentTaskRecord[];
  inbound_history: InboundReplyEvaluation[];
  suppressed_emails: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('pipeline');
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lockToast, setLockToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showLockToast = (msg: string) => {
    setLockToast(msg);
    setTimeout(() => setLockToast(null), 4000);
  };

  // ── Fetch Snapshot ──────────────────────────────────────────────────────────
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/phase1/snapshot');
      if (!res.ok) throw new Error(`Snapshot failed (${res.status})`);
      const data: SnapshotState = await res.json();
      setSnapshot(data);
    } catch (err: any) {
      console.error('Failed to load snapshot:', err);
    }
  }, []);

  // ── Fetch Audit Docs ────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/phase1/docs');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.docs) {
        setDocs(data.docs);
      }
    } catch (err) {
      console.error('Failed to load docs:', err);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    fetchDocs();
  }, [fetchSnapshot, fetchDocs]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!confirm('Reset state JAGAT Phase 1 ke data benih awal?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/reset', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast('State Phase 1 berhasil di-reset ke baseline.');
      }
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateConfig = async (cfg: {
    outbound_mode?: OutboundMode;
    global_pause?: boolean;
    budget_hard_cap_idr?: number;
    qdrant_online?: boolean;
    feature_flags?: Partial<FeatureFlags>;
  }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast('Konfigurasi sistem diperbarui.');
      }
    } catch (err: any) {
      alert(`Config update error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleAddLead = async (payload: {
    company_name: string;
    email: string;
    category: string;
    problem_hypothesis: string;
    recommended_offer: string;
    quoted_price: string;
    use_ai_draft: boolean;
  }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast(`Prospek ${payload.company_name} berhasil ditambahkan (${data.lead.status}).`);
      } else {
        alert(data.error || 'Gagal menambahkan lead');
      }
    } catch (err: any) {
      alert(`Error add lead: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleTransitionLead = async (leadId: string, nextStatus: LeadStatus, reason: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/phase1/leads/${leadId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_status: nextStatus, reason }),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast(`Lead ${leadId} ditransisikan ke ${nextStatus}.`);
      } else {
        alert(data.error || 'Gagal transisi status');
      }
    } catch (err: any) {
      alert(`Transition error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDecideApproval = async (params: {
    approval_id: string;
    decision: 'APPROVED' | 'REJECTED' | 'SKIPPED';
    edited_subject?: string;
    edited_body?: string;
    note?: string;
  }) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/phase1/approvals/${params.approval_id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast(`Approval ${params.approval_id} diputuskan: ${params.decision}.`);
      } else {
        alert(data.error || 'Gagal memproses approval');
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleTriggerSendTest = async (params: {
    lead_id: string;
    simulate_crash_after_smtp?: boolean;
    bypass_approval_gate?: boolean;
    live_smtp?: boolean;
  }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
      if (data.ok) {
        if (data.live_sent && data.real_message_id) {
          showToast(`🚀 EMAIL NYATA TERKIRIM via Gmail SMTP! ID: ${data.real_message_id.slice(0, 32)}... Cek Inbox & Sent Gmail Anda!`);
        } else {
          showToast(`Email sukses terkirim ke lead ${params.lead_id} (Staging Ledger & Idempotency OK).`);
        }
      } else {
        showToast(`[REJECT/BLOCK] ${data.send_result?.reasons?.join(', ') || data.error}`);
      }
    } catch (err: any) {
      alert(`Send error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleReconcileLead = async (leadId: string, resolution: 'CONFIRM_SENT' | 'RESET_TO_APPROVED') => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/outreach/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, resolution }),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast(`Lead ${leadId} direkonsiliasi (${resolution}).`);
      }
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleEvaluateInbound = async (params: {
    from_email: string;
    subject: string;
    raw_body: string;
    use_gemini: boolean;
  }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/inbound/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast(`Evaluasi Inbound selesai: ${data.evaluation.intent} (${data.evaluation.action_taken})`);
      } else {
        alert(data.error || 'Gagal evaluasi inbound');
      }
    } catch (err: any) {
      alert(`Inbound error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteTask = async (params: {
    task_type: ModelTaskType;
    agent: string;
    input_tokens: number;
    output_tokens: number;
    simulate_primary_timeout?: boolean;
    simulate_permanent_auth_error?: boolean;
  }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/router/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        showToast(`Task ${params.task_type} dieksekusi via ${data.result.provider}/${data.result.model}.`);
      } else {
        alert(data.error || 'Gagal eksekusi task model');
      }
    } catch (err: any) {
      alert(`Task execution error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLockAction = async (params: {
    action: 'acquire' | 'release' | 'recover_stale';
    key?: string;
    worker_id?: string;
    owner_token?: string;
  }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/phase1/locks/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
      if (params.action === 'acquire') {
        showLockToast(data.ok ? `Lock berhasil di-acquire!` : `Gagal acquire lock: ${data.result?.reason}`);
      } else if (params.action === 'release') {
        showLockToast(data.ok ? `Lock berhasil di-release!` : `Gagal release: Token pemilik tidak valid.`);
      } else {
        showLockToast(`Stale locks recovered: ${data.result?.recovered_count || 0} locks`);
      }
    } catch (err: any) {
      alert(`Lock error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFlag = async (flagKey: keyof FeatureFlags) => {
    if (!snapshot) return;
    const nextVal = !snapshot.feature_flags[flagKey];
    await handleUpdateConfig({
      feature_flags: { [flagKey]: nextVal },
    });
  };

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Activity className="w-10 h-10 animate-spin text-teal-400 mb-4" />
        <p className="font-mono text-sm tracking-wider uppercase">Loading JAGAT Phase 1 Console...</p>
      </div>
    );
  }

  const fm = snapshot.funnel_metrics;
  const bd = snapshot.budget;
  const isPaused = snapshot.global_pause;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* ── Top Bar / Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">JAGAT G7</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20">
                  Phase 1 Console
                </span>
                {isPaused ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold border border-rose-500/30 animate-pulse">
                    <PauseCircle className="w-3 h-3" /> GLOBAL PAUSE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                    <PlayCircle className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revenue Pipeline & Reliability Engineering
              </p>
            </div>
          </div>

          {/* Quick System Controls */}
          <div className="flex items-center gap-3">
            {/* Outbound Mode */}
            <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5">Mode:</span>
              {(['PREPARE', 'APPROVAL', 'CONTROLLED_AUTO_SEND'] as OutboundMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleUpdateConfig({ outbound_mode: m })}
                  disabled={busy}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                    snapshot.outbound_mode === m
                      ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 font-semibold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {m === 'PREPARE' ? 'Prepare' : m === 'APPROVAL' ? 'Approval Gate' : 'Auto-Send'}
                </button>
              ))}
            </div>

            {/* Global Pause Switch */}
            <button
              onClick={() => handleUpdateConfig({ global_pause: !isPaused })}
              disabled={busy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                isPaused
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
            >
              {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5 text-rose-500" />}
              {isPaused ? 'Resume Global' : 'Pause All Outbound'}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchSnapshot}
              disabled={busy}
              title="Refresh Snapshot"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              disabled={busy}
              title="Reset State to Baseline"
              className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── KPI Funnel Ribbon ───────────────────────────────────────────────── */}
        <div className="bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Total Leads</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{fm.total_leads}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Pending Approval</span>
              <span className="font-bold text-amber-500">{fm.pending_approval}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Sent Today</span>
              <span className="font-bold text-sky-500">
                {fm.sent_today} / {fm.max_emails_per_day}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Positive / Meeting</span>
              <span className="font-bold text-emerald-500">
                {fm.replied_positive} / {fm.meetings}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Won Deals</span>
              <span className="font-bold text-emerald-400">
                {fm.won} ({fm.won > 0 ? `Rp${(fm.won * 3500000).toLocaleString('id-ID')}` : 'Rp0'})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">API Cost / Budget</span>
              <span className={`font-bold ${bd.kill_switch_active ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                Rp{bd.total_cost_idr.toLocaleString('id-ID')} ({bd.utilization_percent}%)
              </span>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-1 overflow-x-auto border-t border-slate-200/60 dark:border-slate-800/60">
          {[
            { id: 'pipeline', label: '1. Pipeline & Prospek', icon: LayoutDashboard },
            { id: 'approval', label: '2. Telegram Approval Gate', icon: Bot, badge: fm.pending_approval },
            { id: 'inbound', label: '3. Inbound Closer & Defense', icon: Inbox },
            { id: 'router', label: '4. Model Router & Reliability', icon: Layers },
            { id: 'audit', label: '5. Audit & Blueprint Docs', icon: FileCode },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-500 font-bold">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Toast Notification ───────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-teal-500/30 flex items-center gap-3 animate-fade-in text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Main View Content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'pipeline' && (
          <LeadPipelineView
            leads={snapshot.leads}
            events={snapshot.events}
            funnelMetrics={snapshot.funnel_metrics}
            onAddLead={handleAddLead}
            onTransitionLead={handleTransitionLead}
            onNavigateTab={setActiveTab}
            busy={busy}
          />
        )}

        {activeTab === 'approval' && (
          <TelegramApprovalView
            approvals={snapshot.approvals}
            leads={snapshot.leads}
            messages={snapshot.messages}
            outboundMode={snapshot.outbound_mode}
            globalPause={snapshot.global_pause}
            funnelMetrics={snapshot.funnel_metrics}
            onDecideApproval={handleDecideApproval}
            onUpdateConfig={handleUpdateConfig}
            onTriggerSendTest={handleTriggerSendTest}
            onReconcileLead={handleReconcileLead}
            busy={busy}
            lastActionToast={toastMessage}
          />
        )}

        {activeTab === 'inbound' && (
          <InboundCloserView
            leads={snapshot.leads}
            inboundHistory={snapshot.inbound_history}
            onEvaluateInbound={handleEvaluateInbound}
            busy={busy}
          />
        )}

        {activeTab === 'router' && (
          <ModelRouterInfraView
            routes={snapshot.model_routes}
            usage={snapshot.model_usage}
            tasks={snapshot.tasks}
            budget={snapshot.budget}
            reliability={snapshot.reliability_metrics}
            onExecuteTask={handleExecuteTask}
            onUpdateConfig={handleUpdateConfig}
            onLockAction={handleLockAction}
            busy={busy}
            lockStatusToast={lockToast}
          />
        )}

        {activeTab === 'audit' && (
          <AuditAndBlueprintView
            docs={docs}
            featureFlags={snapshot.feature_flags}
            onToggleFlag={handleToggleFlag}
          />
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 py-3 text-center">
        JAGAT G7 Sovereign Super Intelligence Core • Phase 1 Operations Console • Grounded & Idempotent
      </footer>
    </div>
  );
}
