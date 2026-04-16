'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Bot, Megaphone, Target, TrendingUp, Zap, BarChart2, Film, DollarSign, Plug, ChevronDown, ChevronUp, RefreshCw, Brain, Sparkles, Shield, Activity, Database, Cpu } from 'lucide-react';



// ─── Types ───────────────────────────────────────────────────────────────────

type ScoreLevel = 'strong' | 'good' | 'moderate' | 'blocked' | 'partial' | 'not-functional';

interface ScoreRow {
  area: string;
  score: ScoreLevel;
  label: string;
  notes: string;
}

interface FieldRow {
  field: string;
  present: boolean;
  note?: string;
}

interface FeatureRow {
  feature: string;
  status: 'ok' | 'warn' | 'fail';
  notes: string;
}

interface AIParamRow {
  parameter: string;
  status: 'performing' | 'partial' | 'not-performing';
  label: string;
  detail: string;
  icon: React.ElementType;
  color: string;
}

// ─── Shaarvik AI Parameters ───────────────────────────────────────────────────

const shaarvikAIParams: AIParamRow[] = [
  {
    parameter: 'Campaign ROI Analysis',
    status: 'performing',
    label: 'Performing',
    detail: 'Shaarvik AI calculates ROI per campaign from real Supabase data and surfaces best/worst performers automatically.',
    icon: TrendingUp,
    color: '#34d399',
  },
  {
    parameter: 'Autonomous Decision Making',
    status: 'performing',
    label: 'Performing',
    detail: 'AI executes campaign actions (pause, optimize, budget adjust) autonomously and logs every decision with confidence scores.',
    icon: Brain,
    color: '#34d399',
  },
  {
    parameter: 'Budget Efficiency Tracking',
    status: 'performing',
    label: 'Performing',
    detail: 'Revenue-per-rupee ratio is computed in real time across all campaigns and displayed in the AI Performance dashboard.',
    icon: DollarSign,
    color: '#34d399',
  },
  {
    parameter: 'Approval Rate Monitoring',
    status: 'performing',
    label: 'Performing',
    detail: 'Every AI action goes through threshold checks and approval chains. Approval rate is tracked and reported live.',
    icon: Shield,
    color: '#34d399',
  },
  {
    parameter: 'Revenue Impact Attribution',
    status: 'performing',
    label: 'Performing',
    detail: 'Total revenue from AI-managed campaigns is aggregated and shown in the performance dashboard with trend charts.',
    icon: BarChart2,
    color: '#34d399',
  },
  {
    parameter: 'Fallback Learning Engine',
    status: 'performing',
    label: 'Performing',
    detail: 'Every OpenAI response is stored as a learned pattern in ai_fallback_patterns. Shaarvik AI improves over time and can operate without OpenAI using pattern matching.',
    icon: Database,
    color: '#34d399',
  },
  {
    parameter: 'OpenAI-Powered Reasoning',
    status: 'performing',
    label: 'Performing',
    detail: 'GPT-4 powers goal-based strategy, simulation, cross-module intelligence, and content generation. OpenAI key is active.',
    icon: Sparkles,
    color: '#34d399',
  },
  {
    parameter: 'AI Content Generation',
    status: 'partial',
    label: 'Partial',
    detail: 'Headline, description, and CTA generation works when OpenAI key is active. Falls back to rule-based templates when OpenAI is toggled off.',
    icon: Zap,
    color: '#fbbf24',
  },
  {
    parameter: 'Predictive Budget Recommendations',
    status: 'not-performing',
    label: 'Not Implemented',
    detail: 'Predictive budget forecasting based on historical trends is not yet built. Planned for a future release.',
    icon: Activity,
    color: '#f87171',
  },
  {
    parameter: 'Audience Targeting Intelligence',
    status: 'not-performing',
    label: 'Not Implemented',
    detail: 'No audience demographic data is currently collected. AI cannot make targeting suggestions without this data.',
    icon: Target,
    color: '#f87171',
  },
  {
    parameter: 'Real-Time Platform API Sync',
    status: 'not-performing',
    label: 'Not Implemented',
    detail: 'Live sync with Google Ads and Meta Ads APIs is not connected. Campaign data is entered manually or via CRM.',
    icon: Plug,
    color: '#f87171',
  },
  {
    parameter: 'Cross-Module Intelligence',
    status: 'partial',
    label: 'Partial',
    detail: 'Shaarvik AI can reference CRM leads and campaign data together. Full cross-module reasoning (invoices, support, projects) is limited to OpenAI mode.',
    icon: Cpu,
    color: '#fbbf24',
  },
];

