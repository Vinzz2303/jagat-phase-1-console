import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Lock,
  Play,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type {
  AgentTaskRecord,
  ModelRouteConfig,
  ModelTaskType,
  ModelUsageRecord,
  QdrantValidationReport,
  RedisLockEntry,
} from '../phase1/types';

interface ModelRouterInfraViewProps {
  routes: ModelRouteConfig[];
  usage: ModelUsageRecord[];
  tasks: AgentTaskRecord[];
  budget: {
    total_cost_idr: number;
    hard_cap_idr: number;
    daily_alert_idr: number;
    kill_switch_active: boolean;
    utilization_percent: number;
  };
  reliability: {
    total_tasks: number;
    completed_tasks: number;
    dead_letter_tasks: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    active_redis_locks: RedisLockEntry[];
    qdrant_rag: QdrantValidationReport;
  };
  onExecuteTask: (params: {
    task_type: ModelTaskType;
    agent: string;
    input_tokens: number;
    output_tokens: number;
    simulate_primary_timeout?: boolean;
    simulate_permanent_auth_error?: boolean;
  }) => Promise<void>;
  onUpdateConfig: (cfg: { budget_hard_cap_idr?: number; qdrant_online?: boolean }) => Promise<void>;
  onLockAction: (params: {
    action: 'acquire' | 'release' | 'recover_stale';
    key?: string;
    worker_id?: string;
    owner_token?: string;
  }) => Promise<void>;
  busy: boolean;
  lockStatusToast: string | null;
}

