'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Zap, Target, TrendingUp, DollarSign, Users, Play, Pause, ChevronRight, AlertTriangle, CheckCircle2, Loader2, Sparkles, BarChart2, Activity, Eye, Cpu, GitBranch, Shield, Clock, Database, FlaskConical, Network, ToggleLeft, ToggleRight, Plus, Gauge, Flame, Crosshair, BookOpen, WifiOff, Wifi, BookMarked } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  leads_count: number;
  revenue: number;
  channel: string | null;
}

interface AIGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  timeframe_days: number;
  status: string;
  ai_strategy: any;
}

interface AutonomousAction {
  id: string;
  action_type: string;
  reasoning: string;
  confidence_score: number;
  status: string;
  target_type: string | null;
  created_at: string;
  executed_at: string | null;
}

interface ControlSettings {
  autonomous_mode: boolean;
  auto_pause_underperforming: boolean;
  auto_scale_top_campaigns: boolean;
  auto_create_campaigns: boolean;
  min_confidence_to_act: number;
  learning_enabled: boolean;
  cross_module_intelligence: boolean;
  notification_on_action: boolean;
  // Approval & Safety Controls
  approval_threshold: number;
  daily_spend_limit: number;
  require_approval_above_spend: boolean;
  manual_override_active: boolean;
  approval_required_for_launch: boolean;
  approval_required_for_budget_change: boolean;
  max_budget_change_pct: number;
}

interface SimulationResult {
  scenario_name: string;
  predicted_leads: number;
  predicted_revenue: number;
  predicted_roi: number;
  confidence_score: number;
  key_assumptions: string[];
  risk_factors: string[];
  recommended_action: string;
  alternative_scenarios: { name: string; predicted_leads: number; confidence: number }[];
}

interface ObserveResult {
  health_score: number;
  key_observations: string[];
  critical_issues: string[];
  opportunities: string[];
  cross_module_signals: string[];
  next_actions: { action: string; priority: string; confidence: number; reasoning: string }[];
}

interface StrategyResult {
  strategy_name: string;
  primary_focus: string;
  campaigns_to_pause: { id: string; name: string; reason: string }[];
  campaigns_to_scale: { id: string; name: string; reason: string; budget_increase_pct: number }[];
  new_campaign_ideas: { name: string; channel: string; budget: number; target_audience: string; expected_leads: number }[];
  budget_reallocation: string;
  confidence_score: number;
  estimated_goal_achievement_pct: number;
}

interface CrossModuleResult {
  marketing_to_sales_signals: { signal: string; impact: string; action: string }[];
  revenue_attribution: { campaign: string; estimated_revenue_contribution_pct: number }[];
  funnel_bottlenecks: { stage: string; issue: string; fix: string }[];
  best_lead_sources: { source: string; conversion_rate_estimate: number; revenue_per_lead: number }[];
  recommended_budget_shift: string;
  overall_intelligence_score: number;
}