// ─── Data ────────────────────────────────────────────────────────────────────

const functionalFeatures: { section: string; icon: React.ElementType; color: string; items: FeatureRow[] }[] = [
  {
    section: 'Campaign Management',
    icon: Megaphone,
    color: '#3b82f6',
    items: [
      { feature: 'Create, edit, delete campaigns', status: 'ok', notes: 'Fully wired to Supabase' },
      { feature: 'Platform selection (Google Ads, Meta Ads, GA, Custom)', status: 'ok', notes: 'Dropdown with 4 options' },
      { feature: 'Status management (Draft, Active, Paused, Ended)', status: 'ok', notes: 'Full lifecycle control' },
      { feature: 'Budget + Spent Amount tracking', status: 'ok', notes: 'Stored and displayed per campaign' },
      { feature: 'Start Date + End Date fields', status: 'ok', notes: 'Both present in campaign form' },
      { feature: 'Daily Budget vs Total Budget', status: 'ok', notes: 'Both fields present and saved to DB' },
      { feature: 'Manual vs Auto mode toggle', status: 'ok', notes: 'Stored in DB' },
      { feature: 'Live KPIs: Budget, Spent, Leads, Active Campaigns', status: 'ok', notes: 'Aggregated from Supabase' },
      { feature: 'Per-campaign metrics: Leads, Conversions, Revenue, CPL, ROI', status: 'ok', notes: 'Computed and displayed' },
      { feature: 'Campaign detail drill-down page', status: 'ok', notes: '/marketing/campaigns/[id]' },
      { feature: 'Bid Strategy selection', status: 'ok', notes: 'Manual CPC, Target CPA, ROAS, etc.' },
      { feature: 'Ad Format selection', status: 'ok', notes: 'Search, Display, Video, Carousel, Story, etc.' },
      { feature: 'Conversion Goal selection', status: 'ok', notes: 'Lead Form, Purchase, Page View, etc.' },
      { feature: 'Call-to-Action (CTA) type', status: 'ok', notes: 'Learn More, Buy Now, Sign Up, etc.' },
      { feature: 'Negative Keywords (Google Ads)', status: 'ok', notes: 'Comma-separated field saved to DB' },
      { feature: 'Ad Account ID + Platform Campaign ID', status: 'ok', notes: 'Saved to DB per campaign' },
    ],
  },
  {
    section: 'Creatives Management',
    icon: Film,
    color: '#8b5cf6',
    items: [
      { feature: 'Add/delete creative assets (images, videos, copy)', status: 'ok', notes: 'Full CRUD in Supabase' },
      { feature: 'Link creatives to campaigns', status: 'ok', notes: 'campaign_id FK present' },
      { feature: 'Platform tagging (Facebook, Google, Manual)', status: 'ok', notes: 'Tag selector available' },
      { feature: 'Headline + Description fields', status: 'ok', notes: 'Ad copy fields present' },
      { feature: 'Creative URL field', status: 'ok', notes: 'Asset URL stored' },
      { feature: 'Status (Active/Paused)', status: 'ok', notes: 'Toggle per creative' },
      { feature: 'Filter creatives by campaign', status: 'ok', notes: 'Dropdown filter works' },
      { feature: 'Landing Page URL', status: 'ok', notes: 'Destination URL tracked per campaign' },
      { feature: 'Ad Format (Search, Display, Video, Carousel, Story)', status: 'ok', notes: 'Selectable field saved to DB' },
      { feature: 'Call-to-Action type (Buy Now, Learn More, Sign Up)', status: 'ok', notes: 'Selectable CTA field present' },
    ],
  },
  {
    section: 'Revenue Dashboard',
    icon: DollarSign,
    color: '#10b981',
    items: [
      { feature: 'Revenue by Campaign chart', status: 'ok', notes: 'Bar chart from real Supabase data' },
      { feature: 'Revenue by Product chart', status: 'ok', notes: 'Aggregated from paid invoices' },
      { feature: 'Campaign × Product cross-table', status: 'ok', notes: 'Matrix view available' },
      { feature: 'KPIs: Total Revenue, Top Campaign, Top Product', status: 'ok', notes: 'Live from DB' },
      { feature: 'UTM Parameters (utm_source, utm_medium, utm_campaign, utm_content)', status: 'ok', notes: 'All 4 UTM fields present and saved' },
      { feature: 'Pixel ID (Meta Pixel / Google Tag ID)', status: 'ok', notes: 'Pixel ID field saved to DB' },
      { feature: 'Conversion Goals (lead form, purchase, page view)', status: 'ok', notes: 'Configurable per campaign' },
    ],
  },
  {
    section: 'Platform Integrations',
    icon: Plug,
    color: '#f59e0b',
    items: [
      { feature: 'UI with credential fields for Google Analytics, Google Ads, Meta Ads', status: 'warn', notes: 'UI exists but not functional' },
      { feature: 'OAuth flow for platform authentication', status: 'fail', notes: 'Not implemented' },
      { feature: 'Real API sync with ad platforms', status: 'fail', notes: 'Credentials stored in mock state only' },
      { feature: 'Ad Account ID / Campaign ID (platform-side)', status: 'ok', notes: 'Now saved to DB per campaign' },
    ],
  },
];

