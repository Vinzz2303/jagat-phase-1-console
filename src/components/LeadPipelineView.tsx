import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  History,
  Mail,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type { LeadRecord, LeadStatus, OutreachEvent } from '../phase1/types';

interface LeadPipelineViewProps {
  leads: LeadRecord[];
  events: OutreachEvent[];
  funnelMetrics: {
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
  };
  onAddLead: (payload: {
    company_name: string;
    email: string;
    category: string;
    problem_hypothesis: string;
    recommended_offer: string;
    quoted_price: string;
    use_ai_draft: boolean;
  }) => Promise<void>;
  onTransitionLead: (leadId: string, nextStatus: LeadStatus, reason: string) => Promise<void>;
  onNavigateTab: (tab: 'pipeline' | 'approval' | 'inbound' | 'router' | 'audit') => void;
  busy: boolean;
}

const STATUS_TONE: Record<LeadStatus, string> = {
  DISCOVERED: 'text-slate-600 dark:text-slate-400',
  QUALIFIED: 'text-sky-600 dark:text-sky-400',
  CONTACT_VERIFIED: 'text-cyan-600 dark:text-cyan-400',
  DRAFTED: 'text-indigo-600 dark:text-indigo-400',
  PENDING_APPROVAL: 'text-amber-600 dark:text-amber-400 font-semibold',
  SENT: 'text-blue-600 dark:text-blue-400',
  REPLIED: 'text-teal-600 dark:text-teal-400',
  POSITIVE: 'text-emerald-600 dark:text-emerald-400 font-semibold',
  MEETING: 'text-emerald-600 dark:text-emerald-300 font-semibold',
  PROPOSAL: 'text-emerald-600 dark:text-emerald-300 font-semibold',
  WON: 'text-emerald-700 dark:text-emerald-300 font-bold',
  LOST: 'text-slate-500 dark:text-slate-500',
  BOUNCED: 'text-rose-600 dark:text-rose-400',
  FAILED: 'text-rose-600 dark:text-rose-400',
  DUPLICATE: 'text-rose-600 dark:text-rose-400',
  SUPPRESSED: 'text-rose-600 dark:text-rose-400',
  UNSUBSCRIBED: 'text-rose-600 dark:text-rose-400',
  NEEDS_HUMAN_REVIEW: 'text-amber-600 dark:text-amber-300 font-semibold',
  NEEDS_RECONCILIATION: 'text-amber-600 dark:text-amber-300 font-semibold',
};

const NEXT_STAGE_MAP: Partial<Record<LeadStatus, { status: LeadStatus; label: string }>> = {
  DISCOVERED: { status: 'QUALIFIED', label: 'Qualify Lead' },
  QUALIFIED: { status: 'CONTACT_VERIFIED', label: 'Verify Contact' },
  CONTACT_VERIFIED: { status: 'PENDING_APPROVAL', label: 'Queue Approval' },
  DRAFTED: { status: 'PENDING_APPROVAL', label: 'Queue Approval' },
  POSITIVE: { status: 'MEETING', label: 'Mark Meeting Booked' },
  MEETING: { status: 'PROPOSAL', label: 'Send Proposal' },
  PROPOSAL: { status: 'WON', label: 'Close Won' },
};