interface FallbackSettings {
  openai_enabled: boolean;
  fallback_mode_active: boolean;
  total_patterns_learned: number;
  total_fallback_responses: number;
  learning_started_at: string | null;
  last_openai_response_at: string | null;
  last_fallback_response_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LOOP_STAGES = [
  { key: 'observe', label: 'Observe', icon: Eye, color: '#60a5fa' },
  { key: 'analyze', label: 'Analyze', icon: BarChart2, color: '#a78bfa' },
  { key: 'decide', label: 'Decide', icon: Brain, color: '#f59e0b' },
  { key: 'act', label: 'Act', icon: Zap, color: '#34d399' },
  { key: 'learn', label: 'Learn', icon: BookOpen, color: '#fb923c' },
  { key: 'improve', label: 'Improve', icon: TrendingUp, color: '#f472b6' },
];

const GOAL_TYPES = [
  { value: 'leads', label: 'Lead Generation', unit: 'leads' },
  { value: 'roi', label: 'Return on Investment', unit: '%' },
  { value: 'cost_per_lead', label: 'Cost Per Lead', unit: '₹' },
  { value: 'revenue', label: 'Revenue Target', unit: '₹' },
  { value: 'conversions', label: 'Conversions', unit: 'conversions' },
];

const ACTION_ICONS: Record<string, React.ElementType> = {
  campaign_created: Plus,
  campaign_paused: Pause,
  campaign_resumed: Play,
  campaign_optimized: Sparkles,
  budget_adjusted: DollarSign,
  strategy_updated: GitBranch,
  creative_flagged: AlertTriangle,
  goal_updated: Target,
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';
  const bg = score >= 80 ? 'rgba(52,211,153,0.12)' : score >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color }}>
      <Gauge size={10} />
      {score}% confidence
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShaarvikAIPage() {
  const { session, user } = useAuth();
  const { companyId } = useCompanyId();

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [activeTab, setActiveTab] = useState<'control' | 'loop' | 'goals' | 'simulate' | 'actions' | 'intelligence'>('control');

  // Data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [goals, setGoals] = useState<AIGoal[]>([]);
  const [actions, setActions] = useState<AutonomousAction[]>([]);
  const [controlSettings, setControlSettings] = useState<ControlSettings>({
    autonomous_mode: false,
    auto_pause_underperforming: true,
    auto_scale_top_campaigns: true,
    auto_create_campaigns: false,
    min_confidence_to_act: 75,
    learning_enabled: true,
    cross_module_intelligence: true,
    notification_on_action: true,
    approval_threshold: 75,
    daily_spend_limit: 500,
    require_approval_above_spend: true,
    manual_override_active: false,
    approval_required_for_launch: true,
    approval_required_for_budget_change: true,
    max_budget_change_pct: 20,
  });
  const [loadingData, setLoadingData] = useState(true);

  // AI Loop state
  const [loopRunning, setLoopRunning] = useState(false);
  const [currentLoopStage, setCurrentLoopStage] = useState<string | null>(null);
  const [loopResults, setLoopResults] = useState<{
    observe?: ObserveResult;
    strategy?: StrategyResult;
    cross?: CrossModuleResult;
  }>({});
  const [loopError, setLoopError] = useState('');

  // Simulation state
  const [simScenario, setSimScenario] = useState('budget_increase');
  const [simBudgetChange, setSimBudgetChange] = useState(20);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ goal_type: 'leads', target_value: '', timeframe_days: '30' });
  const [savingGoal, setSavingGoal] = useState(false);

  // Saving settings
  const [savingSettings, setSavingSettings] = useState(false);

  // Fallback / OpenAI toggle state
  const [fallbackSettings, setFallbackSettings] = useState<FallbackSettings>({
    openai_enabled: true,
    fallback_mode_active: false,
    total_patterns_learned: 0,
    total_fallback_responses: 0,
    learning_started_at: null,
    last_openai_response_at: null,
    last_fallback_response_at: null,
  });
  const [togglingOpenAI, setTogglingOpenAI] = useState(false);

  // ─── Check API Key ──────────────────────────────────────────────────────────
  useEffect(() => {
    const checkKey = async () => {
      try {
        const res = await fetch('/api/ai-settings');
        const data = await res.json();
        setHasApiKey(data.hasKey);
      } catch {
        setHasApiKey(false);
      } finally {
        setLoadingKey(false);
      }
    };
    checkKey();
  }, []);

  // ─── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!companyId) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      // 1. Load campaigns & leads from MySQL API
      const response = await fetch(`/api/mysql/marketing/stats?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch marketing stats');
      const statsData = await response.json();

      const enrichedCampaigns: Campaign[] = (statsData.campaigns || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status || 'draft',
        budget: Number(c.budget || 0),
        channel: c.platform || 'Unknown',
        leads_count: Number(c.leadsCount || 0),
        revenue: Number(c.revenue || 0),
      }));
      setCampaigns(enrichedCampaigns);

      // 2. Graceful Fallback for missing AI tables in MySQL
      // Since these are not yet migrated to MySQL, we'll keep them as empty for now
      // rather than letting Supabase calls hang or fail.
      setGoals([]);
      setActions([]);
      
      // Default settings
      setControlSettings({
        autonomous_mode: false,
        auto_pause_underperforming: true,
        auto_scale_top_campaigns: true,
        auto_create_campaigns: false,
        min_confidence_to_act: 75,
        learning_enabled: true,
        cross_module_intelligence: true,
        notification_on_action: true,
        approval_threshold: 75,
        daily_spend_limit: 500,
        require_approval_above_spend: true,
        manual_override_active: false,
        approval_required_for_launch: true,
        approval_required_for_budget_change: true,
        max_budget_change_pct: 20,
      });

    } catch (err) {
      console.error('AI Lab data load error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Subscriptions disabled for now (MySQL migration pending)

  // ─── Toggle OpenAI On/Off ───────────────────────────────────────────────────
  const toggleOpenAI = async () => {
    if (!user || togglingOpenAI) return;
    setTogglingOpenAI(true);
    const newEnabled = !fallbackSettings.openai_enabled;
    try {
      await supabase.from('ai_fallback_settings').upsert({
        user_id: user.id,
        company_id: companyId,
        openai_enabled: newEnabled,
        fallback_mode_active: !newEnabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setFallbackSettings(prev => ({ ...prev, openai_enabled: newEnabled, fallback_mode_active: !newEnabled }));
    } catch {
      // ignore
    } finally {
      setTogglingOpenAI(false);
    }
  };

  // ─── Save Control Settings ──────────────────────────────────────────────────
  const saveControlSettings = async (updated: ControlSettings) => {
    if (!user) return;
    setSavingSettings(true);
    try {
      await supabase.from('ai_control_settings').upsert({
        user_id: user.id,
        company_id: companyId,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setControlSettings(updated);
    } catch {
      // ignore
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSetting = (key: keyof ControlSettings) => {
    const updated = { ...controlSettings, [key]: !controlSettings[key as keyof ControlSettings] };
    setControlSettings(updated);
    saveControlSettings(updated);
  };

  // ─── Run Full AI Loop ───────────────────────────────────────────────────────
  const runAILoop = async () => {
    if (!hasApiKey || loopRunning) return;
    setLoopRunning(true);
    setLoopError('');
    setLoopResults({});

    const context = {
      campaigns: campaigns.map(c => ({
        id: c.id, name: c.name, status: c.status,
        budget: c.budget, leads: c.leads_count, revenue: c.revenue, channel: c.channel,
      })),
      goals: goals.map(g => ({ type: g.goal_type, target: g.target_value, current: g.current_value, status: g.status })),
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter(c => c.status === 'active').length,
      total_leads: campaigns.reduce((s, c) => s + c.leads_count, 0),
      total_revenue: campaigns.reduce((s, c) => s + c.revenue, 0),
    };

    try {
      // Stage 1: Observe + Analyze
      setCurrentLoopStage('observe');
      await new Promise(r => setTimeout(r, 400));
      setCurrentLoopStage('analyze');

      const observeRes = await fetch('/api/marketing/shaarvik-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'observe_analyze', context }),
      });
      const observeData = await observeRes.json();
      if (observeData.error) throw new Error(observeData.error);
      setLoopResults(prev => ({ ...prev, observe: observeData.result }));

      // Stage 2: Decide
      setCurrentLoopStage('decide');
      const strategyRes = await fetch('/api/marketing/shaarvik-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide_strategy', context: { ...context, observations: observeData.result } }),
      });
      const strategyData = await strategyRes.json();
      if (strategyData.error) throw new Error(strategyData.error);
      setLoopResults(prev => ({ ...prev, strategy: strategyData.result }));

      // Stage 3: Act (log autonomous actions)
      setCurrentLoopStage('act');
      if (user) {
        const actionsToLog: any[] = [];
        const strategy = strategyData.result as StrategyResult;

        strategy.campaigns_to_pause?.forEach((c: any) => {
          actionsToLog.push({
            user_id: user.id,
            company_id: companyId,
            action_type: 'campaign_paused',
            target_id: c.id || null,
            target_type: 'campaign',
            reasoning: c.reason,
            confidence_score: strategy.confidence_score || 75,
            status: controlSettings.autonomous_mode ? 'executed' : 'pending',
            ai_model: 'gpt-5',
          });
        });

        strategy.campaigns_to_scale?.forEach((c: any) => {
          actionsToLog.push({
            user_id: user.id,
            company_id: companyId,
            action_type: 'campaign_optimized',
            target_id: c.id || null,
            target_type: 'campaign',
            reasoning: `Scale by ${c.budget_increase_pct}%: ${c.reason}`,
            confidence_score: strategy.confidence_score || 75,
            status: controlSettings.autonomous_mode ? 'executed' : 'pending',
            ai_model: 'gpt-5',
          });
        });

        if (actionsToLog.length > 0) {
          await supabase.from('ai_autonomous_actions').insert(actionsToLog);
        }
      }

      // Stage 4: Cross-Module Intelligence
      setCurrentLoopStage('learn');
      const { data: clientsData } = await supabase.from('clients').select('id, status').eq('user_id', user!.id).limit(20);
      const crossRes = await fetch('/api/marketing/shaarvik-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cross_module_intelligence',
          context: {
            ...context,
            clients_count: (clientsData || []).length,
            converted_clients: (clientsData || []).filter((c: any) => c.status === 'active').length,
          },
        }),
      });
      const crossData = await crossRes.json();
      if (!crossData.error) {
        setLoopResults(prev => ({ ...prev, cross: crossData.result }));
      }

      // Stage 5: Learn + Improve
      setCurrentLoopStage('improve');
      await new Promise(r => setTimeout(r, 300));

      // Reload actions
      await loadData();
    } catch (err: any) {
      setLoopError(err.message || 'AI loop failed');
    } finally {
      setLoopRunning(false);
      setCurrentLoopStage(null);
    }
  };

  // ─── Run Simulation ─────────────────────────────────────────────────────────
  const runSimulation = async () => {
    if (!hasApiKey || simRunning) return;
    setSimRunning(true);
    setSimResult(null);

    try {
      const context = {
        scenario_type: simScenario,
        budget_change_pct: simBudgetChange,
        current_campaigns: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'active').length,
        current_leads: campaigns.reduce((s, c) => s + c.leads_count, 0),
        current_revenue: campaigns.reduce((s, c) => s + c.revenue, 0),
        total_budget: campaigns.reduce((s, c) => s + (c.budget || 0), 0),
        goals: goals.map(g => ({ type: g.goal_type, target: g.target_value })),
      };

      const res = await fetch('/api/marketing/shaarvik-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate_scenario', context }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSimResult(data.result);

      // Save simulation to DB
      if (user) {
        await supabase.from('ai_simulations').insert({
          user_id: user.id,
          company_id: companyId,
          scenario_name: data.result.scenario_name,
          scenario_type: simScenario,
          input_params: context,
          predicted_leads: data.result.predicted_leads,
          predicted_revenue: data.result.predicted_revenue,
          predicted_roi: data.result.predicted_roi,
          confidence_score: data.result.confidence_score,
          reasoning: data.result.recommended_action,
          recommended_action: data.result.recommended_action,
        });
      }
    } catch (err: any) {
      setLoopError(err.message || 'Simulation failed');
    } finally {
      setSimRunning(false);
    }
  };

  // ─── Save Goal ──────────────────────────────────────────────────────────────
  const saveGoal = async () => {
    if (!user || !newGoal.target_value) return;
    setSavingGoal(true);
    try {
      await supabase.from('ai_goals').insert({
        user_id: user.id,
        company_id: companyId,
        goal_type: newGoal.goal_type,
        target_value: parseFloat(newGoal.target_value),
        timeframe_days: parseInt(newGoal.timeframe_days),
        status: 'active',
      });
      setShowGoalForm(false);
      setNewGoal({ goal_type: 'leads', target_value: '', timeframe_days: '30' });
      await loadData();
    } catch {
      // ignore
    } finally {
      setSavingGoal(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loadingKey) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: '#a78bfa' }} />
      </div>
    );
  }

  const totalLeads = campaigns.reduce((s, c) => s + c.leads_count, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pendingActions = actions.filter(a => a.status === 'pending').length;
  const executedActions = actions.filter(a => a.status === 'executed').length;

  const TABS = [
    { key: 'control', label: 'AI Control', icon: Shield },
    { key: 'loop', label: 'AI Loop', icon: Activity },
    { key: 'goals', label: 'Goals', icon: Target },
    { key: 'simulate', label: 'Simulate', icon: FlaskConical },
    { key: 'actions', label: 'Actions Log', icon: Database },
    { key: 'intelligence', label: 'Intelligence', icon: Network },
  ] as const;

  return (
    <div className="px-6 py-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)', border: '1px solid rgba(139,92,246,0.4)' }}
          >
            <Brain size={20} style={{ color: '#c4b5fd' }} />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2" style={{ borderColor: '#0f1f3d' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Shaarvik AI</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}>
                Level 6
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Autonomous Marketing Intelligence · Observe → Analyze → Decide → Act → Learn → Improve
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ─── OpenAI Toggle Button ─────────────────────────────────────── */}
          <button
            onClick={toggleOpenAI}
            disabled={togglingOpenAI}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={fallbackSettings.openai_enabled
              ? { background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }
              : { background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.35)', color: '#fb923c' }
            }
            title={fallbackSettings.openai_enabled ? 'OpenAI is active — click to switch to Fallback Mode' : 'Fallback Mode active — click to re-enable OpenAI'}
          >
            {togglingOpenAI
              ? <Loader2 size={12} className="animate-spin" />
              : fallbackSettings.openai_enabled
                ? <Wifi size={12} />
                : <WifiOff size={12} />
            }
            {fallbackSettings.openai_enabled ? 'OpenAI: ON' : 'OpenAI: OFF'}
            {fallbackSettings.openai_enabled
              ? <ToggleRight size={16} />
              : <ToggleLeft size={16} />
            }
          </button>

          {controlSettings.autonomous_mode && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              <Cpu size={12} className="animate-pulse" />
              Autonomous Active
            </span>
          )}
          {!hasApiKey && (
            <Link href="/settings/ai" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
              <AlertTriangle size={12} />
              Configure API Key
            </Link>
          )}
        </div>
      </div>

      {/* ─── Fallback Mode Banner ────────────────────────────────────────────── */}
      {!fallbackSettings.openai_enabled && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)' }}>
          <WifiOff size={16} style={{ color: '#fb923c' }} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#fb923c' }}>Fallback Mode Active — OpenAI Disabled</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(251,146,60,0.7)' }}>
              Shaarvik AI is running on its own learned intelligence.
              {fallbackSettings.total_patterns_learned > 0
                ? ` ${fallbackSettings.total_patterns_learned} patterns learned from ${fallbackSettings.total_fallback_responses} previous OpenAI sessions.`
                : ' No patterns learned yet — enable OpenAI to start training the fallback engine.'
              }
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: '#fb923c' }}>{fallbackSettings.total_patterns_learned}</p>
              <p className="text-xs" style={{ color: 'rgba(251,146,60,0.5)' }}>patterns</p>
            </div>
            <button
              onClick={toggleOpenAI}
              disabled={togglingOpenAI}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)' }}
            >
              {togglingOpenAI ? <Loader2 size={12} className="animate-spin" /> : 'Enable OpenAI'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Fallback Learning Status (when OpenAI is ON) ───────────────────── */}
      {fallbackSettings.openai_enabled && fallbackSettings.total_patterns_learned > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <BookMarked size={14} style={{ color: '#a78bfa' }} />
          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>
            <span className="font-semibold" style={{ color: '#a78bfa' }}>Fallback Engine Learning:</span>{' '}
            {fallbackSettings.total_patterns_learned} patterns stored · Every OpenAI response trains the fallback engine for future offline use
          </p>
        </div>
      )}

      {/* ─── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Campaigns', value: activeCampaigns, icon: Flame, color: '#f59e0b', sub: `of ${campaigns.length} total` },
          { label: 'Total Leads', value: totalLeads, icon: Users, color: '#60a5fa', sub: 'across all campaigns' },
          { label: 'Pending Actions', value: pendingActions, icon: Clock, color: '#fbbf24', sub: 'awaiting execution' },
          { label: 'Executed Actions', value: executedActions, icon: CheckCircle2, color: '#34d399', sub: 'by Shaarvik AI' },
        ].map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <KpiIcon size={14} style={{ color: kpi.color }} />
                <span className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.3)' }}>{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: isActive ? '#c4b5fd' : 'rgba(148,163,184,0.6)',
              }}
            >
              <TabIcon size={13} />
              {tab.label}
              {tab.key === 'actions' && pendingActions > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(251,146,60,0.2)', color: '#fbbf24' }}>
                  {pendingActions}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Tab: AI Control Layer ───────────────────────────────────────────── */}
      {activeTab === 'control' && (
        <div className="space-y-4">
          {/* Manual Override Banner */}
          {controlSettings.manual_override_active && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <AlertTriangle size={16} style={{ color: '#f87171' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Manual Override Active</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(248,113,113,0.7)' }}>All autonomous AI actions are paused. Shaarvik AI will not modify or launch any campaigns until override is disabled.</p>
              </div>
              <button
                onClick={() => toggleSetting('manual_override_active')}
                className="flex-shrink-0 transition-all"
              >
                {controlSettings.manual_override_active
                  ? <ToggleRight size={28} style={{ color: '#f87171' }} />
                  : <ToggleLeft size={28} style={{ color: 'rgba(148,163,184,0.3)' }} />
                }
              </button>
            </div>
          )}

          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} style={{ color: '#a78bfa' }} />
              <h3 className="text-sm font-semibold text-white">Central AI Control Layer</h3>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                Override Engine
              </span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'autonomous_mode', label: 'Autonomous Mode', desc: 'AI executes decisions automatically without approval', color: '#34d399', danger: true },
                { key: 'auto_pause_underperforming', label: 'Auto-Pause Underperforming', desc: 'Automatically pause campaigns with 0 leads after 7 days', color: '#60a5fa' },
                { key: 'auto_scale_top_campaigns', label: 'Auto-Scale Top Campaigns', desc: 'Increase budget for campaigns exceeding lead targets', color: '#60a5fa' },
                { key: 'auto_create_campaigns', label: 'Auto-Create Campaigns', desc: 'AI creates new campaigns based on goal gaps', color: '#f59e0b' },
                { key: 'learning_enabled', label: 'Self-Learning Loop', desc: 'AI continuously learns from campaign outcomes', color: '#a78bfa' },
                { key: 'cross_module_intelligence', label: 'Cross-Module Intelligence', desc: 'Connect marketing data with sales and revenue signals', color: '#fb923c' },
                { key: 'notification_on_action', label: 'Notify on Action', desc: 'Log every autonomous action to the actions feed', color: '#60a5fa' },
              ].map((setting) => {
                const isOn = controlSettings[setting.key as keyof ControlSettings] as boolean;
                return (
                  <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{setting.label}</p>
                        {setting.danger && isOn && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>LIVE</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{setting.desc}</p>
                    </div>
                    <button
                      onClick={() => toggleSetting(setting.key as keyof ControlSettings)}
                      disabled={savingSettings}
                      className="flex-shrink-0 transition-all"
                    >
                      {isOn
                        ? <ToggleRight size={28} style={{ color: setting.color }} />
                        : <ToggleLeft size={28} style={{ color: 'rgba(148,163,184,0.3)' }} />
                      }
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Confidence Threshold */}
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">Minimum Confidence to Act</p>
                <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>{controlSettings.min_confidence_to_act}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={controlSettings.min_confidence_to_act}
                onChange={(e) => {
                  const updated = { ...controlSettings, min_confidence_to_act: parseInt(e.target.value) };
                  setControlSettings(updated);
                  saveControlSettings(updated);
                }}
                className="w-full accent-orange-400"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
                <span>50% (Aggressive)</span>
                <span>95% (Conservative)</span>
              </div>
            </div>

            {/* Approval & Safety Controls */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} style={{ color: '#f87171' }} />
                <h3 className="text-sm font-semibold text-white">Approval & Safety Controls</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.1)', color: '#f87171', border: '1px solid rgba(251,146,60,0.2)' }}>
                  Human-in-the-Loop
                </span>
              </div>

              {/* Manual Override Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg mb-3" style={{ background: controlSettings.manual_override_active ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', border: controlSettings.manual_override_active ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">Manual Override</p>
                    {controlSettings.manual_override_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Immediately pause all autonomous AI actions — no campaigns will be modified or launched</p>
                </div>
                <button
                  onClick={() => toggleSetting('manual_override_active')}
                  disabled={savingSettings}
                  className="flex-shrink-0 transition-all"
                >
                  {controlSettings.manual_override_active
                    ? <ToggleRight size={28} style={{ color: '#f87171' }} />
                    : <ToggleLeft size={28} style={{ color: 'rgba(148,163,184,0.3)' }} />
                  }
                </button>
              </div>

              {/* Approval toggles */}
              <div className="space-y-3 mb-4">
                {[
                  { key: 'approval_required_for_launch', label: 'Require Approval Before Launch', desc: 'AI must wait for human approval before launching any new campaign', color: '#fbbf24' },
                  { key: 'approval_required_for_budget_change', label: 'Require Approval for Budget Changes', desc: 'AI must wait for human approval before adjusting campaign budgets', color: '#fbbf24' },
                  { key: 'require_approval_above_spend', label: 'Require Approval Above Spend Limit', desc: 'Block autonomous actions when proposed spend exceeds daily limit', color: '#fb923c' },
                ].map((setting) => {
                  const isOn = controlSettings[setting.key as keyof ControlSettings] as boolean;
                  return (
                    <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium text-white">{setting.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{setting.desc}</p>
                      </div>
                      <button
                        onClick={() => toggleSetting(setting.key as keyof ControlSettings)}
                        disabled={savingSettings}
                        className="flex-shrink-0 transition-all"
                      >
                        {isOn
                          ? <ToggleRight size={28} style={{ color: setting.color }} />
                          : <ToggleLeft size={28} style={{ color: 'rgba(148,163,184,0.3)' }} />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Approval Confidence Threshold */}
              <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Approval Threshold</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>AI actions below this confidence score require human approval before executing</p>
                  </div>
                  <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{controlSettings.approval_threshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={controlSettings.approval_threshold}
                  onChange={(e) => {
                    const updated = { ...controlSettings, approval_threshold: parseInt(e.target.value) };
                    setControlSettings(updated);
                    saveControlSettings(updated);
                  }}
                  className="w-full accent-yellow-400"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  <span>50% — approve most actions</span>
                  <span>100% — approve all actions</span>
                </div>
              </div>

              {/* Daily Spend Limit */}
              <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">Daily Spend Limit</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Maximum budget Shaarvik AI can autonomously allocate per day without approval</p>
                  </div>
                  <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>₹{controlSettings.daily_spend_limit.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={controlSettings.daily_spend_limit}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      const updated = { ...controlSettings, daily_spend_limit: val };
                      setControlSettings(updated);
                    }}
                    onBlur={() => saveControlSettings(controlSettings)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="500"
                  />
                  <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>per day</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 250, 500, 1000, 2500].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        const updated = { ...controlSettings, daily_spend_limit: preset };
                        setControlSettings(updated);
                        saveControlSettings(updated);
                      }}
                      className="px-2 py-1 rounded text-xs transition-all"
                      style={{
                        background: controlSettings.daily_spend_limit === preset ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)',
                        border: controlSettings.daily_spend_limit === preset ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: controlSettings.daily_spend_limit === preset ? '#34d399' : 'rgba(148,163,184,0.5)',
                      }}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Budget Change % */}
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Max Autonomous Budget Change</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Maximum % Shaarvik AI can increase or decrease a campaign budget without approval</p>
                  </div>
                  <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>{controlSettings.max_budget_change_pct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={controlSettings.max_budget_change_pct}
                  onChange={(e) => {
                    const updated = { ...controlSettings, max_budget_change_pct: parseInt(e.target.value) };
                    setControlSettings(updated);
                    saveControlSettings(updated);
                  }}
                  className="w-full accent-orange-400"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  <span>5% (Tight control)</span>
                  <span>100% (Full autonomy)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: AI Loop ────────────────────────────────────────────────────── */}
      {activeTab === 'loop' && (
        <div className="space-y-4">
          {/* Loop Visualizer */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity size={16} style={{ color: '#60a5fa' }} />
                <h3 className="text-sm font-semibold text-white">Autonomous Intelligence Loop</h3>
              </div>
              <button
                onClick={runAILoop}
                disabled={loopRunning || !hasApiKey || loadingData}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: loopRunning ? 'rgba(251,146,60,0.2)' : 'rgba(251,146,60,0.8)',
                  color: '#fff',
                  cursor: loopRunning || !hasApiKey ? 'not-allowed' : 'pointer',
                  opacity: !hasApiKey ? 0.5 : 1,
                }}
              >
                {loopRunning ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                {loopRunning ? 'Running Loop...' : 'Run Full Loop'}
              </button>
            </div>

            {/* Loop Stages */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {LOOP_STAGES.map((stage, idx) => {
                const StageIcon = stage.icon;
                const isActive = currentLoopStage === stage.key;
                const isDone = loopRunning
                  ? LOOP_STAGES.findIndex(s => s.key === currentLoopStage) > idx
                  : false;
                const hasResult = !loopRunning && (
                  (stage.key === 'observe' || stage.key === 'analyze') && loopResults.observe ||
                  (stage.key === 'decide') && loopResults.strategy ||
                  (stage.key === 'act' || stage.key === 'learn' || stage.key === 'improve') && loopResults.strategy
                );

                return (
                  <React.Fragment key={stage.key}>
                    <div
                      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: isActive ? `${stage.color}20` : hasResult ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
                        border: isActive ? `1px solid ${stage.color}60` : hasResult ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.08)',
                        minWidth: '80px',
                      }}
                    >
                      <div className="relative">
                        <StageIcon size={18} style={{ color: isActive ? stage.color : hasResult ? '#34d399' : 'rgba(148,163,184,0.4)' }} className={isActive ? 'animate-pulse' : ''} />
                        {isActive && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />}
                        {hasResult && !isActive && <CheckCircle2 size={10} className="absolute -top-1 -right-1" style={{ color: '#34d399' }} />}
                      </div>
                      <span className="text-xs font-medium" style={{ color: isActive ? stage.color : hasResult ? '#34d399' : 'rgba(148,163,184,0.5)' }}>
                        {stage.label}
                      </span>
                    </div>
                    {idx < LOOP_STAGES.length - 1 && (
                      <ChevronRight size={14} style={{ color: 'rgba(148,163,184,0.2)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {loopError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                <AlertTriangle size={13} />
                {loopError}
              </div>
            )}

            {/* Observe/Analyze Results */}
            {loopResults.observe && (
              <div className="space-y-4">
                {/* Health Score */}
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={loopResults.observe.health_score >= 70 ? '#34d399' : loopResults.observe.health_score >= 40 ? '#fbbf24' : '#f87171'}
                        strokeWidth="3"
                        strokeDasharray={`${loopResults.observe.health_score} ${100 - loopResults.observe.health_score}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                      {loopResults.observe.health_score}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Marketing Health Score</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      {loopResults.observe.health_score >= 70 ? 'Strong performance' : loopResults.observe.health_score >= 40 ? 'Needs attention' : 'Critical issues detected'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Observations */}
                  {loopResults.observe.key_observations?.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#60a5fa' }}>📊 Key Observations</p>
                      <ul className="space-y-1.5">
                        {loopResults.observe.key_observations.slice(0, 4).map((obs, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#cbd5e1' }}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Critical Issues */}
                  {loopResults.observe.critical_issues?.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#f87171' }}>⚠️ Critical Issues</p>
                      <ul className="space-y-1.5">
                        {loopResults.observe.critical_issues.slice(0, 4).map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#cbd5e1' }}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f87171' }} />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {loopResults.observe.opportunities?.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#34d399' }}>🚀 Opportunities</p>
                      <ul className="space-y-1.5">
                        {loopResults.observe.opportunities.slice(0, 4).map((opp, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#cbd5e1' }}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#34d399' }} />
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next Actions */}
                  {loopResults.observe.next_actions?.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#fbbf24' }}>⚡ Recommended Actions</p>
                      <ul className="space-y-2">
                        {loopResults.observe.next_actions.slice(0, 3).map((act, i) => (
                          <li key={i} className="text-xs" style={{ color: '#cbd5e1' }}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{
                                background: act.priority === 'high' ? 'rgba(248,113,113,0.15)' : act.priority === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)',
                                color: act.priority === 'high' ? '#f87171' : act.priority === 'medium' ? '#fbbf24' : '#60a5fa',
                              }}>
                                {act.priority}
                              </span>
                              <ConfidenceBadge score={act.confidence} />
                            </div>
                            {act.action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Strategy Results */}
            {loopResults.strategy && (
              <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">🧠 AI Strategy: {loopResults.strategy.strategy_name}</p>
                  <ConfidenceBadge score={loopResults.strategy.confidence_score} />
                </div>
                <p className="text-xs mb-3" style={{ color: '#cbd5e1' }}>
                  <span style={{ color: '#a78bfa' }}>Primary Focus:</span> {loopResults.strategy.primary_focus}
                </p>
                <p className="text-xs mb-3" style={{ color: '#cbd5e1' }}>
                  <span style={{ color: '#a78bfa' }}>Goal Achievement:</span>{' '}
                  <span className="font-semibold" style={{ color: loopResults.strategy.estimated_goal_achievement_pct >= 70 ? '#34d399' : '#fbbf24' }}>
                    {loopResults.strategy.estimated_goal_achievement_pct}% estimated
                  </span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {loopResults.strategy.campaigns_to_pause?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#f87171' }}>Pause ({loopResults.strategy.campaigns_to_pause.length})</p>
                      {loopResults.strategy.campaigns_to_pause.map((c, i) => (
                        <p key={i} className="text-xs mb-1" style={{ color: '#cbd5e1' }}>• {c.name}</p>
                      ))}
                    </div>
                  )}
                  {loopResults.strategy.campaigns_to_scale?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#34d399' }}>Scale ({loopResults.strategy.campaigns_to_scale.length})</p>
                      {loopResults.strategy.campaigns_to_scale.map((c, i) => (
                        <p key={i} className="text-xs mb-1" style={{ color: '#cbd5e1' }}>• {c.name} +{c.budget_increase_pct}%</p>
                      ))}
                    </div>
                  )}
                  {loopResults.strategy.new_campaign_ideas?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#60a5fa' }}>New Ideas ({loopResults.strategy.new_campaign_ideas.length})</p>
                      {loopResults.strategy.new_campaign_ideas.map((c, i) => (
                        <p key={i} className="text-xs mb-1" style={{ color: '#cbd5e1' }}>• {c.name} ({c.channel})</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Goals ──────────────────────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Target size={16} style={{ color: '#34d399' }} />
                <h3 className="text-sm font-semibold text-white">Goal-Based AI Strategy</h3>
              </div>
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <Plus size={12} />
                Set Goal
              </button>
            </div>

            {showGoalForm && (
              <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#34d399' }}>New AI Goal</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(148,163,184,0.7)' }}>Goal Type</label>
                    <select
                      value={newGoal.goal_type}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, goal_type: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                    >
                      {GOAL_TYPES.map(g => <option key={g.value} value={g.value} style={{ background: '#1a2744' }}>{g.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      Target ({GOAL_TYPES.find(g => g.value === newGoal.goal_type)?.unit})
                    </label>
                    <input
                      type="number"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: e.target.value }))}
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(148,163,184,0.7)' }}>Timeframe (days)</label>
                    <input
                      type="number"
                      value={newGoal.timeframe_days}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, timeframe_days: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveGoal}
                    disabled={savingGoal || !newGoal.target_value}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(52,211,153,0.8)', color: '#fff', cursor: savingGoal ? 'not-allowed' : 'pointer' }}
                  >
                    {savingGoal ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Save Goal
                  </button>
                  <button onClick={() => setShowGoalForm(false)} className="px-3 py-2 rounded-lg text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingData ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="animate-spin" size={18} style={{ color: '#34d399' }} />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-10">
                <Target size={32} className="mx-auto mb-3" style={{ color: 'rgba(148,163,184,0.2)' }} />
                <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>No goals set yet.</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.3)' }}>Set a goal and Shaarvik AI will build a strategy to achieve it.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => {
                  const goalMeta = GOAL_TYPES.find(g => g.value === goal.goal_type);
                  const progress = Math.min(100, goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0);
                  return (
                    <div key={goal.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Crosshair size={14} style={{ color: '#34d399' }} />
                          <p className="text-sm font-semibold text-white">{goalMeta?.label}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: goal.status === 'achieved' ? 'rgba(52,211,153,0.15)' : goal.status === 'active' ? 'rgba(96,165,250,0.15)' : 'rgba(148,163,184,0.1)',
                          color: goal.status === 'achieved' ? '#34d399' : goal.status === 'active' ? '#60a5fa' : 'rgba(148,163,184,0.6)',
                        }}>
                          {goal.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                          {goal.current_value} / {goal.target_value} {goalMeta?.unit}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>·</span>
                        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{goal.timeframe_days} day window</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%`, background: progress >= 100 ? '#34d399' : progress >= 50 ? '#60a5fa' : '#fbbf24' }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{Math.round(progress)}% complete</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Simulate ───────────────────────────────────────────────────────── */}
      {activeTab === 'simulate' && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical size={16} style={{ color: '#fb923c' }} />
              <h3 className="text-sm font-semibold text-white">Predictive Simulation Engine</h3>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)' }}>
                Confidence Scored
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Scenario Type</label>
                <select
                  value={simScenario}
                  onChange={(e) => setSimScenario(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                >
                  <option value="budget_increase" style={{ background: '#1a2744' }}>Budget Increase</option>
                  <option value="budget_decrease" style={{ background: '#1a2744' }}>Budget Decrease</option>
                  <option value="new_campaign" style={{ background: '#1a2744' }}>Launch New Campaign</option>
                  <option value="pause_campaign" style={{ background: '#1a2744' }}>Pause Worst Campaign</option>
                  <option value="audience_shift" style={{ background: '#1a2744' }}>Audience Shift</option>
                  <option value="channel_switch" style={{ background: '#1a2744' }}>Channel Switch</option>
                </select>
              </div>
              {(simScenario === 'budget_increase' || simScenario === 'budget_decrease') && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    Budget Change: {simScenario === 'budget_decrease' ? '-' : '+'}{simBudgetChange}%
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={simBudgetChange}
                    onChange={(e) => setSimBudgetChange(parseInt(e.target.value))}
                    className="w-full mt-2 accent-orange-400"
                  />
                </div>
              )}
            </div>

            <button
              onClick={runSimulation}
              disabled={simRunning || !hasApiKey}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all mb-4"
              style={{
                background: simRunning ? 'rgba(251,146,60,0.2)' : 'rgba(251,146,60,0.8)',
                color: '#fff',
                cursor: simRunning || !hasApiKey ? 'not-allowed' : 'pointer',
                opacity: !hasApiKey ? 0.5 : 1,
              }}
            >
              {simRunning ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              {simRunning ? 'Simulating...' : 'Run Simulation'}
            </button>

            {simResult && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white">{simResult.scenario_name}</p>
                    <ConfidenceBadge score={simResult.confidence_score} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Predicted Leads', value: simResult.predicted_leads, icon: Users, color: '#60a5fa' },
                      { label: 'Predicted Revenue', value: `₹${simResult.predicted_revenue?.toLocaleString()}`, icon: DollarSign, color: '#34d399' },
                      { label: 'Predicted ROI', value: `${simResult.predicted_roi}%`, icon: TrendingUp, color: '#a78bfa' },
                    ].map((metric) => {
                      const MetricIcon = metric.icon;
                      return (
                        <div key={metric.label} className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <MetricIcon size={16} className="mx-auto mb-1" style={{ color: metric.color }} />
                          <p className="text-lg font-bold text-white">{metric.value}</p>
                          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>{metric.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#34d399' }}>Recommended Action</p>
                    <p className="text-xs" style={{ color: '#cbd5e1' }}>{simResult.recommended_action}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {simResult.key_assumptions?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#60a5fa' }}>Key Assumptions</p>
                        {simResult.key_assumptions.slice(0, 3).map((a, i) => (
                          <p key={i} className="text-xs mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>• {a}</p>
                        ))}
                      </div>
                    )}
                    {simResult.risk_factors?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#f87171' }}>Risk Factors</p>
                        {simResult.risk_factors.slice(0, 3).map((r, i) => (
                          <p key={i} className="text-xs mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>• {r}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {simResult.alternative_scenarios?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: '#a78bfa' }}>Alternative Scenarios</p>
                      <div className="space-y-1.5">
                        {simResult.alternative_scenarios.map((alt, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs" style={{ color: '#cbd5e1' }}>{alt.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs" style={{ color: '#60a5fa' }}>{alt.predicted_leads} leads</span>
                              <ConfidenceBadge score={alt.confidence} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Actions Log ────────────────────────────────────────────────── */}
      {activeTab === 'actions' && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={16} style={{ color: '#60a5fa' }} />
              <h3 className="text-sm font-semibold text-white">Autonomous Actions Log</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                {pendingActions} pending
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                {executedActions} executed
              </span>
            </div>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="animate-spin" size={18} style={{ color: '#60a5fa' }} />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-10">
              <Activity size={32} className="mx-auto mb-3" style={{ color: 'rgba(148,163,184,0.2)' }} />
              <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>No autonomous actions yet.</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.3)' }}>Run the AI Loop to generate actions.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {actions.map((action) => {
                const ActionIcon = ACTION_ICONS[action.action_type] || Zap;
                const statusColor = action.status === 'executed' ? '#34d399' : action.status === 'pending' ? '#fbbf24' : action.status === 'failed' ? '#f87171' : 'rgba(148,163,184,0.5)';
                return (
                  <div key={action.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <ActionIcon size={14} style={{ color: '#a78bfa' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-xs font-semibold text-white capitalize">{action.action_type.replace(/_/g, ' ')}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${statusColor}20`, color: statusColor }}>
                          {action.status}
                        </span>
                        <ConfidenceBadge score={action.confidence_score} />
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{action.reasoning}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.35)' }}>
                        <Clock size={10} className="inline mr-1" />
                        {formatTime(action.created_at)}
                        {action.target_type && <span className="ml-2">· {action.target_type}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Cross-Module Intelligence ─────────────────────────────────── */}
      {activeTab === 'intelligence' && (
        <div className="space-y-4">
          {loopResults.cross ? (
            <>
              {/* Intelligence Score */}
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fb923c" strokeWidth="3"
                      strokeDasharray={`${loopResults.cross.overall_intelligence_score} ${100 - loopResults.cross.overall_intelligence_score}`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {loopResults.cross.overall_intelligence_score}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Cross-Module Intelligence Score</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>Marketing ↔ Sales ↔ Revenue connectivity</p>
                  <p className="text-xs mt-1" style={{ color: '#fb923c' }}>{loopResults.cross.recommended_budget_shift}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Marketing → Sales Signals */}
                {loopResults.cross.marketing_to_sales_signals?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#60a5fa' }}>📡 Marketing → Sales Signals</p>
                    <div className="space-y-2">
                      {loopResults.cross.marketing_to_sales_signals.map((s, i) => (
                        <div key={i} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{
                              background: s.impact === 'high' ? 'rgba(248,113,113,0.15)' : s.impact === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)',
                              color: s.impact === 'high' ? '#f87171' : s.impact === 'medium' ? '#fbbf24' : '#60a5fa',
                            }}>{s.impact}</span>
                          </div>
                          <p className="text-xs" style={{ color: '#cbd5e1' }}>{s.signal}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>→ {s.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Funnel Bottlenecks */}
                {loopResults.cross.funnel_bottlenecks?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#f87171' }}>🚧 Funnel Bottlenecks</p>
                    <div className="space-y-2">
                      {loopResults.cross.funnel_bottlenecks.map((b, i) => (
                        <div key={i} className="p-2 rounded-lg" style={{ background: 'rgba(248,113,113,0.06)' }}>
                          <p className="text-xs font-semibold" style={{ color: '#f87171' }}>{b.stage}</p>
                          <p className="text-xs" style={{ color: '#cbd5e1' }}>{b.issue}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#34d399' }}>Fix: {b.fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Lead Sources */}
                {loopResults.cross.best_lead_sources?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#34d399' }}>🎯 Best Lead Sources</p>
                    <div className="space-y-2">
                      {loopResults.cross.best_lead_sources.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)' }}>
                          <p className="text-xs font-medium text-white">{s.source}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: '#34d399' }}>{s.conversion_rate_estimate}% conv.</span>
                            <span className="text-xs" style={{ color: '#60a5fa' }}>₹{s.revenue_per_lead}/lead</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revenue Attribution */}
                {loopResults.cross.revenue_attribution?.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#a78bfa' }}>💰 Revenue Attribution</p>
                    <div className="space-y-2">
                      {loopResults.cross.revenue_attribution.map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <p className="text-xs flex-1 truncate" style={{ color: '#cbd5e1' }}>{r.campaign}</p>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${r.estimated_revenue_contribution_pct}%`, background: '#a78bfa' }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>{r.estimated_revenue_contribution_pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Network size={40} className="mx-auto mb-4" style={{ color: 'rgba(148,163,184,0.2)' }} />
              <p className="text-sm font-semibold text-white mb-2">Cross-Module Intelligence Not Yet Run</p>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>
                Run the AI Loop to generate cross-module intelligence connecting marketing, sales, and revenue data.
              </p>
              <button
                onClick={() => { setActiveTab('loop'); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}
              >
                <Activity size={13} />
                Go to AI Loop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