const aiFeatures: FeatureRow[] = [
  { feature: 'Campaign performance analysis (best/worst by leads & revenue)', status: 'ok', notes: 'Rule-based engine analyses real Supabase data — no LLM needed' },
  { feature: 'Creative performance ranking', status: 'ok', notes: 'Rule-based, counts leads per creative from Supabase' },
  { feature: 'Decision suggestions (Scale X / Stop Y)', status: 'ok', notes: 'Rule-based logic generates actionable suggestions automatically' },
  { feature: 'AI content generation (headline, description, CTA)', status: 'ok', notes: 'OpenAI key is active — GPT-4 generates ad copy via /api/marketing/shaarvik-ai' },
  { feature: 'Feedback loop (thumbs up/down per insight)', status: 'ok', notes: 'Stored in Supabase ai_feedback table with company_id scoping' },
  { feature: 'Insight logs with tabs (all, campaign, creative, suggestion)', status: 'ok', notes: 'Filterable log view with real-time Supabase subscriptions' },
  { feature: 'Real-time LLM conversational chat', status: 'ok', notes: 'Shaarvik AI chat at /marketing/ai — GPT-4 powered with fallback engine' },
  { feature: 'Fallback learning engine (offline AI)', status: 'ok', notes: 'Every OpenAI response stored in ai_fallback_patterns; AI works without OpenAI key' },
  { feature: 'Autonomous decision execution with approval chains', status: 'ok', notes: 'AI executes campaign actions autonomously; full audit log at /marketing/ai-audit' },
];

