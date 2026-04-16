'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, XCircle, Clock, AlertTriangle, Brain, Filter, Download, RefreshCw, ChevronDown, ChevronUp, Zap, Target, DollarSign, Pause, Play, BarChart2, Loader2, Search, TrendingUp, Lock, Unlock, ArrowLeft, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  action_type: string;
  reasoning: string;
  confidence_score: number;
  status: string;
  target_type: string | null;
  target_id: string | null;
  outcome: string | null;
  ai_model: string | null;
  created_at: string;
  executed_at: string | null;
  // Approval chain fields (from ai_control_settings at time of action)
  blocked_reason?: string;
  approval_required?: boolean;
  spend_limit_checked?: boolean;
}

interface AuditStats {
  total: number;
  executed: number;
  blocked: number;
  pending: number;
  avgConfidence: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  campaign_created:   { label: 'Campaign Created',   icon: Target,     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  campaign_paused:    { label: 'Campaign Paused',    icon: Pause,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  campaign_resumed:   { label: 'Campaign Resumed',   icon: Play,       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  campaign_optimized: { label: 'Campaign Optimized', icon: Zap,        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  budget_adjusted:    { label: 'Budget Adjusted',    icon: DollarSign, color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  strategy_updated:   { label: 'Strategy Updated',   icon: Brain,      color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  creative_flagged:   { label: 'Creative Flagged',   icon: AlertTriangle, color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  goal_updated:       { label: 'Goal Updated',       icon: TrendingUp, color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  executed: { label: 'Executed',  color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle2 },
  approved: { label: 'Approved',  color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle2 },
  pending:  { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  skipped:  { label: 'Blocked',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: XCircle },
  failed:   { label: 'Failed',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: XCircle },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

function formatRelative(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#f59e0b' : '#f87171';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color, minWidth: 32 }}>{score}%</span>
    </div>
  );
}

// ─── Approval Chain Component ─────────────────────────────────────────────────
function ApprovalChain({ entry }: { entry: AuditEntry }) {
  const isBlocked = entry.status === 'skipped' || entry.status === 'failed';
  const isExecuted = entry.status === 'executed';

  const steps = [
    {
      label: 'AI Decision',
      detail: `Confidence: ${entry.confidence_score}%`,
      status: 'done',
      icon: Brain,
    },
    {
      label: 'Threshold Check',
      detail: entry.confidence_score >= 75 ? 'Passed (≥75%)' : 'Below threshold',
      status: entry.confidence_score >= 75 ? 'done' : 'blocked',
      icon: Shield,
    },
    {
      label: 'Spend Limit Check',
      detail: entry.action_type === 'budget_adjusted' ? 'Spend limit evaluated' : 'Not applicable',
      status: entry.action_type === 'budget_adjusted' ? (isBlocked ? 'blocked' : 'done') : 'skipped',
      icon: DollarSign,
    },
    {
      label: 'Override Check',
      detail: isBlocked ? 'Manual override active or blocked' : 'No override active',
      status: isBlocked ? 'blocked' : 'done',
      icon: isBlocked ? Lock : Unlock,
    },
    {
      label: 'Execution',
      detail: isExecuted
        ? (entry.executed_at ? `Executed at ${formatTimestamp(entry.executed_at)}` : 'Executed')
        : isBlocked ? 'Blocked — not executed' : 'Awaiting execution',
      status: isExecuted ? 'done' : isBlocked ? 'blocked' : 'pending',
      icon: isExecuted ? CheckCircle2 : isBlocked ? XCircle : Clock,
    },
  ];

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(148,163,184,0.5)' }}>
        Approval Chain
      </p>
      <div className="flex items-start gap-0">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = step.status === 'done';
          const isBlockedStep = step.status === 'blocked';
          const isSkipped = step.status === 'skipped';
          const isPending = step.status === 'pending';
          const dotColor = isDone ? '#34d399' : isBlockedStep ? '#f87171' : isSkipped ? 'rgba(148,163,184,0.3)' : '#f59e0b';
          const lineColor = idx < steps.length - 1
            ? (isDone ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)')
            : 'transparent';

          return (
            <div key={idx} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className="absolute top-3 left-1/2 w-full h-px"
                  style={{ background: lineColor, zIndex: 0 }}
                />
              )}
              {/* Dot */}
              <div
                className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: isDone ? 'rgba(52,211,153,0.15)' : isBlockedStep ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${dotColor}` }}
              >
                <StepIcon size={11} style={{ color: dotColor }} />
              </div>
              {/* Label */}
              <div className="mt-2 text-center px-1">
                <p className="text-[10px] font-semibold leading-tight" style={{ color: isSkipped ? 'rgba(148,163,184,0.35)' : '#e2e8f0' }}>{step.label}</p>
                <p className="text-[9px] mt-0.5 leading-tight" style={{ color: 'rgba(148,163,184,0.45)' }}>{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Audit Row ────────────────────────────────────────────────────────────────
function AuditRow({ entry, index }: { entry: AuditEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[entry.action_type] || { label: entry.action_type, icon: Brain, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  const statusMeta = STATUS_META[entry.status] || STATUS_META['pending'];
  const ActionIcon = meta.icon;
  const StatusIcon = statusMeta.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: expanded ? 'rgba(15,31,61,0.9)' : 'rgba(15,31,61,0.6)',
        border: `1px solid ${expanded ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: expanded ? '0 4px 24px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {/* Row Header */}
      <button
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Index */}
        <span className="text-[11px] font-mono tabular-nums flex-shrink-0 w-6 text-right" style={{ color: 'rgba(148,163,184,0.35)' }}>
          {index + 1}
        </span>

        {/* Action Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
          <ActionIcon size={14} style={{ color: meta.color }} />
        </div>

        {/* Action + Reasoning */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold" style={{ color: '#e2e8f0' }}>{meta.label}</span>
            {entry.target_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.7)' }}>
                {entry.target_type}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(148,163,184,0.65)' }}>{entry.reasoning}</p>
        </div>

        {/* Confidence */}
        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 w-28">
          <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>Confidence</span>
          <ConfidenceBar score={entry.confidence_score} />
        </div>

        {/* Status Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: statusMeta.bg, border: `1px solid ${statusMeta.color}22` }}
        >
          <StatusIcon size={11} style={{ color: statusMeta.color }} />
          <span className="text-[11px] font-semibold" style={{ color: statusMeta.color }}>{statusMeta.label}</span>
        </div>

        {/* Timestamp */}
        <div className="hidden md:flex flex-col items-end flex-shrink-0 w-20">
          <span className="text-[11px] font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>{formatRelative(entry.created_at)}</span>
          <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.35)' }}>
            {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Expand Toggle */}
        <div className="flex-shrink-0 ml-1">
          {expanded ? <ChevronUp size={14} style={{ color: 'rgba(148,163,184,0.5)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(148,163,184,0.5)' }} />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            {/* Full Reasoning */}
            <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(148,163,184,0.5)' }}>AI Reasoning</p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#cbd5e1' }}>{entry.reasoning}</p>
            </div>

            {/* Metadata */}
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Metadata</p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>Action ID</span>
                  <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>{entry.id.slice(0, 8)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>AI Model</span>
                  <span className="text-[11px] font-semibold" style={{ color: '#a78bfa' }}>{entry.ai_model || 'gpt-5'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>Initiated</span>
                  <span className="text-[11px]" style={{ color: '#e2e8f0' }}>{formatTimestamp(entry.created_at)}</span>
                </div>
                {entry.executed_at && (
                  <div className="flex justify-between">
                    <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>Executed</span>
                    <span className="text-[11px]" style={{ color: '#34d399' }}>{formatTimestamp(entry.executed_at)}</span>
                  </div>
                )}
                {entry.outcome && (
                  <div className="flex justify-between">
                    <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>Outcome</span>
                    <span className="text-[11px]" style={{ color: '#e2e8f0' }}>{entry.outcome}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>Confidence</span>
                  <div className="w-24">
                    <ConfidenceBar score={entry.confidence_score} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Chain */}
          <ApprovalChain entry={entry} />
        </div>
      )}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: AuditStats }) {
  const cards = [
    { label: 'Total Actions', value: stats.total, icon: BarChart2, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Executed', value: stats.executed, icon: CheckCircle2, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    { label: 'Blocked', value: stats.blocked, icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Avg Confidence', value: `${stats.avgConfidence}%`, icon: Shield, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => {
        const CardIcon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
              <CardIcon size={16} style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-bold leading-tight" style={{ color: '#f1f5f9' }}>{card.value}</p>
              <p className="text-[10px] leading-tight" style={{ color: 'rgba(148,163,184,0.55)' }}>{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIAuditPage() {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filtered, setFiltered] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats>({ total: 0, executed: 0, blocked: 0, pending: 0, avgConfidence: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAuditLog = useCallback(async () => {
    if (!companyId) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('ai_autonomous_actions')
        .select('id, action_type, reasoning, confidence_score, status, target_type, target_id, outcome, ai_model, created_at, executed_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows: AuditEntry[] = (data || []).map((r: any) => ({
        id: r.id,
        action_type: r.action_type,
        reasoning: r.reasoning,
        confidence_score: Math.round(r.confidence_score || 0),
        status: r.status,
        target_type: r.target_type,
        target_id: r.target_id,
        outcome: r.outcome,
        ai_model: r.ai_model,
        created_at: r.created_at,
        executed_at: r.executed_at,
      }));

      setEntries(rows);

      const executed = rows.filter(r => r.status === 'executed' || r.status === 'approved').length;
      const blocked = rows.filter(r => r.status === 'skipped' || r.status === 'failed').length;
      const pending = rows.filter(r => r.status === 'pending').length;
      const avgConf = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.confidence_score, 0) / rows.length) : 0;

      setStats({ total: rows.length, executed, blocked, pending, avgConfidence: avgConf });
    } catch (e) {
      console.error('Error fetching audit log:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  // Apply filters
  useEffect(() => {
    let result = [...entries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.reasoning.toLowerCase().includes(q) ||
        e.action_type.toLowerCase().includes(q) ||
        (e.target_type || '').toLowerCase().includes(q) ||
        (e.outcome || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'executed') result = result.filter(e => e.status === 'executed' || e.status === 'approved');
      else if (statusFilter === 'blocked') result = result.filter(e => e.status === 'skipped' || e.status === 'failed');
      else result = result.filter(e => e.status === statusFilter);
    }

    if (actionFilter !== 'all') {
      result = result.filter(e => e.action_type === actionFilter);
    }

    if (confidenceFilter !== 'all') {
      if (confidenceFilter === 'high') result = result.filter(e => e.confidence_score >= 80);
      else if (confidenceFilter === 'medium') result = result.filter(e => e.confidence_score >= 60 && e.confidence_score < 80);
      else if (confidenceFilter === 'low') result = result.filter(e => e.confidence_score < 60);
    }

    setFiltered(result);
  }, [entries, searchQuery, statusFilter, actionFilter, confidenceFilter]);

  function exportCSV() {
    const headers = ['ID', 'Action', 'Status', 'Confidence', 'Reasoning', 'Target Type', 'AI Model', 'Created At', 'Executed At', 'Outcome'];
    const rows = filtered.map(e => [
      e.id,
      ACTION_META[e.action_type]?.label || e.action_type,
      e.status,
      `${e.confidence_score}%`,
      `"${e.reasoning.replace(/"/g, '""')}"`,
      e.target_type || '',
      e.ai_model || '',
      e.created_at,
      e.executed_at || '',
      e.outcome || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shaarvik-ai-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1f3c 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/marketing/ai"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft size={15} style={{ color: '#94a3b8' }} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(59,130,246,0.2) 100%)', border: '1px solid rgba(167,139,250,0.25)' }}
                >
                  <Shield size={16} style={{ color: '#a78bfa' }} />
                </div>
                <h1 className="text-[20px] font-bold" style={{ color: '#f1f5f9' }}>AI Audit Log</h1>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}
                >
                  COMPLIANCE
                </span>
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Every action Shaarvik AI executed, approved, or blocked — with full approval chains
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuditLog}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && <StatsBar stats={stats} />}

        {/* Filters */}
        <div
          className="rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center"
          style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.5)' }} />
            <input
              type="text"
              placeholder="Search reasoning, action type…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-[12px] outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          >
            <option value="all">All Statuses</option>
            <option value="executed">Executed</option>
            <option value="blocked">Blocked</option>
            <option value="pending">Pending</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-[12px] outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          >
            <option value="all">All Actions</option>
            {Object.entries(ACTION_META).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {/* Confidence Filter */}
          <select
            value={confidenceFilter}
            onChange={e => setConfidenceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-[12px] outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          >
            <option value="all">All Confidence</option>
            <option value="high">High (≥80%)</option>
            <option value="medium">Medium (60–79%)</option>
            <option value="low">Low (&lt;60%)</option>
          </select>

          <span className="text-[11px] ml-auto" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {filtered.length} of {entries.length} entries
          </span>
        </div>

        {/* Audit List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
            <p className="text-[13px]" style={{ color: 'rgba(148,163,184,0.6)' }}>Loading audit log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
            style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)' }}>
              <Shield size={24} style={{ color: '#a78bfa' }} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold" style={{ color: '#e2e8f0' }}>No audit entries found</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(148,163,184,0.55)' }}>
                {entries.length === 0
                  ? 'Shaarvik AI has not taken any actions yet. Enable autonomous mode to start.' :'No entries match your current filters.'}
              </p>
            </div>
            {entries.length === 0 && (
              <Link
                href="/marketing/ai"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}
              >
                <Brain size={13} />
                Go to Shaarvik AI
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column Headers */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2">
              <span className="w-6" />
              <span className="w-8" />
              <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(71,85,105,0.8)' }}>Action / Reasoning</span>
              <span className="w-28 text-[10px] font-semibold uppercase tracking-widest text-right" style={{ color: 'rgba(71,85,105,0.8)' }}>Confidence</span>
              <span className="w-24 text-[10px] font-semibold uppercase tracking-widest text-center" style={{ color: 'rgba(71,85,105,0.8)' }}>Status</span>
              <span className="w-20 text-[10px] font-semibold uppercase tracking-widest text-right" style={{ color: 'rgba(71,85,105,0.8)' }}>Time</span>
              <span className="w-5" />
            </div>

            {filtered.map((entry, idx) => (
              <AuditRow key={entry.id} entry={entry} index={idx} />
            ))}
          </div>
        )}

        {/* Compliance Notice */}
        <div
          className="mt-6 rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
        >
          <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#a78bfa' }} />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: '#c4b5fd' }}>Compliance & Audit Trail</p>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>
              This log captures every autonomous action Shaarvik AI initiated, including actions that were blocked by approval thresholds, daily spend limits, or manual override. All entries are immutable and timestamped for compliance purposes. Export to CSV for external audit review.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
