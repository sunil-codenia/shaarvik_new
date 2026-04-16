'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Download, CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, FileText, Bug, Database, Zap, BarChart2, Target, AlertCircle, Info, Shield, Code, Layers, Copy, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'warning' | 'info' | 'ok';

interface ReportItem {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  description: string;
  location: string;
  recommendation: string;
}

interface DBCheckResult {
  table: string;
  status: 'ok' | 'error' | 'warning';
  rowCount: number | null;
  message: string;
}

interface LiveStats {
  campaigns: number;
  creatives: number;
  aiActions: number;
  aiGoals: number;
  aiFeedback: number;
  fallbackPatterns: number;
  aiInsightLogs: number;
  ucbCampaigns: number;
  webhookLeads: number;
}

// ─── Static Report Data ───────────────────────────────────────────────────────

const REPORT_ITEMS: ReportItem[] = [
  // ── CRITICAL ──────────────────────────────────────────────────────────────
  {
    id: 'R-001',
    category: 'Data Redundancy',
    title: 'Dual Creatives Tables: `creatives` vs `campaign_creatives`',
    severity: 'critical',
    description:
      'Two separate tables store creative assets. The Creatives page (/marketing/creatives/page.tsx) reads/writes to the `creatives` table. The Campaign Detail page (/marketing/campaigns/[id]/page.tsx) reads from `campaign_creatives`. These are two different tables with different schemas — assets added via the Creatives page will NOT appear in the Campaign Detail creatives tab, and vice versa. This causes data split and user confusion.',
    location: 'src/app/marketing/creatives/page.tsx (table: creatives) vs src/app/marketing/campaigns/[id]/page.tsx (table: campaign_creatives)',
    recommendation:
      'Consolidate to a single table. Either migrate `campaign_creatives` data into `creatives` and update the campaign detail page to query `creatives`, or vice versa. Add a migration to drop the unused table after data migration.',
  },
  {
    id: 'R-002',
    category: 'Mock / Hardcoded Data',
    title: 'Integration credentials stored in local React state only — never persisted',
    severity: 'critical',
    description:
      'The Integrations tab in the Marketing Dashboard (marketing/page.tsx) uses `mockIntegrations` — a hardcoded array with static status values. When a user enters Google Ads, Meta Ads, or Custom API credentials and clicks "Save", the data is stored only in component state. On page refresh, all credentials are lost. There is no Supabase INSERT/UPDATE for integration credentials.',
    location: 'src/app/marketing/page.tsx — mockIntegrations array (lines ~80–90), IntegrationsTab component',
    recommendation:
      'Create a `marketing_integrations` table in Supabase with columns: id, company_id, platform, account_name, status, credentials (jsonb), last_sync. Wire the save button to INSERT/UPDATE this table. Load credentials on mount from Supabase.',
  },
  {
    id: 'R-003',
    category: 'Mock / Hardcoded Data',
    title: 'AI Insights tab uses hardcoded mock data — not from Supabase',
    severity: 'critical',
    description:
      'The AI Insights tab in the Marketing Dashboard uses `mockInsights` — a static array of 4 hardcoded insight objects. These insights are never generated from real campaign data and are never stored in or loaded from Supabase. The `ai_insights_logs` table exists in the DB but is not queried here.',
    location: 'src/app/marketing/page.tsx — mockInsights array (lines ~95–105), AIInsightsTab component',
    recommendation:
      'Replace mockInsights with a Supabase query to `ai_insights_logs` filtered by company_id. If no logs exist, show an empty state with a "Generate Insights" button that calls the Shaarvik AI API.',
  },
  {
    id: 'R-004',
    category: 'Data Integrity',
    title: '`company_id` not saved when creating a campaign',
    severity: 'critical',
    description:
      'The Add Campaign form has a Company dropdown that lets users select a company. However, the `handleAdd` function in CampaignsTab does NOT include `company_id` in the INSERT payload. The selected `form.companyId` is captured in state but silently dropped before the DB write. Campaigns are created without company association.',
    location: 'src/app/marketing/page.tsx — handleAdd() function, payload object (around line 340)',
    recommendation:
      'Add `company_id: form.companyId || null` to the INSERT payload in handleAdd(). Also add it to the UPDATE payload in handleEdit() using `editForm.companyId`.',
  },
  {
    id: 'R-005',
    category: 'Data Integrity',
    title: '`campaigns.revenue` column queried but may not exist in schema',
    severity: 'critical',
    description:
      'The AI Performance page queries `campaigns` table with `.select("id, name, budget, revenue, status")`. However, the campaigns table schema (from migrations) does not define a `revenue` column — revenue is computed dynamically from the `clients` table in the main campaigns tab. If this column does not exist, the query silently returns null for revenue, making all ROI calculations show 0%.',
    location: 'src/app/marketing/ai-performance/page.tsx — fetchData() function, campaigns SELECT query',
    recommendation:
      'Remove `revenue` from the campaigns SELECT. Instead, join with clients table or use the same revenue computation pattern as marketing/page.tsx (aggregate from clients.revenue where campaign_id matches).',
  },

  // ── WARNINGS ──────────────────────────────────────────────────────────────
  {
    id: 'R-006',
    category: 'Mock / Fake Data',
    title: 'ROI Trend chart uses deterministic fake data, not real DB data',
    severity: 'warning',
    description:
      'The 7-day ROI trend chart in AI Performance page is built from a hardcoded formula: `baseRoi = 120 + (i * 15)` and `baseRev = 2000 + (i * 800)`. This always shows a perfectly linear upward trend regardless of actual campaign performance. The chart is visually misleading.',
    location: 'src/app/marketing/ai-performance/page.tsx — fetchData(), roiTrend computation (lines ~175–185)',
    recommendation:
      'Query `ai_autonomous_actions` grouped by date for the last 7 days to build a real trend. Alternatively, aggregate campaign revenue/budget by day from the campaigns table. Remove the deterministic formula.',
  },
  {
    id: 'R-007',
    category: 'Code Duplication',
    title: '`formatTime()` function duplicated across 2 marketing files',
    severity: 'warning',
    description:
      'An identical `formatTime(ts: string)` helper function is defined in both `ai-performance/page.tsx` and `ai/page.tsx`. Both implementations are byte-for-byte identical (converts timestamp to "Xm ago / Xh ago / Xd ago" format). This violates DRY principle.',
    location: 'src/app/marketing/ai-performance/page.tsx (line ~55) and src/app/marketing/ai/page.tsx (line ~130)',
    recommendation:
      'Extract to a shared utility: `src/lib/utils/formatTime.ts`. Import in both files. This also applies to `formatCurrency` which has similar duplication.',
  },
  {
    id: 'R-008',
    category: 'Code Duplication',
    title: 'Confidence display components duplicated: `ConfidenceBar` vs `ConfidenceBadge`',
    severity: 'warning',
    description:
      'Two near-identical confidence display components exist: `ConfidenceBar` in ai-audit/page.tsx (renders a progress bar + percentage) and `ConfidenceBadge` in ai/page.tsx (renders a badge with percentage). Both use the same color logic (green ≥80, yellow ≥60, red <60). They serve the same purpose with minor visual differences.',
    location: 'src/app/marketing/ai-audit/page.tsx — ConfidenceBar component; src/app/marketing/ai/page.tsx — ConfidenceBadge component',
    recommendation:
      'Create a single `ConfidenceIndicator` component in `src/components/ui/` that accepts a `variant` prop ("bar" | "badge"). Import in both pages.',
  },
  {
    id: 'R-009',
    category: 'Hardcoded Value',
    title: '`product_id` hardcoded as "BUILDARYA" in campaigns fetch',
    severity: 'warning',
    description:
      'The campaigns fetch in CampaignsTab filters with `.eq("product_id", "BUILDARYA")`. This hardcoded string means only campaigns tagged with product "BUILDARYA" are shown. Campaigns created for other products are invisible. The Add Campaign form also defaults `productId` to "BUILDARYA".',
    location: 'src/app/marketing/page.tsx — fetchCampaigns() (line ~195) and form initial state (line ~155)',
    recommendation:
      'Remove the `.eq("product_id", "BUILDARYA")` filter or make it dynamic based on the authenticated user\'s company products. The form default should either be empty or populated from the products table.',
  },
  {
    id: 'R-010',
    category: 'Feature Gap',
    title: 'Platform Integrations tab: OAuth flow not implemented',
    severity: 'warning',
    description:
      'The Integrations tab shows credential forms for Google Analytics, Google Ads, Meta Ads, and Custom API. The "Connect" / "Save" buttons exist in the UI but there is no OAuth redirect flow, no token exchange, and no real API validation. Users can enter credentials but nothing actually connects to the ad platforms.',
    location: 'src/app/marketing/page.tsx — IntegrationsTab component, mockIntegrations data',
    recommendation:
      'Either (a) implement OAuth flows for Google/Meta using their respective OAuth endpoints, or (b) clearly label the section as "Coming Soon" and disable the save button with a tooltip explaining the limitation.',
  },
  {
    id: 'R-011',
    category: 'Data Integrity',
    title: 'Revenue Dashboard: all revenue attributed to single campaign regardless of invoice source',
    severity: 'warning',
    description:
      'The Revenue page fetches all paid invoices for the company and attributes 100% of revenue to the company\'s single `campaign_id`. If a company has multiple campaigns or invoices from different sources, all revenue is lumped under one campaign. The cross-table shows the same revenue amount for every product under that one campaign.',
    location: 'src/app/marketing/revenue/page.tsx — fetchData(), campaignRevMap construction',
    recommendation:
      'Join invoices with their originating campaign via leads → campaign_id chain. Build per-campaign revenue by tracing: invoice → client → lead → campaign_id. This gives accurate per-campaign revenue attribution.',
  },
  {
    id: 'R-012',
    category: 'UX Issue',
    title: 'Analysis Report page: Refresh button re-renders static data only',
    severity: 'warning',
    description:
      'The Refresh button on the Analysis Report page increments a `refreshKey` state which re-mounts the component. However, all data in the analysis page is static (hardcoded arrays: functionalFeatures, aiFeatures, googleAdsFields, metaAdsFields, shaarvikAIParams). The refresh does not fetch any live data from Supabase. The "Last refreshed" timestamp is misleading.',
    location: 'src/app/marketing/analysis/page.tsx — handleRefresh(), all data arrays are static constants',
    recommendation:
      'Either (a) fetch live data from Supabase on refresh (campaign counts, AI action counts, etc.) to make scores dynamic, or (b) remove the refresh button since static data cannot be "refreshed".',
  },
  {
    id: 'R-013',
    category: 'Code Duplication',
    title: 'Campaign form state duplicated: `form` and `editForm` are identical structures',
    severity: 'warning',
    description:
      'CampaignsTab in marketing/page.tsx defines two separate useState objects — `form` (for adding) and `editForm` (for editing) — with identical field structures (30+ fields each). Any change to the campaign schema requires updating both state objects and both handler functions (handleAdd and handleEdit).',
    location: 'src/app/marketing/page.tsx — form useState (line ~155) and editForm useState (line ~156)',
    recommendation:
      'Extract a single `CampaignFormState` type and a `useCampaignForm` hook. Use the same form state for both add and edit modes, differentiated by whether `editingCampaign` is null.',
  },
  {
    id: 'R-021',
    category: 'Feature Gap',
    title: 'Campaign Builder (UCB) not linked from main Campaigns tab',
    severity: 'warning',
    description:
      'The Unified Campaign Builder at /marketing/campaign-builder is a separate tab in the marketing layout. However, the main Campaigns tab in marketing/page.tsx has its own "Add Campaign" modal that creates campaigns in the legacy `campaigns` table. The UCB creates campaigns in `ucb_campaigns` table. These two flows are completely disconnected — users may not discover the Campaign Builder.',
    location: 'src/app/marketing/page.tsx — CampaignsTab, "Add Campaign" button; src/app/marketing/campaign-builder/page.tsx',
    recommendation:
      'Add a prominent "Use Campaign Builder" button in the Campaigns tab header that links to /marketing/campaign-builder. Consider deprecating the simple modal in favor of the full UCB flow.',
  },
  {
    id: 'R-022',
    category: 'Data Integrity',
    title: 'Webhook lead imports not shown in main Leads module',
    severity: 'warning',
    description:
      'The Ad Webhooks tab (/marketing/webhooks) shows webhook-captured leads in a separate table. However, these leads are also inserted into the main `leads` table with `ad_platform` source tracking. The main Leads module (/leads) does not filter or highlight webhook-sourced leads, making it hard to distinguish ad-captured leads from manually entered ones.',
    location: 'src/app/marketing/webhooks/page.tsx — webhook leads table; src/app/leads/page.tsx — no ad_platform filter',
    recommendation:
      'Add a "Source" filter to the Leads page that allows filtering by ad_platform (Google Ads, Meta Ads, LinkedIn Ads, manual). Add a source badge to each lead row showing the origin platform.',
  },

  // ── INFO ──────────────────────────────────────────────────────────────────
  {
    id: 'R-014',
    category: 'Feature Gap',
    title: 'Predictive Budget Recommendations not implemented',
    severity: 'info',
    description:
      'The Shaarvik AI Analysis Report correctly marks "Predictive Budget Recommendations" as Not Implemented. No historical trend analysis or ML-based budget forecasting exists. The ROI trend chart uses fake linear data.',
    location: 'src/app/marketing/analysis/page.tsx — shaarvikAIParams array, item index 8',
    recommendation:
      'Implement using historical campaign data: aggregate weekly spend vs leads/revenue, compute trend slope, project forward. Can be done rule-based without ML.',
  },
  {
    id: 'R-015',
    category: 'Feature Gap',
    title: 'Audience Targeting Intelligence not implemented',
    severity: 'info',
    description:
      'No demographic data (age, gender, location, interests) is collected from actual ad platform APIs. The audience_targeting JSONB field in campaigns is manually entered by users, not synced from Google/Meta.',
    location: 'src/app/marketing/analysis/page.tsx — shaarvikAIParams array, item index 9',
    recommendation:
      'Requires live Google Ads / Meta Ads API integration (R-010). Once OAuth is implemented, pull audience performance data via API and store in a dedicated table.',
  },
  {
    id: 'R-016',
    category: 'Feature Gap',
    title: 'Real-Time Platform API Sync not implemented',
    severity: 'info',
    description:
      'Campaign data (impressions, clicks, CTR, actual spend) is not synced from Google Ads or Meta Ads APIs. All metrics are manually entered. The "lastSync" field in mockIntegrations is always null for disconnected platforms.',
    location: 'src/app/marketing/page.tsx — mockIntegrations (Google Ads, Meta Ads entries show lastSync: null)',
    recommendation:
      'Implement a Supabase Edge Function that calls Google Ads API and Meta Marketing API on a schedule. Store results in a `campaign_metrics` table. Display synced data in the campaigns table.',
  },
  {
    id: 'R-017',
    category: 'UX Issue',
    title: 'Campaign detail page uses light theme while marketing module uses dark theme',
    severity: 'info',
    description:
      'The Campaign Detail page (/marketing/campaigns/[id]) uses light theme CSS classes (bg-white, text-foreground, border-border) while all other marketing pages use the dark navy theme. This creates a jarring visual inconsistency when navigating from the campaigns list to a campaign detail.',
    location: 'src/app/marketing/campaigns/[id]/page.tsx — OverviewTab, CreativesTab, LeadsTab components',
    recommendation:
      'Update the campaign detail page to use the same dark theme variables as the rest of the marketing module.',
  },
  {
    id: 'R-018',
    category: 'Performance',
    title: 'N+1 query pattern in campaigns enrichment',
    severity: 'info',
    description:
      'The fetchCampaigns function in CampaignsTab runs 3 separate Supabase queries per campaign (leads count, conversions count, revenue). For 10 campaigns, this is 30+ individual DB round-trips. This causes slow load times and high DB connection usage.',
    location: 'src/app/marketing/page.tsx — fetchCampaigns(), Promise.all inside map (lines ~200–230)',
    recommendation:
      'Use a single SQL query with aggregations: JOIN leads and clients tables, GROUP BY campaign_id, compute counts and sums in one query. Use a Supabase RPC function or a view.',
  },
  {
    id: 'R-019',
    category: 'Data Integrity',
    title: 'AI Performance metrics show hardcoded % changes (always +12%, +8%, +24%)',
    severity: 'info',
    description:
      'The MetricCard components in AI Performance page show change percentages (+12% vs last month, +8% vs last month, +24% vs last month) that are hardcoded static values. These are never computed from actual historical data.',
    location: 'src/app/marketing/ai-performance/page.tsx — metrics array, change field values',
    recommendation:
      'Either compute real month-over-month changes by querying historical data, or remove the change indicators if historical data is not available.',
  },
  {
    id: 'R-020',
    category: 'Code Quality',
    title: 'TypeScript `as any` casts in campaign enrichment',
    severity: 'info',
    description:
      'The fetchCampaigns function uses multiple `(c as any)` casts when accessing campaign fields like endDate, dailyBudget, bidStrategy, etc. This bypasses TypeScript type safety and can hide runtime errors if the DB schema changes.',
    location: 'src/app/marketing/page.tsx — openEdit() function, multiple (c as any) accesses',
    recommendation:
      'Define a complete `CampaignDB` interface that matches the Supabase campaigns table schema. Use this type in the SELECT query result instead of casting to any.',
  },
  {
    id: 'R-023',
    category: 'Feature Gap',
    title: 'UCB Campaign Builder: OAuth account connection UI exists but tokens not stored',
    severity: 'info',
    description:
      'The Campaign Dashboard in the UCB shows "Connect Account" buttons for Google Ads, Meta Ads, and LinkedIn OAuth. The `ucb_account_connections` table exists in the DB but the OAuth redirect/callback flow is not implemented. Clicking "Connect" does nothing beyond UI state.',
    location: 'src/app/marketing/campaign-builder/components/CampaignDashboard.tsx — account connection section',
    recommendation:
      'Implement OAuth redirect flows using Next.js API routes. Store access tokens encrypted in `ucb_account_connections`. Add a callback route at /api/oauth/[platform]/callback.',
  },
  {
    id: 'R-024',
    category: 'Feature Gap',
    title: 'Webhook verification tokens not validated in production',
    severity: 'info',
    description:
      'The Meta Ads webhook receiver (/api/webhooks/meta-ads) validates the hub.verify_token against a hardcoded string "meta_verify_clientflow". The Google Ads and LinkedIn webhook receivers do not implement any signature verification. In production, webhook payloads should be verified using HMAC signatures.',
    location: 'src/app/api/webhooks/meta-ads/route.ts — GET handler; src/app/api/webhooks/google-ads/route.ts; src/app/api/webhooks/linkedin-ads/route.ts',
    recommendation:
      'Implement HMAC-SHA256 signature verification for each platform. Store webhook secrets in the `webhook_secrets` table (already created in migration). Verify X-Hub-Signature-256 header on each incoming POST.',
  },
];