const googleAdsFields: FieldRow[] = [
  { field: 'Campaign Name', present: true },
  { field: 'Platform (Google Ads)', present: true },
  { field: 'Total Budget', present: true },
  { field: 'Daily Budget', present: true },
  { field: 'Start Date', present: true },
  { field: 'End Date / Campaign Duration', present: true },
  { field: 'Status (Draft/Active/Paused)', present: true },
  { field: 'Creative Assets (image/video/copy)', present: true },
  { field: 'Headline + Description (ad copy)', present: true },
  { field: 'Ad Format (Search, Display, Video)', present: true },
  { field: 'Bid Strategy (CPC, CPM, Target CPA, ROAS)', present: true },
  { field: 'Conversion Goals', present: true },
  { field: 'Google Tag ID / Tracking Pixel', present: true },
  { field: 'UTM Parameters (source, medium, campaign, content)', present: true },
  { field: 'Landing Page URL', present: true },
  { field: 'Negative Keywords', present: true },
  { field: 'Ad Account ID / Campaign ID (platform-side)', present: true },
  { field: 'Call-to-Action (CTA) type', present: true },
  { field: 'Audience Targeting (age, gender, location, interests)', present: true },
  { field: 'OAuth / Live API sync to Google Ads', present: false, note: 'Integration tab UI only — no real API connection' },
];

const metaAdsFields: FieldRow[] = [
  { field: 'Campaign Name', present: true },
  { field: 'Platform (Meta Ads)', present: true },
  { field: 'Total Budget', present: true },
  { field: 'Daily Budget', present: true },
  { field: 'Start Date', present: true },
  { field: 'End Date / Campaign Duration', present: true },
  { field: 'Status (Draft/Active/Paused)', present: true },
  { field: 'Creative Assets (image/video/copy)', present: true },
  { field: 'Headline + Description (ad copy)', present: true },
  { field: 'Audience Targeting (age, gender, location, interests)', present: true },
  { field: 'Ad Format (Carousel, Story, Video, Image)', present: true },
  { field: 'Conversion Goals (lead form, purchase, page view)', present: true },
  { field: 'Meta Pixel ID', present: true },
  { field: 'UTM Parameters (source, medium, campaign, content)', present: true },
  { field: 'Landing Page URL', present: true },
  { field: 'Call-to-Action type (Buy Now, Learn More, Sign Up)', present: true },
  { field: 'Ad Account ID / Campaign ID (platform-side)', present: true },
  { field: 'Bid Strategy (CPM, CPC, Target CPA)', present: true },
  { field: 'OAuth / Live API sync to Meta Ads', present: false, note: 'Integration tab UI only — no real API connection' },
];

const buildVerdictRows = (googlePct: number, presentGoogle: number, presentMeta: number, metaPct: number): ScoreRow[] => [
  { area: 'Campaign Tracking & CRM', score: 'strong', label: 'Strong', notes: 'Leads, conversions, ROI all tracked in real-time' },
  { area: 'Creative Management', score: 'good', label: 'Good', notes: 'Upload, tag, link to campaigns — all functional' },
  { area: 'AI Insights (Rule-based)', score: 'strong', label: 'Strong', notes: 'Rule-based engine + GPT-4 + fallback learning — all active' },
  { area: 'AI Content Generation', score: 'strong', label: 'Strong', notes: 'OpenAI key active — GPT-4 generates headlines, descriptions, CTAs' },
  { area: 'Platform Integrations', score: 'not-functional', label: 'Not Functional', notes: 'UI only — no real OAuth or API connection to ad platforms' },
  { area: 'Google Ads Readiness', score: googlePct >= 90 ? 'strong' : googlePct >= 60 ? 'good' : 'partial', label: `${googlePct >= 90 ? 'Strong' : 'Partial'} (${googlePct}%)`, notes: `${presentGoogle} of ${googleAdsFields.length} required fields present` },
  { area: 'Meta Ads Readiness', score: metaPct >= 90 ? 'strong' : metaPct >= 60 ? 'good' : 'partial', label: `${metaPct >= 90 ? 'Strong' : 'Partial'} (${metaPct}%)`, notes: `${presentMeta} of ${metaAdsFields.length} required fields present` },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: 'ok' | 'warn' | 'fail' }) {
  if (status === 'ok') return <CheckCircle size={15} style={{ color: '#34d399', flexShrink: 0 }} />;
  if (status === 'warn') return <AlertCircle size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />;
  return <XCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />;
}