export function ModelRouterInfraView({
  routes,
  usage,
  tasks,
  budget,
  reliability,
  onExecuteTask,
  onUpdateConfig,
  onLockAction,
  busy,
  lockStatusToast,
}: ModelRouterInfraViewProps) {
  const [selectedTaskType, setSelectedTaskType] = useState<ModelTaskType>('email_generation');
  const [workerId, setWorkerId] = useState('worker-swarm-a');
  const [lockKey, setLockKey] = useState('colony:campaign:lock:camp-id-b2b-q4');

  const qdrant = reliability.qdrant_rag;

  return (
    <div className="space-y-6">
      {/* Top Row: Budget Hard Cap & Reliability Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Phase 1 Budget & Kill Switch Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Phase 1 API Budget & Hard Cap
            </span>
            <span
              className={`text-[11px] font-mono font-bold ${
                budget.kill_switch_active
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {budget.kill_switch_active ? 'KILL SWITCH ACTIVE' : 'WITHIN BUDGET'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            Rp{budget.total_cost_idr.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-slate-500">
              / Rp{budget.hard_cap_idr.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                budget.kill_switch_active ? 'bg-rose-500' : 'bg-sky-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, budget.utilization_percent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  budget_hard_cap_idr: budget.hard_cap_idr <= 150 ? 500_000 : 100,
                })
              }
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded transition-colors"
            >
              {budget.hard_cap_idr <= 150
                ? 'Reset Cap to Rp500.000'
                : 'Simulate Budget Cap Exceeded (Rp100)'}
            </button>
            <span className="text-[11px] font-mono text-slate-500">
              Daily Alert: Rp{budget.daily_alert_idr.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Latency & Task Telemetry Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Model Latency & Task Recovery
            </span>
            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400">
              {reliability.completed_tasks}/{reliability.total_tasks} Completed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Latency p50</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {reliability.latency_p50_ms} ms
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Latency p95</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {reliability.latency_p95_ms} ms
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Dead-Letter Tasks (No Auth Retry): {reliability.dead_letter_tasks}
          </div>
        </div>

        {/* Qdrant / RAG Health & Dimension Check Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Qdrant / RAG Vector Memory
            </span>
            <span
              className={`text-[11px] font-mono font-bold ${
                qdrant.service_Reachable
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {qdrant.service_Reachable ? 'HEALTHY (768-DIM MATCH)' : 'DEGRADED (NON-RAG FALLBACK)'}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
            Collection: <strong>{qdrant.collection_name}</strong> ({qdrant.points_count} chunks)
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Model: <code className="font-mono">{qdrant.embedding_model}</code> · Dim: {qdrant.expected_dimension}
          </div>
          <button
            type="button"
            onClick={() => onUpdateConfig({ qdrant_online: !qdrant.service_Reachable })}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded transition-colors"
          >
            {qdrant.service_Reachable ? 'Simulate Qdrant Outage (Test Fallback)' : 'Restore Qdrant Service Online'}
          </button>
        </div>
      </div>

      {/* Model Intelligence Router Table & Simulator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              02. Model Intelligence Router & Timeout/Fallback Simulator (Bagian 9 Blueprint)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Memilih model berdasarkan jenis task, biaya, dan latency. Jangan me-retry error auth/billing berulang kali.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Pilih Task Type untuk simulasi Model Router"
              value={selectedTaskType}
              onChange={(e) => setSelectedTaskType(e.target.value as ModelTaskType)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md font-mono text-slate-900 dark:text-slate-100"
            >
              {routes.map((r) => (
                <option key={r.task_type} value={r.task_type}>
                  {r.task_type} ({r.primary_model})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onExecuteTask({
                  task_type: selectedTaskType,
                  agent: 'router-benchmark',
                  input_tokens: 1600,
                  output_tokens: 550,
                })
              }
              className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md"
            >
              Run Primary Route
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onExecuteTask({
                  task_type: selectedTaskType,
                  agent: 'router-benchmark',
                  input_tokens: 1600,
                  output_tokens: 550,
                  simulate_primary_timeout: true,
                })
              }
              className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md"
            >
              Simulate Timeout → Fallback
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onExecuteTask({
                  task_type: selectedTaskType,
                  agent: 'router-benchmark',
                  input_tokens: 1000,
                  output_tokens: 200,
                  simulate_permanent_auth_error: true,
                })
              }
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md"
            >
              Simulate 401 Auth Error (No Retry)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-2.5 px-4">Task Type</th>
                <th className="py-2.5 px-3">Primary Route</th>
                <th className="py-2.5 px-3">Fallback Route</th>
                <th className="py-2.5 px-3 text-right">Timeout / Retries</th>
                <th className="py-2.5 px-4">Control & Guardrail Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
              {routes.map((r) => (
                <tr key={r.task_type} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{r.label}</div>
                    <div className="text-[11px] font-mono text-slate-500">{r.task_type}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-sky-600 dark:text-sky-400 font-semibold">
                    {r.primary_model} ({r.primary_provider})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {r.fallback_model} ({r.fallback_provider})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {r.timeout_ms}ms · max {r.max_retries}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{r.control_policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Split: Model Usage JSON Ledger (Left 6) + Redis Safe Lock Manager (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Minimum Observability Log (`model_usage` — Sec 12 Format)
            </h3>
            <span className="text-[11px] font-mono text-slate-500">{usage.length} records</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {usage.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-slate-950 text-slate-200 rounded border border-slate-800 font-mono text-[11px] leading-relaxed overflow-x-auto"
              >
                {JSON.stringify({
                  task_id: u.task_id,
                  agent: u.agent,
                  task_type: u.task_type,
                  status: 'completed',
                  provider: u.provider,
                  model: u.model,
                  duration_ms: u.latency_ms,
                  input_tokens: u.input_tokens,
                  output_tokens: u.output_tokens,
                  estimated_cost_idr: u.estimated_cost_idr,
                  fallback_used: u.fallback_used,
                  retry_count: u.retry_count,
                  verification: u.verification,
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Redis Safe Lock & C6 Scheduler Overlap Guard */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Redis Distributed Lock & Compare-and-Delete Guard (Sec 5 & 7)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mencegah dua worker memproses campaign yang sama secara paralel. Hanya pemilik <code className="font-mono">owner_token</code> yang dapat melepas lock.
            </p>
          </div>

          {lockStatusToast && (
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded text-xs font-mono text-sky-700 dark:text-sky-300">
              {lockStatusToast}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Lock Key</label>
              <input
                type="text"
                value={lockKey}
                onChange={(e) => setLockKey(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Worker ID</label>
              <select
                aria-label="Pilih Worker ID untuk uji Redis Lock"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded font-mono text-slate-900 dark:text-slate-100"
              >
                <option value="worker-swarm-a">worker-swarm-a (Primary)</option>
                <option value="worker-swarm-b">worker-swarm-b (Competing Worker)</option>
                <option value="c6-scheduler-loop">c6-scheduler-loop</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLockAction({ action: 'acquire', key: lockKey, worker_id: workerId })}
              className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md"
            >
              Acquire Lock ({workerId})
            </button>
            <button
              type="button"
              onClick={() => onLockAction({ action: 'recover_stale' })}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md"
            >
              Sweep & Recover Stale Locks
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active Redis Locks ({reliability.active_redis_locks.length})
            </div>
            {reliability.active_redis_locks.length === 0 ? (
              <div className="text-xs text-slate-500 py-3">
                Tidak ada lock aktif saat ini. Klik <strong>Acquire Lock</strong> untuk menguji proteksi overlap.
              </div>
            ) : (
              reliability.active_redis_locks.map((lk) => (
                <div
                  key={lk.key}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{lk.key}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Owner: {lk.worker_id} · Token: {lk.owner_token}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onLockAction({
                          action: 'release',
                          key: lk.key,
                          owner_token: lk.owner_token,
                        })
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded"
                    >
                      Safe Release (Valid Token)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onLockAction({
                          action: 'release',
                          key: lk.key,
                          owner_token: 'invalid-foreign-token',
                        })
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded"
                    >
                      Test Wrong Token
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