export function LeadPipelineView({
  leads,
  events,
  funnelMetrics,
  onAddLead,
  onTransitionLead,
  onNavigateTab,
  busy,
}: LeadPipelineViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVAL' | 'ACTIVE_FUNNEL' | 'WON' | 'BLOCKED'>('ALL');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id ?? null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState('printing');
  const [formProblem, setFormProblem] = useState('');
  const [formOffer, setFormOffer] = useState('AI Admin Bot + Website Cepat');
  const [formPrice, setFormPrice] = useState('Rp2.500.000');
  const [formUseAi, setFormUseAi] = useState(true);
  const [formError, setFormError] = useState('');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'APPROVAL') return lead.status === 'PENDING_APPROVAL';
    if (statusFilter === 'ACTIVE_FUNNEL')
      return ['SENT', 'REPLIED', 'POSITIVE', 'MEETING', 'PROPOSAL'].includes(lead.status);
    if (statusFilter === 'WON') return lead.status === 'WON';
    if (statusFilter === 'BLOCKED')
      return ['SUPPRESSED', 'UNSUBSCRIBED', 'DUPLICATE', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RECONCILIATION'].includes(
        lead.status,
      );
    return true;
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? filteredLeads[0] ?? null;
  const selectedEvents = selectedLead ? events.filter((e) => e.lead_id === selectedLead.id) : [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formCompany.trim() || !formEmail.trim() || !formProblem.trim()) {
      setFormError('Nama perusahaan, alamat email, dan hipotesis masalah wajib diisi.');
      return;
    }
    await onAddLead({
      company_name: formCompany.trim(),
      email: formEmail.trim(),
      category: formCategory,
      problem_hypothesis: formProblem.trim(),
      recommended_offer: formOffer,
      quoted_price: formPrice,
      use_ai_draft: formUseAi,
    });
    setFormCompany('');
    setFormEmail('');
    setFormProblem('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Revenue Funnel KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Leads</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {funnelMetrics.total_leads}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Verified: {funnelMetrics.qualified_and_verified}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('approval')}
          className="text-left p-4 bg-white dark:bg-slate-900 border border-amber-500/40 dark:border-amber-500/30 rounded-lg hover:border-amber-500 transition-colors"
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Approval</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {funnelMetrics.pending_approval}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review via Telegram UX →</div>
        </button>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Outbound Sent</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
            {funnelMetrics.sent}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Today: {funnelMetrics.sent_today}/{funnelMetrics.max_emails_per_day}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Positive Replies</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {funnelMetrics.replied_positive}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Intent ≥ 0.80 verified</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Meetings & Proposals</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-300">
            {funnelMetrics.meetings} / {funnelMetrics.proposals}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Calendly + Proposal</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-500/40 dark:border-emerald-500/30 rounded-lg">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Closed Won</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {funnelMetrics.won}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">Rp3.500.000+</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-slate-400">Suppressed / Guarded</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {funnelMetrics.suppressed_or_unsubscribed + funnelMetrics.needs_human_or_reconciliation}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Review: {funnelMetrics.needs_human_or_reconciliation}
          </div>
        </div>
      </div>

      {/* Main Split: Lead Table (Left 7 cols) + Lead Inspector & Event History (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                01. Prospect Pipeline & State Machine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Discovery → Qualification → Contact Verification → Draft → Policy/Approval → Sent → Reply → Won
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Discover & Qualify Lead
            </button>
          </div>

          {/* Search & Interactive Filter Tabs */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Filter leads by company, email, or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari perusahaan, email, atau kategori..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-md">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'APPROVAL', label: 'Pending Approval' },
                  { id: 'ACTIVE_FUNNEL', label: 'Active Funnel' },
                  { id: 'WON', label: 'Won' },
                  { id: 'BLOCKED', label: 'Guarded/Opt-Out' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* High-Density Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-2.5 px-4">Company & Contact</th>
                  <th className="py-2.5 px-3">Offer & Price</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Tidak ada prospek yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    const nextStage = NEXT_STAGE_MAP[lead.status];
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-50/70 dark:bg-sky-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {lead.company_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {lead.email} · {lead.category}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-700 dark:text-slate-300">{lead.recommended_offer}</div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {lead.quoted_price}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {lead.qualification_score}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-mono text-[11px] ${STATUS_TONE[lead.status]}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {lead.status === 'PENDING_APPROVAL' ? (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('approval')}
                              className="px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded whitespace-nowrap"
                            >
                              Review in Telegram
                            </button>
                          ) : nextStage ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                onTransitionLead(
                                  lead.id,
                                  nextStage.status,
                                  `Advanced to ${nextStage.status} via Pipeline Console`,
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded whitespace-nowrap"
                            >
                              {nextStage.label}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            >
                              InspectHistory
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Lead State Inspector & Audit Trail */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5">
          {selectedLead ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedLead.id} · {selectedLead.campaign_id}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedLead.company_name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {selectedLead.email} {selectedLead.phone ? `· ${selectedLead.phone}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono ${STATUS_TONE[selectedLead.status]}`}>
                    {selectedLead.status}
                  </div>
                  <div className="flex items-center gap-1.5 justify-end mt-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      Appr: {selectedLead.approval_status || 'PENDING'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      Deliv: {selectedLead.delivery_status || 'NOT_SENT'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    Score: {selectedLead.qualification_score}/100
                  </div>
                </div>
              </div>

              {/* Verified Grounding Facts */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Verified Grounding Facts (Anti-Hallucination Allowlist)
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {selectedLead.verified_facts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Draft Preview */}
              {selectedLead.draft_subject && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Subject: <span className="text-slate-900 dark:text-slate-200">{selectedLead.draft_subject}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedLead.draft_body}
                  </p>
                </div>
              )}

              {/* Quick State Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedLead.status !== 'SUPPRESSED' && selectedLead.status !== 'UNSUBSCRIBED' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onTransitionLead(
                        selectedLead.id,
                        'SUPPRESSED',
                        `Manually suppressed ${selectedLead.company_name}`,
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md transition-colors"
                  >
                    Suppress / Opt-Out Lead
                  </button>
                )}
                {selectedLead.status === 'NEEDS_HUMAN_REVIEW' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onTransitionLead(
                        selectedLead.id,
                        'POSITIVE',
                        'Human reviewer verified positive intent',
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition-colors"
                  >
                    Approve as Positive Reply
                  </button>
                )}
              </div>

              {/* Outreach Event History (Sec 5 & 6 Requirement) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-500" />
                    Outreach Event History ({selectedEvents.length})
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">outreach_events</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-sky-600 dark:text-sky-400 text-[11px]">
                          {ev.event_type}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] text-slate-500">
                          {ev.created_at.slice(11, 19)} UTC
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                        {ev.from_status ? `${ev.from_status} → ` : ''}
                        <span className="text-slate-900 dark:text-slate-200 font-semibold">{ev.to_status}</span> · by{' '}
                        {ev.actor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Pilih salah satu prospek di tabel untuk melihat detail state machine & histori event.
            </div>
          )}
        </div>
      </div>

      {/* Add & Qualify Lead Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-lead-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 id="add-lead-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Discover, Qualify & Draft New Prospect
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 rounded">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Perusahaan / Prospek
                </label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="Contoh: PT. Nusantara Logistik Terpadu"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Kontak Publik
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="info@nusantaralogistik.co.id"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori Industri</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100"
                  >
                    <option value="printing">Percetakan & Kemasan</option>
                    <option value="logistics">Logistik & Kargo</option>
                    <option value="apps-tech">Startup & Software</option>
                    <option value="hospitality">Perhotelan & Resort</option>
                    <option value="school">Pendidikan & Sekolah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hipotesis Masalah Terverifikasi (Grounding Facts)
                </label>
                <textarea
                  rows={2}
                  value={formProblem}
                  onChange={(e) => setFormProblem(e.target.value)}
                  placeholder="Contoh: Belum memiliki bot pelacakan resi otomatis dan kalkulasi tarif kargo B2B via WhatsApp."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Paket Ditawarkan</label>
                  <input
                    type="text"
                    value={formOffer}
                    onChange={(e) => setFormOffer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Estimasi Harga</label>
                  <input
                    type="text"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formUseAi}
                  onChange={(e) => setFormUseAi(e.target.checked)}
                  className="rounded border-slate-400"
                />
                <span className="text-slate-600 dark:text-slate-300">
                  Gunakan Gemini 3.8 Flash (via Model Router) untuk merangkai draft email berbasis fakta
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md"
                >
                  {busy ? 'Memproses...' : 'Run Qualification & Queue Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