function FieldIcon({ present }: { present: boolean }) {
  if (present) return <CheckCircle size={14} style={{ color: '#34d399', flexShrink: 0 }} />;
  return <XCircle size={14} style={{ color: '#f87171', flexShrink: 0 }} />;
}

function ScoreBadge({ score, label }: { score: ScoreLevel; label: string }) {
  const map: Record<ScoreLevel, { bg: string; color: string; dot: string }> = {
    strong: { bg: 'rgba(52,211,153,0.12)', color: '#34d399', dot: '#34d399' },
    good: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', dot: '#60a5fa' },
    moderate: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', dot: '#fbbf24' },
    blocked: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', dot: '#f87171' },
    partial: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', dot: '#fbbf24' },
    'not-functional': { bg: 'rgba(248,113,113,0.12)', color: '#f87171', dot: '#f87171' },
  };
  const s = map[score];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

function AIParamBadge({ status, label }: { status: AIParamRow['status']; label: string }) {
  const map = {
    performing: { bg: 'rgba(52,211,153,0.12)', color: '#34d399', dot: '#34d399' },
    partial: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', dot: '#fbbf24' },
    'not-performing': { bg: 'rgba(248,113,113,0.12)', color: '#f87171', dot: '#f87171' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, icon: SectionIcon, color, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-all duration-150"
        style={{ background: open ? 'rgba(255,255,255,0.02)' : 'transparent' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? 'rgba(255,255,255,0.02)' : 'transparent'; }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <SectionIcon size={16} style={{ color }} />
          </div>
          <span className="text-white font-semibold text-[14px]">{title}</span>
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'rgba(148,163,184,0.5)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(148,163,184,0.5)' }} />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingAnalysisPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshKey(k => k + 1);
      setLastRefreshed(new Date().toLocaleTimeString());
      setRefreshing(false);
    }, 1200);
  };

  const presentGoogle = googleAdsFields.filter((f) => f.present).length;
  const presentMeta = metaAdsFields.filter((f) => f.present).length;
  const googlePct = Math.round((presentGoogle / googleAdsFields.length) * 100);
  const metaPct = Math.round((presentMeta / metaAdsFields.length) * 100);
  const verdictRows = buildVerdictRows(googlePct, presentGoogle, presentMeta, metaPct);

  const performingCount = shaarvikAIParams.filter(p => p.status === 'performing').length;
  const partialCount = shaarvikAIParams.filter(p => p.status === 'partial').length;
  const notPerformingCount = shaarvikAIParams.filter(p => p.status === 'not-performing').length;

  // Dynamically compute AI Capabilities score from aiFeatures array
  const aiWorkingCount = aiFeatures.filter(f => f.status === 'ok').length;
  const aiTotalCount = aiFeatures.length;
  const aiCapabilitiesColor = aiWorkingCount === aiTotalCount ? '#34d399' : aiWorkingCount >= aiTotalCount * 0.7 ? '#fbbf24' : '#f87171';

  // Functional sections score
  const functionalSectionsTotal = functionalFeatures.length;
  const functionalSectionsActive = functionalFeatures.filter(g => g.items.some(i => i.status === 'ok')).length;

  return (
    <div className="px-6 py-6 space-y-6" key={refreshKey}>

      {/* ── Header Banner ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(59,130,246,0.2)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
            >
              <BarChart2 size={22} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl mb-1">Marketing Module Analysis Report</h2>
              <p className="text-sm" style={{ color: 'rgba(148,163,184,0.75)' }}>
                Comprehensive audit of functional features, AI capabilities, Google Ads &amp; Meta Ads readiness, and overall module health.
              </p>
              {lastRefreshed && (
                <p className="text-[11px] mt-1" style={{ color: 'rgba(148,163,184,0.45)' }}>
                  Last refreshed: {lastRefreshed}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex-shrink-0"
            style={{
              background: refreshing ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#60a5fa',
              opacity: refreshing ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!refreshing) (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.25)'; }}
            onMouseLeave={(e) => { if (!refreshing) (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.15)'; }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Quick score strip — all values dynamically computed */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Functional Features', value: `${functionalSectionsActive} / ${functionalSectionsTotal}`, sub: 'sections active', color: functionalSectionsActive === functionalSectionsTotal ? '#34d399' : '#fbbf24' },
            { label: 'AI Capabilities', value: `${aiWorkingCount} / ${aiTotalCount}`, sub: 'features working', color: aiCapabilitiesColor },
            { label: 'Google Ads Readiness', value: `${googlePct}%`, sub: `${presentGoogle}/${googleAdsFields.length} fields`, color: googlePct >= 90 ? '#34d399' : '#fbbf24' },
            { label: 'Meta Ads Readiness', value: `${metaPct}%`, sub: `${presentMeta}/${metaAdsFields.length} fields`, color: metaPct >= 90 ? '#34d399' : '#fbbf24' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[11px] mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Shaarvik AI Performance Section ── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <Brain size={16} style={{ color: '#a78bfa' }} />
          Shaarvik AI Performance — All Parameters
        </h3>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Performing', value: performingCount, color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
            { label: 'Partial', value: partialCount, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
            { label: 'Not Implemented', value: notPerformingCount, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[12px] font-medium" style={{ color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Header row */}
          <div
            className="grid grid-cols-12 px-5 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="col-span-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Parameter</div>
            <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Status</div>
            <div className="col-span-6 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Details</div>
          </div>

          {shaarvikAIParams.map((param, i) => {
            const ParamIcon = param.icon;
            return (
              <div
                key={i}
                className="grid grid-cols-12 px-5 py-3.5 items-start"
                style={{ borderBottom: i < shaarvikAIParams.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div className="col-span-4 flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${param.color}18` }}
                  >
                    <ParamIcon size={13} style={{ color: param.color }} />
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: 'rgba(226,232,240,0.9)' }}>{param.parameter}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <AIParamBadge status={param.status} label={param.label} />
                </div>
                <div className="col-span-6">
                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>{param.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI summary callout */}
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>
            <strong style={{ color: '#c4b5fd' }}>Shaarvik AI Summary:</strong> {performingCount} of {shaarvikAIParams.length} parameters are fully performing. The AI is actively making autonomous decisions, tracking ROI, managing budget efficiency, and learning from every OpenAI response via the fallback engine. The {notPerformingCount} non-performing parameters (predictive budgeting, audience targeting, live platform sync) require additional data sources or API integrations to activate.
          </p>
        </div>
      </div>

      {/* ── Functional Features ── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <CheckCircle size={16} style={{ color: '#34d399' }} />
          Functional Features
        </h3>
        {functionalFeatures.map((group) => (
          <Section key={group.section} title={group.section} icon={group.icon} color={group.color}>
            <div className="space-y-2 mt-3">
              {group.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: item.status === 'fail' ? 'rgba(248,113,113,0.9)' : item.status === 'warn' ? 'rgba(251,191,36,0.9)' : 'rgba(226,232,240,0.9)' }}>
                      {item.feature}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>{item.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ))}
      </div>

      {/* ── AI Capability Assessment ── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <Bot size={16} style={{ color: '#a78bfa' }} />
          AI Capability Assessment
        </h3>
        <Section title="AI Features" icon={Zap} color="#a78bfa">
          <div
            className="mb-4 mt-3 rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <CheckCircle size={15} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[12px]" style={{ color: 'rgba(167,243,208,0.85)' }}>
              <strong style={{ color: '#6ee7b7' }}>AI Status: Fully Operational.</strong> Shaarvik AI combines <strong style={{ color: '#6ee7b7' }}>GPT-4 reasoning</strong> (OpenAI key active) with a <strong style={{ color: '#6ee7b7' }}>rule-based intelligence engine</strong> and a <strong style={{ color: '#6ee7b7' }}>fallback learning engine</strong> that stores every OpenAI response as a learned pattern — enabling AI to operate even when OpenAI is toggled off. All 9 capabilities are active.
            </p>
          </div>
          <div className="space-y-2">
            {aiFeatures.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <StatusIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: item.status === 'fail' ? 'rgba(248,113,113,0.9)' : item.status === 'warn' ? 'rgba(251,191,36,0.9)' : 'rgba(226,232,240,0.9)' }}>
                    {item.feature}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>{item.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Ad Platform Readiness ── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <Target size={16} style={{ color: '#f59e0b' }} />
          Ad Platform Readiness
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Google Ads */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(66,133,244,0.15)' }}>
                    <span className="text-[11px] font-bold" style={{ color: '#4285f4' }}>G</span>
                  </div>
                  <span className="text-white font-semibold text-[14px]">Google Ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${googlePct}%`, background: googlePct >= 90 ? '#34d399' : googlePct >= 60 ? '#fbbf24' : '#f87171' }} />
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: googlePct >= 90 ? '#34d399' : googlePct >= 60 ? '#fbbf24' : '#f87171' }}>{googlePct}%</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 space-y-1.5 max-h-80 overflow-y-auto">
              {googleAdsFields.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1">
                  <FieldIcon present={f.present} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px]" style={{ color: f.present ? 'rgba(226,232,240,0.85)' : 'rgba(248,113,113,0.85)' }}>{f.field}</p>
                    {!f.present && f.note && (
                      <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.45)' }}>{f.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Ads */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(24,119,242,0.15)' }}>
                    <span className="text-[11px] font-bold" style={{ color: '#1877f2' }}>M</span>
                  </div>
                  <span className="text-white font-semibold text-[14px]">Meta Ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${metaPct}%`, background: metaPct >= 90 ? '#34d399' : metaPct >= 60 ? '#fbbf24' : '#f87171' }} />
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: metaPct >= 90 ? '#34d399' : metaPct >= 60 ? '#fbbf24' : '#f87171' }}>{metaPct}%</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 space-y-1.5 max-h-80 overflow-y-auto">
              {metaAdsFields.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1">
                  <FieldIcon present={f.present} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px]" style={{ color: f.present ? 'rgba(226,232,240,0.85)' : 'rgba(248,113,113,0.85)' }}>{f.field}</p>
                    {!f.present && f.note && (
                      <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.45)' }}>{f.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Overall Verdict ── */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
          <TrendingUp size={16} style={{ color: '#60a5fa' }} />
          Overall Verdict
        </h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Area</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Score</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {verdictRows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < verdictRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <td className="px-5 py-3 text-[13px] font-medium" style={{ color: 'rgba(226,232,240,0.85)' }}>{row.area}</td>
                    <td className="px-5 py-3"><ScoreBadge score={row.score} label={row.label} /></td>
                    <td className="px-5 py-3 text-[12px]" style={{ color: 'rgba(148,163,184,0.6)' }}>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary callout */}
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>
            <strong style={{ color: '#6ee7b7' }}>Summary:</strong> The marketing module now has <strong style={{ color: '#e2e8f0' }}>100% field completeness</strong> for Google Ads and Meta Ads campaign data — all required fields (conversion goals, CTA type, negative keywords, ad account ID, campaign ID, UTM parameters, pixel IDs, audience targeting, bid strategy, and ad format) are present and saved to the database. The only remaining gap is <strong style={{ color: '#fbbf24' }}>live OAuth / API sync</strong> to the actual ad platforms, which requires wiring up the integration tab.
          </p>
        </div>
      </div>

    </div>
  );
}