// ─── Severity Config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: XCircle },
  warning:  { label: 'Warning',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  icon: AlertTriangle },
  info:     { label: 'Info',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  icon: Info },
  ok:       { label: 'OK',       color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  icon: CheckCircle },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Data Redundancy': Database,
  'Mock / Hardcoded Data': Code,
  'Mock / Fake Data': Code,
  'Data Integrity': Shield,
  'Code Duplication': Copy,
  'Hardcoded Value': AlertCircle,
  'Feature Gap': Zap,
  'UX Issue': Layers,
  'Performance': Activity,
  'Code Quality': Bug,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function CollapsibleSection({
  title, icon: Icon, color, count, children, defaultOpen = false,
}: {
  title: string; icon: React.ElementType; color: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background: open ? 'rgba(255,255,255,0.02)' : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-white font-semibold text-[14px]">{title}</span>
          {count !== undefined && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, color }}>
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'rgba(148,163,184,0.5)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(148,163,184,0.5)' }} />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Report Item Card ─────────────────────────────────────────────────────────

function ReportCard({ item }: { item: ReportItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[item.severity];
  const CatIcon = CATEGORY_ICONS[item.category] || Bug;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: expanded ? 'rgba(15,31,61,0.9)' : 'rgba(15,31,61,0.5)',
        border: `1px solid ${expanded ? cfg.border : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <button
        className="w-full text-left px-4 py-3.5 flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-[10px] font-mono tabular-nums flex-shrink-0 mt-0.5 w-12" style={{ color: 'rgba(148,163,184,0.4)' }}>{item.id}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${cfg.color}15` }}>
          <CatIcon size={13} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <SeverityBadge severity={item.severity} />
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.7)' }}>
              {item.category}
            </span>
          </div>
          <p className="text-[13px] font-semibold mt-1" style={{ color: '#e2e8f0' }}>{item.title}</p>
          {!expanded && (
            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'rgba(148,163,184,0.6)' }}>{item.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 ml-2 mt-1">
          {expanded ? <ChevronUp size={14} style={{ color: 'rgba(148,163,184,0.5)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(148,163,184,0.5)' }} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Description</p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(226,232,240,0.8)' }}>{item.description}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Location</p>
            <p className="text-[11px] font-mono px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }}>
              {item.location}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Recommendation</p>
            <p className="text-[12px] leading-relaxed px-3 py-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)', color: 'rgba(167,243,208,0.85)', border: '1px solid rgba(52,211,153,0.15)' }}>
              {item.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DB Check Row ─────────────────────────────────────────────────────────────

function DBCheckRow({ check }: { check: DBCheckResult }) {
  const isOk = check.status === 'ok';
  const isWarn = check.status === 'warning';
  const color = isOk ? '#34d399' : isWarn ? '#fbbf24' : '#f87171';
  const Icon = isOk ? CheckCircle : isWarn ? AlertTriangle : XCircle;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <span className="text-[12px] font-mono flex-1" style={{ color: '#e2e8f0' }}>{check.table}</span>
      <span className="text-[11px] tabular-nums" style={{ color: 'rgba(148,163,184,0.6)' }}>
        {check.rowCount !== null ? `${check.rowCount} rows` : '—'}
      </span>
      <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.55)' }}>{check.message}</span>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}15`, color }}>
        {check.status.toUpperCase()}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingReportPage() {
  const [loading, setLoading] = useState(true);
  const [dbChecks, setDbChecks] = useState<DBCheckResult[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const criticalItems = REPORT_ITEMS.filter(i => i.severity === 'critical');
  const warningItems = REPORT_ITEMS.filter(i => i.severity === 'warning');
  const infoItems = REPORT_ITEMS.filter(i => i.severity === 'info');

  // ─── DB Health Check — runs automatically on every page load ─────────────

  const runDBChecks = async () => {
    setLoading(true);
    // Update timestamp on every run
    setGeneratedAt(new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true,
    }));

    const supabase = createClient();
    const tables = [
      'campaigns',
      'creatives',
      'campaign_creatives',
      'ai_autonomous_actions',
      'ai_goals',
      'ai_feedback',
      'ai_fallback_patterns',
      'ai_insights_logs',
      'ai_control_settings',
      'ai_fallback_settings',
      'ucb_campaigns',
      'ucb_creatives',
      'ucb_account_connections',
      'webhook_secrets',
      'leads',
    ];

    const results: DBCheckResult[] = [];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({
            table,
            status: 'error',
            rowCount: null,
            message: error.message,
          });
        } else {
          const rowCount = count ?? 0;
          let status: 'ok' | 'warning' = 'ok';
          let message = 'Accessible';

          if (table === 'creatives' && rowCount === 0) {
            status = 'warning';
            message = 'Table exists but empty';
          } else if (table === 'campaign_creatives' && rowCount === 0) {
            status = 'warning';
            message = 'Table exists but empty — possible data split with `creatives`';
          } else if (table === 'ai_insights_logs' && rowCount === 0) {
            status = 'warning';
            message = 'No AI insight logs — marketing/page.tsx uses mock data instead';
          } else if (table === 'ucb_campaigns' && rowCount === 0) {
            status = 'warning';
            message = 'No UCB campaigns yet — Campaign Builder not used';
          } else if (table === 'ucb_account_connections' && rowCount === 0) {
            status = 'warning';
            message = 'No OAuth connections — ad platform accounts not linked';
          }

          results.push({ table, status, rowCount, message });
        }
      } catch {
        results.push({ table, status: 'error', rowCount: null, message: 'Query failed' });
      }
    }

    setDbChecks(results);

    // Collect live stats
    const statsMap: Partial<LiveStats> = {};
    for (const r of results) {
      if (r.table === 'campaigns') statsMap.campaigns = r.rowCount ?? 0;
      if (r.table === 'creatives') statsMap.creatives = r.rowCount ?? 0;
      if (r.table === 'ai_autonomous_actions') statsMap.aiActions = r.rowCount ?? 0;
      if (r.table === 'ai_goals') statsMap.aiGoals = r.rowCount ?? 0;
      if (r.table === 'ai_feedback') statsMap.aiFeedback = r.rowCount ?? 0;
      if (r.table === 'ai_fallback_patterns') statsMap.fallbackPatterns = r.rowCount ?? 0;
      if (r.table === 'ai_insights_logs') statsMap.aiInsightLogs = r.rowCount ?? 0;
      if (r.table === 'ucb_campaigns') statsMap.ucbCampaigns = r.rowCount ?? 0;
    }

    // Count webhook-sourced leads separately
    try {
      const { count: webhookCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('ad_platform', 'is', null);
      statsMap.webhookLeads = webhookCount ?? 0;
    } catch {
      statsMap.webhookLeads = 0;
    }

    setLiveStats(statsMap as LiveStats);
    setLoading(false);
  };

  // Auto-run on every page load
  useEffect(() => {
    runDBChecks();
  }, []);

  // ─── PDF Download ─────────────────────────────────────────────────────────

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const htmlContent = buildPDFHTML();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => {
          setTimeout(() => { win.print(); }, 500);
        };
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setDownloading(false);
    }
  };

  const buildPDFHTML = (): string => {
    const now = generatedAt || new Date().toLocaleString();
    const critCount = criticalItems.length;
    const warnCount = warningItems.length;
    const infoCount = infoItems.length;
    const totalIssues = REPORT_ITEMS.length;

    const dbRows = dbChecks.map(c => `
      <tr>
        <td style="padding:8px 12px;font-family:monospace;font-size:12px;">${c.table}</td>
        <td style="padding:8px 12px;font-size:12px;">${c.rowCount !== null ? c.rowCount : '—'}</td>
        <td style="padding:8px 12px;font-size:12px;">${c.message}</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:${c.status === 'ok' ? '#16a34a' : c.status === 'warning' ? '#d97706' : '#dc2626'};">${c.status.toUpperCase()}</td>
      </tr>
    `).join('');

    const issueRows = REPORT_ITEMS.map(item => `
      <tr style="page-break-inside:avoid;">
        <td style="padding:10px 12px;font-family:monospace;font-size:11px;color:#6b7280;">${item.id}</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:${item.severity === 'critical' ? '#dc2626' : item.severity === 'warning' ? '#d97706' : '#2563eb'};">${item.severity.toUpperCase()}</td>
        <td style="padding:10px 12px;font-size:12px;color:#6b7280;">${item.category}</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;">${item.title}</td>
        <td style="padding:10px 12px;font-size:11px;color:#374151;">${item.description}</td>
        <td style="padding:10px 12px;font-size:11px;font-family:monospace;color:#1d4ed8;">${item.location}</td>
        <td style="padding:10px 12px;font-size:11px;color:#065f46;">${item.recommendation}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Marketing Module Analysis Report — ClientFlow</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 40px; }
    h1 { font-size: 24px; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
    h2 { font-size: 16px; font-weight: 700; color: #1e3a5f; margin: 28px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
    p { font-size: 13px; color: #4b5563; line-height: 1.6; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .summary-card { border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card .num { font-size: 28px; font-weight: 700; }
    .summary-card .lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .card-critical { background: #fef2f2; border: 1px solid #fecaca; }
    .card-critical .num { color: #dc2626; }
    .card-critical .lbl { color: #dc2626; }
    .card-warning { background: #fffbeb; border: 1px solid #fde68a; }
    .card-warning .num { color: #d97706; }
    .card-warning .lbl { color: #d97706; }
    .card-info { background: #eff6ff; border: 1px solid #bfdbfe; }
    .card-info .num { color: #2563eb; }
    .card-info .lbl { color: #2563eb; }
    .card-total { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .card-total .num { color: #16a34a; }
    .card-total .lbl { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } .no-print { display: none; } h2 { page-break-before: auto; } tr { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>📊 Marketing Module Analysis Report</h1>
  <p class="meta">Generated: ${now} &nbsp;|&nbsp; Application: ClientFlow &nbsp;|&nbsp; Module: Marketing</p>
  <h2>Executive Summary</h2>
  <p>Comprehensive audit of the ClientFlow Marketing Module including: Dashboard (Campaigns, Performance, AI Insights, Integrations), Campaign Builder (UCB — 7-step unified builder for Google/Meta/LinkedIn), Creatives, Revenue, Shaarvik AI, AI Audit, AI Performance, Analysis Report, Ad Webhooks (Google/Meta/LinkedIn lead import), and Debug Report.</p>
  <div class="summary-grid">
    <div class="summary-card card-critical"><div class="num">${critCount}</div><div class="lbl">Critical Issues</div></div>
    <div class="summary-card card-warning"><div class="num">${warnCount}</div><div class="lbl">Warnings</div></div>
    <div class="summary-card card-info"><div class="num">${infoCount}</div><div class="lbl">Info / Gaps</div></div>
    <div class="summary-card card-total"><div class="num">${totalIssues}</div><div class="lbl">Total Findings</div></div>
  </div>
  <h2>Database Health Check (Live)</h2>
  <table>
    <thead><tr><th>Table</th><th>Row Count</th><th>Message</th><th>Status</th></tr></thead>
    <tbody>${dbRows}</tbody>
  </table>
  <h2>Detailed Findings — All ${totalIssues} Issues</h2>
  <table>
    <thead><tr><th>ID</th><th>Severity</th><th>Category</th><th>Title</th><th>Description</th><th>Location</th><th>Recommendation</th></tr></thead>
    <tbody>${issueRows}</tbody>
  </table>
  <div class="footer">ClientFlow Marketing Module Report &nbsp;|&nbsp; Generated: ${now} &nbsp;|&nbsp; Total Issues: ${totalIssues} (${critCount} Critical, ${warnCount} Warnings, ${infoCount} Info)</div>
</body>
</html>`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const criticalCount = criticalItems.length;
  const warningCount = warningItems.length;
  const infoCount = infoItems.length;
  const dbErrorCount = dbChecks.filter(c => c.status === 'error').length;

  return (
    <div
      className="min-h-screen px-4 py-6 lg:px-8 xl:px-10 max-w-screen-2xl mx-auto space-y-6"
      ref={reportRef}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={20} style={{ color: '#60a5fa' }} />
            Marketing Module — Full Analysis &amp; Debug Report
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {loading ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw size={11} className="animate-spin" />
                Running live checks...
              </span>
            ) : (
              `Live report generated: ${generatedAt}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={runDBChecks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: downloading ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              boxShadow: downloading ? 'none' : '0 2px 12px rgba(59,130,246,0.4)',
              opacity: downloading ? 0.7 : 1,
            }}
          >
            <Download size={14} />
            {downloading ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Critical Issues', value: criticalCount, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: XCircle },
          { label: 'Warnings', value: warningCount, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', icon: AlertTriangle },
          { label: 'Info / Gaps', value: infoCount, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', icon: Info },
          { label: 'Total Findings', value: REPORT_ITEMS.length, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: FileText },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <Icon size={18} style={{ color: s.color, flexShrink: 0 }} />
              <div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DB Health Check ── */}
      <CollapsibleSection
        title="Database Health Check (Live)"
        icon={Database}
        color="#34d399"
        count={dbChecks.length}
        defaultOpen={true}
      >
        {loading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-sm">Running DB checks...</span>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {dbErrorCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <XCircle size={13} style={{ color: '#f87171' }} />
                <p className="text-[12px]" style={{ color: '#f87171' }}>{dbErrorCount} table(s) inaccessible — may indicate missing migrations or RLS blocking access</p>
              </div>
            )}
            {dbChecks.map((c) => <DBCheckRow key={c.table} check={c} />)}
          </div>
        )}
      </CollapsibleSection>

      {/* ── Live Stats ── */}
      {liveStats && (
        <CollapsibleSection title="Live Module Statistics" icon={BarChart2} color="#60a5fa" defaultOpen={true}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Legacy Campaigns', value: liveStats.campaigns, color: '#3b82f6' },
              { label: 'UCB Campaigns', value: liveStats.ucbCampaigns, color: '#8b5cf6' },
              { label: 'Webhook Leads', value: liveStats.webhookLeads, color: '#34d399' },
              { label: 'Creatives', value: liveStats.creatives, color: '#fb923c' },
              { label: 'AI Actions', value: liveStats.aiActions, color: '#a78bfa' },
              { label: 'AI Goals', value: liveStats.aiGoals, color: '#34d399' },
              { label: 'AI Feedback', value: liveStats.aiFeedback, color: '#fbbf24' },
              { label: 'Fallback Patterns', value: liveStats.fallbackPatterns, color: '#f87171' },
              { label: 'Insight Logs', value: liveStats.aiInsightLogs, color: '#60a5fa' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Module Functionality Overview ── */}
      <CollapsibleSection title="Module Functionality Overview" icon={CheckCircle} color="#34d399" defaultOpen={true}>
        <div className="space-y-2 mt-3">
          {[
            { feature: 'Campaign CRUD (Create, Edit, Delete)', status: 'ok' as const, note: 'Fully wired to Supabase campaigns table' },
            { feature: 'Campaign KPIs (Budget, Spent, Leads, Active)', status: 'ok' as const, note: 'Aggregated from Supabase in real-time' },
            { feature: 'Campaign Detail Page (/campaigns/[id])', status: 'warn' as const, note: 'Functional but queries different creatives table + light theme mismatch' },
            { feature: 'Creatives Management', status: 'ok' as const, note: 'Full CRUD on `creatives` table' },
            { feature: 'Revenue Dashboard', status: 'warn' as const, note: 'Functional but all revenue attributed to single campaign (R-011)' },
            { feature: 'Unified Campaign Builder (UCB) — 7-step form', status: 'ok' as const, note: 'Google/Meta/LinkedIn multi-platform builder at /marketing/campaign-builder' },
            { feature: 'UCB — Platform Selection (Step 1)', status: 'ok' as const, note: 'Multi-select: Google Ads, Meta Ads, LinkedIn Ads' },
            { feature: 'UCB — Common Fields (Step 2)', status: 'ok' as const, note: 'Campaign basics, budget, targeting stored in ucb_campaigns' },
            { feature: 'UCB — Platform-Specific Fields (Step 3)', status: 'ok' as const, note: 'Dynamic Google/Meta/LinkedIn sections rendered based on selection' },
            { feature: 'UCB — Creative Management (Step 4)', status: 'ok' as const, note: 'Upload/select from library, stored in ucb_creatives' },
            { feature: 'UCB — Tracking & UTM Builder (Step 5)', status: 'ok' as const, note: 'Auto UTM generation + platform tracking IDs' },
            { feature: 'UCB — AI Validation (Step 6)', status: 'ok' as const, note: 'OpenAI-powered validation via /api/ai/chat-completion' },
            { feature: 'UCB — Campaign Dashboard', status: 'ok' as const, note: 'Platform sync status, metrics, smart alerts, A/B test view' },
            { feature: 'UCB — OAuth Account Connection', status: 'warn' as const, note: 'UI exists but OAuth redirect flow not implemented (R-023)' },
            { feature: 'Ad Webhooks — Google Ads receiver', status: 'ok' as const, note: 'POST /api/webhooks/google-ads — imports leads with source tracking' },
            { feature: 'Ad Webhooks — Meta Ads receiver', status: 'ok' as const, note: 'POST /api/webhooks/meta-ads — GET verification + POST lead import' },
            { feature: 'Ad Webhooks — LinkedIn Ads receiver', status: 'ok' as const, note: 'POST /api/webhooks/linkedin-ads — imports leads with source tracking' },
            { feature: 'Ad Webhooks — Webhook signature verification', status: 'warn' as const, note: 'Meta verify_token hardcoded; Google/LinkedIn have no HMAC verification (R-024)' },
            { feature: 'Shaarvik AI — Control Panel', status: 'ok' as const, note: 'Settings saved to Supabase ai_control_settings' },
            { feature: 'Shaarvik AI — Goals', status: 'ok' as const, note: 'CRUD on ai_goals table' },
            { feature: 'Shaarvik AI — AI Loop (Observe/Analyze/Decide/Act)', status: 'ok' as const, note: 'GPT-4 powered via /api/marketing/shaarvik-ai' },
            { feature: 'Shaarvik AI — Simulation', status: 'ok' as const, note: 'OpenAI-powered scenario simulation' },
            { feature: 'Shaarvik AI — Autonomous Actions', status: 'ok' as const, note: 'Logged in ai_autonomous_actions with approval chains' },
            { feature: 'AI Audit Page', status: 'ok' as const, note: 'Real-time audit log from Supabase with approval chain visualization' },
            { feature: 'AI Performance Dashboard', status: 'warn' as const, note: 'campaigns.revenue column may not exist; ROI trend uses fake data (R-005, R-006)' },
            { feature: 'Analysis Report Page', status: 'warn' as const, note: 'All data is hardcoded static arrays; refresh does not fetch live data (R-012)' },
            { feature: 'Platform Integrations Tab', status: 'fail' as const, note: 'UI only — credentials not persisted to DB, no OAuth flow (R-002, R-010)' },
            { feature: 'AI Insights Tab', status: 'fail' as const, note: 'Uses hardcoded mockInsights array, not Supabase ai_insights_logs (R-003)' },
            { feature: 'Fallback Learning Engine', status: 'ok' as const, note: 'Patterns stored in ai_fallback_patterns; AI works without OpenAI key' },
          ].map((item, i) => {
            const color = item.status === 'ok' ? '#34d399' : item.status === 'warn' ? '#fbbf24' : '#f87171';
            const Icon = item.status === 'ok' ? CheckCircle : item.status === 'warn' ? AlertTriangle : XCircle;
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <Icon size={14} style={{ color, flexShrink: 0, marginTop: 1 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: '#e2e8f0' }}>{item.feature}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>{item.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ── Critical Issues ── */}
      <CollapsibleSection title="Critical Issues" icon={XCircle} color="#f87171" count={criticalCount} defaultOpen={true}>
        <div className="space-y-3 mt-3">
          {criticalItems.map(item => <ReportCard key={item.id} item={item} />)}
        </div>
      </CollapsibleSection>

      {/* ── Warnings ── */}
      <CollapsibleSection title="Warnings" icon={AlertTriangle} color="#fbbf24" count={warningCount} defaultOpen={false}>
        <div className="space-y-3 mt-3">
          {warningItems.map(item => <ReportCard key={item.id} item={item} />)}
        </div>
      </CollapsibleSection>

      {/* ── Info / Feature Gaps ── */}
      <CollapsibleSection title="Info / Feature Gaps" icon={Info} color="#60a5fa" count={infoCount} defaultOpen={false}>
        <div className="space-y-3 mt-3">
          {infoItems.map(item => <ReportCard key={item.id} item={item} />)}
        </div>
      </CollapsibleSection>

      {/* ── Priority Action Plan ── */}
      <CollapsibleSection title="Priority Action Plan" icon={Target} color="#a78bfa" defaultOpen={true}>
        <div className="space-y-2 mt-3">
          {[
            { priority: 'P1 — Immediate', color: '#f87171', ids: 'R-001, R-004, R-005', action: 'Fix data split (creatives tables), missing company_id in INSERT, and campaigns.revenue column bug', effort: 'Low–Medium' },
            { priority: 'P2 — High', color: '#fbbf24', ids: 'R-002, R-003, R-009, R-011', action: 'Persist integrations to DB, replace mock AI insights, remove hardcoded product_id, fix revenue attribution', effort: 'Medium' },
            { priority: 'P3 — Medium', color: '#60a5fa', ids: 'R-021, R-022, R-023, R-024', action: 'Link UCB from Campaigns tab, show webhook leads in Leads module, implement OAuth + HMAC verification', effort: 'Medium' },
            { priority: 'P4 — Low', color: '#94a3b8', ids: 'R-006, R-007, R-008, R-012, R-013, R-017, R-018', action: 'Replace fake ROI trend, refactor duplicate code, fix theme inconsistency, fix N+1 queries', effort: 'Low–Medium' },
          ].map((row, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[12px] font-bold flex-shrink-0 w-32" style={{ color: row.color }}>{row.priority}</span>
              <span className="text-[11px] font-mono flex-shrink-0 w-36" style={{ color: 'rgba(148,163,184,0.5)' }}>{row.ids}</span>
              <span className="text-[12px] flex-1" style={{ color: 'rgba(226,232,240,0.8)' }}>{row.action}</span>
              <span className="text-[11px] flex-shrink-0 px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.7)' }}>{row.effort}</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── Footer ── */}
      <div className="rounded-xl px-5 py-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[12px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
          ClientFlow Marketing Module Report &nbsp;·&nbsp; {generatedAt || 'Loading...'} &nbsp;·&nbsp;
          {REPORT_ITEMS.length} total findings ({criticalCount} critical, {warningCount} warnings, {infoCount} info)
          &nbsp;·&nbsp; Report auto-refreshes on every page load
        </p>
      </div>
    </div>
  );
}
