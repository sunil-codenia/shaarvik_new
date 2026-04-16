'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, FileText, Bug, Database, Zap, BarChart2,
  Info, Shield, Code, Layers, Activity, Download
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


type Severity = 'critical' | 'warning' | 'info';

interface ReportItem {
  id: string; category: string; title: string; severity: Severity;
  description: string; location: string; recommendation: string;
}

interface DBCheckResult {
  table: string; status: 'ok' | 'error' | 'warning'; rowCount: number | null; message: string;
}

interface LiveStats {
  platforms: number; activePlatforms: number; modules: number; plans: number; companies: number;
}

const REPORT_ITEMS: ReportItem[] = [
  {
    id: 'CO-001', category: 'UX Issue', title: '/companies route shows SaaS Platforms, not client companies',
    severity: 'warning',
    description: 'The /companies route renders a "SaaS Platforms" management UI (saas_platforms table). However, the sidebar label says "Companies" which users expect to show their client companies. This naming mismatch causes confusion.',
    location: 'src/app/companies/page.tsx — page title "SaaS Platforms"; src/components/Sidebar.tsx — "Companies" nav item',
    recommendation: 'Either rename the sidebar item to "SaaS Platforms" or create a separate /companies route for client company management and rename the current route to /platforms.',
  },
  {
    id: 'CO-002', category: 'Feature Gap', title: 'RBAC module permissions UI not implemented',
    severity: 'warning',
    description: 'The rbac_modules table exists in the DB (from migration 20260404000000_rbac_modules.sql) but there is no UI to assign which roles can access which modules. The Companies/Platforms page shows modules but not their role assignments.',
    location: 'src/app/companies/page.tsx — no RBAC permissions section; supabase/migrations/20260404000000_rbac_modules.sql',
    recommendation: 'Add a "Permissions" tab or modal per module that shows a role-permission matrix. Allow admins to toggle which roles (from the roles table) can access each module.',
  },
  {
    id: 'CO-003', category: 'Data Integrity', title: 'API URL field has no format validation',
    severity: 'info',
    description: 'The SaaS Platform form has an apiBaseUrl field that accepts any string. Invalid URLs (missing protocol, spaces, special chars) can be saved without error. This can cause silent failures when the URL is used for API calls.',
    location: 'src/app/companies/page.tsx — platform form, apiBaseUrl field',
    recommendation: 'Add URL validation: check that the value starts with http:// or https:// and is a valid URL format. Show an inline error if invalid before allowing save.',
  },
  {
    id: 'CO-004', category: 'Feature Gap', title: 'No "Test Connection" button for module API endpoints',
    severity: 'info',
    description: 'Each SaaS module has an endpoint URL but there is no way to test if the endpoint is reachable. Admins must manually test URLs outside the app.',
    location: 'src/app/companies/page.tsx — module form, endpoint field',
    recommendation: 'Add a "Test" button next to the endpoint field that sends a HEAD or GET request to the URL and shows a success/failure indicator.',
  },
];

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: XCircle },
  warning:  { label: 'Warning',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  icon: AlertTriangle },
  info:     { label: 'Info',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  icon: Info },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Data Integrity': Shield, 'Feature Gap': Zap, 'UX Issue': Layers, 'Performance': Activity, 'Code Quality': Bug, 'Mock / Hardcoded Data': Code,
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}><Icon size={11} />{cfg.label}</span>;
}

function CollapsibleSection({ title, icon: Icon, color, count, children, defaultOpen = false }: { title: string; icon: React.ElementType; color: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left" style={{ background: open ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}><Icon size={16} style={{ color }} /></div>
          <span className="text-white font-semibold text-[14px]">{title}</span>
          {count !== undefined && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, color }}>{count}</span>}
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'rgba(148,163,184,0.5)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(148,163,184,0.5)' }} />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function ReportCard({ item }: { item: ReportItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[item.severity];
  const CatIcon = CATEGORY_ICONS[item.category] || Bug;
  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200" style={{ background: expanded ? 'rgba(15,31,61,0.9)' : 'rgba(15,31,61,0.5)', border: `1px solid ${expanded ? cfg.border : 'rgba(255,255,255,0.06)'}` }}>
      <button className="w-full text-left px-4 py-3.5 flex items-start gap-3" onClick={() => setExpanded(!expanded)}>
        <span className="text-[10px] font-mono tabular-nums flex-shrink-0 mt-0.5 w-12" style={{ color: 'rgba(148,163,184,0.4)' }}>{item.id}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${cfg.color}15` }}><CatIcon size={13} style={{ color: cfg.color }} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5"><SeverityBadge severity={item.severity} /><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.7)' }}>{item.category}</span></div>
          <p className="text-[13px] font-semibold mt-1" style={{ color: '#e2e8f0' }}>{item.title}</p>
          {!expanded && <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'rgba(148,163,184,0.6)' }}>{item.description}</p>}
        </div>
        <div className="flex-shrink-0 ml-2 mt-1">{expanded ? <ChevronUp size={14} style={{ color: 'rgba(148,163,184,0.5)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(148,163,184,0.5)' }} />}</div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="pt-3"><p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Description</p><p className="text-[12px] leading-relaxed" style={{ color: 'rgba(226,232,240,0.8)' }}>{item.description}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Location</p><p className="text-[11px] font-mono px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }}>{item.location}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Recommendation</p><p className="text-[12px] leading-relaxed px-3 py-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)', color: 'rgba(167,243,208,0.85)', border: '1px solid rgba(52,211,153,0.15)' }}>{item.recommendation}</p></div>
        </div>
      )}
    </div>
  );
}

function DBCheckRow({ check }: { check: DBCheckResult }) {
  const isOk = check.status === 'ok'; const isWarn = check.status === 'warning';
  const color = isOk ? '#34d399' : isWarn ? '#fbbf24' : '#f87171';
  const Icon = isOk ? CheckCircle : isWarn ? AlertTriangle : XCircle;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <span className="text-[12px] font-mono flex-1" style={{ color: '#e2e8f0' }}>{check.table}</span>
      <span className="text-[11px] tabular-nums" style={{ color: 'rgba(148,163,184,0.6)' }}>{check.rowCount !== null ? `${check.rowCount} rows` : '—'}</span>
      <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.55)' }}>{check.message}</span>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}15`, color }}>{check.status.toUpperCase()}</span>
    </div>
  );
}

export default function CompaniesReportPage() {
  const [loading, setLoading] = useState(true);
  const [dbChecks, setDbChecks] = useState<DBCheckResult[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');
  const [downloading, setDownloading] = useState(false);

  const criticalItems = REPORT_ITEMS.filter(i => i.severity === 'critical');
  const warningItems = REPORT_ITEMS.filter(i => i.severity === 'warning');
  const infoItems = REPORT_ITEMS.filter(i => i.severity === 'info');

  const runChecks = async () => {
    setLoading(true);
    setGeneratedAt(new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    const supabase = createClient();
    const tables = ['saas_platforms', 'saas_modules', 'saas_plans', 'companies', 'rbac_modules'];
    const results: DBCheckResult[] = [];
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        results.push(error ? { table, status: 'error', rowCount: null, message: error.message } : { table, status: 'ok', rowCount: count ?? 0, message: 'Accessible' });
      } catch { results.push({ table, status: 'error', rowCount: null, message: 'Query failed' }); }
    }
    setDbChecks(results);

    try {
      const [activeR, companiesR] = await Promise.all([
        supabase.from('saas_platforms').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
      ]);
      const platformsRow = results.find(r => r.table === 'saas_platforms');
      const modulesRow = results.find(r => r.table === 'saas_modules');
      const plansRow = results.find(r => r.table === 'saas_plans');
      setLiveStats({
        platforms: platformsRow?.rowCount ?? 0, activePlatforms: activeR.count ?? 0,
        modules: modulesRow?.rowCount ?? 0, plans: plansRow?.rowCount ?? 0,
        companies: companiesR?.count ?? 0,
      });
    } catch { setLiveStats(null); }
    setLoading(false);
  };

  useEffect(() => { runChecks(); }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const now = generatedAt || new Date().toLocaleString();
      const dbRows = dbChecks.map(c => `<tr><td style="padding:8px 12px;font-family:monospace;font-size:12px;">${c.table}</td><td style="padding:8px 12px;">${c.rowCount !== null ? c.rowCount : '—'}</td><td style="padding:8px 12px;">${c.message}</td><td style="padding:8px 12px;font-weight:600;color:${c.status === 'ok' ? '#16a34a' : c.status === 'warning' ? '#d97706' : '#dc2626'};">${c.status.toUpperCase()}</td></tr>`).join('');
      const issueRows = REPORT_ITEMS.map(item => `<tr><td style="padding:10px 12px;font-family:monospace;font-size:11px;color:#6b7280;">${item.id}</td><td style="padding:10px 12px;font-weight:600;color:${item.severity === 'critical' ? '#dc2626' : item.severity === 'warning' ? '#d97706' : '#2563eb'};">${item.severity.toUpperCase()}</td><td style="padding:10px 12px;color:#6b7280;">${item.category}</td><td style="padding:10px 12px;font-weight:600;">${item.title}</td><td style="padding:10px 12px;font-size:11px;color:#374151;">${item.description}</td><td style="padding:10px 12px;font-size:11px;font-family:monospace;color:#1d4ed8;">${item.location}</td><td style="padding:10px 12px;font-size:11px;color:#065f46;">${item.recommendation}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Companies Debug Report</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;padding:40px;}h1{font-size:24px;font-weight:700;color:#1e3a5f;margin-bottom:4px;}h2{font-size:16px;font-weight:700;color:#1e3a5f;margin:28px 0 12px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;}.meta{font-size:12px;color:#6b7280;margin-bottom:24px;}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0;}.summary-card{border-radius:8px;padding:16px;text-align:center;}.summary-card .num{font-size:28px;font-weight:700;}.summary-card .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;}.card-critical{background:#fef2f2;border:1px solid #fecaca;}.card-critical .num,.card-critical .lbl{color:#dc2626;}.card-warning{background:#fffbeb;border:1px solid #fde68a;}.card-warning .num,.card-warning .lbl{color:#d97706;}.card-info{background:#eff6ff;border:1px solid #bfdbfe;}.card-info .num,.card-info .lbl{color:#2563eb;}.card-total{background:#f0fdf4;border:1px solid #bbf7d0;}.card-total .num,.card-total .lbl{color:#16a34a;}table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0;}th{background:#f3f4f6;padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;}td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;}tr:nth-child(even) td{background:#f9fafb;}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;}@media print{body{padding:20px;}tr{page-break-inside:avoid;}}</style></head><body><h1>🏢 Companies / SaaS Platforms Debug Report</h1><p class="meta">Generated: ${now} | Application: ClientFlow | Module: Companies</p><h2>Summary</h2><div class="summary-grid"><div class="summary-card card-critical"><div class="num">${criticalItems.length}</div><div class="lbl">Critical</div></div><div class="summary-card card-warning"><div class="num">${warningItems.length}</div><div class="lbl">Warnings</div></div><div class="summary-card card-info"><div class="num">${infoItems.length}</div><div class="lbl">Info</div></div><div class="summary-card card-total"><div class="num">${REPORT_ITEMS.length}</div><div class="lbl">Total</div></div></div><h2>Database Health Check</h2><table><thead><tr><th>Table</th><th>Row Count</th><th>Message</th><th>Status</th></tr></thead><tbody>${dbRows}</tbody></table><h2>All Findings (${REPORT_ITEMS.length})</h2><table><thead><tr><th>ID</th><th>Severity</th><th>Category</th><th>Title</th><th>Description</th><th>Location</th><th>Recommendation</th></tr></thead><tbody>${issueRows}</tbody></table><div class="footer">ClientFlow Companies Module Report | Generated: ${now} | Total Issues: ${REPORT_ITEMS.length}</div></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) { win.onload = () => { setTimeout(() => { win.print(); }, 500); }; }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { console.error(e); } finally { setDownloading(false); }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20} style={{ color: '#60a5fa' }} />Companies / SaaS Platforms — Full Analysis &amp; Debug Report</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {loading ? <span className="flex items-center gap-1.5"><RefreshCw size={11} className="animate-spin" />Running live checks...</span> : `Live report generated: ${generatedAt}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={runChecks} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleDownload} disabled={downloading || loading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ background: downloading ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', boxShadow: downloading ? 'none' : '0 2px 12px rgba(59,130,246,0.4)', opacity: downloading ? 0.7 : 1 }}>
            <Download size={14} /> {downloading ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Critical Issues', value: criticalItems.length, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: XCircle },
          { label: 'Warnings', value: warningItems.length, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', icon: AlertTriangle },
          { label: 'Info / Gaps', value: infoItems.length, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', icon: Info },
          { label: 'Total Findings', value: REPORT_ITEMS.length, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: FileText },
        ].map((s) => { const Icon = s.icon; return (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <Icon size={18} style={{ color: s.color, flexShrink: 0 }} />
            <div><p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p><p className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</p></div>
          </div>
        ); })}
      </div>

      <CollapsibleSection title="Database Health Check (Live)" icon={Database} color="#34d399" count={dbChecks.length} defaultOpen={true}>
        {loading ? <div className="flex items-center gap-2 py-4" style={{ color: 'rgba(148,163,184,0.6)' }}><RefreshCw size={14} className="animate-spin" /><span className="text-sm">Running DB checks...</span></div>
          : <div className="space-y-2 mt-3">{dbChecks.map((c) => <DBCheckRow key={c.table} check={c} />)}</div>}
      </CollapsibleSection>

      {liveStats && (
        <CollapsibleSection title="Live Module Statistics" icon={BarChart2} color="#60a5fa" defaultOpen={true}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'SaaS Platforms', value: liveStats.platforms, color: '#3b82f6' },
              { label: 'Active Platforms', value: liveStats.activePlatforms, color: '#34d399' },
              { label: 'SaaS Modules', value: liveStats.modules, color: '#a78bfa' },
              { label: 'SaaS Plans', value: liveStats.plans, color: '#fbbf24' },
              { label: 'Companies (DB)', value: liveStats.companies, color: '#fb923c' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Module Functionality Overview" icon={CheckCircle} color="#34d399" defaultOpen={true}>
        <div className="space-y-2 mt-3">
          {[
            { feature: 'SaaS Platform CRUD', status: 'ok' as const, note: 'Create, edit, delete, toggle active/inactive platforms' },
            { feature: 'SaaS Module CRUD per Platform', status: 'ok' as const, note: 'Add/edit/delete modules under each platform' },
            { feature: 'Platform search', status: 'ok' as const, note: 'Client-side search by platform name' },
            { feature: 'Module count per platform', status: 'ok' as const, note: 'Computed from saas_modules join' },
            { feature: 'RBAC module permissions UI', status: 'fail' as const, note: 'rbac_modules table exists but no UI to assign role permissions (CO-002)' },
            { feature: 'API URL validation', status: 'fail' as const, note: 'No URL format validation on apiBaseUrl field (CO-003)' },
            { feature: 'Module endpoint test', status: 'fail' as const, note: 'No "Test Connection" button for module API endpoints (CO-004)' },
            { feature: 'Route naming clarity', status: 'warn' as const, note: '/companies route shows SaaS Platforms, not client companies — naming mismatch (CO-001)' },
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

      {warningItems.length > 0 && (
        <CollapsibleSection title="Warnings" icon={AlertTriangle} color="#fbbf24" count={warningItems.length} defaultOpen={true}>
          <div className="space-y-3 mt-3">{warningItems.map(item => <ReportCard key={item.id} item={item} />)}</div>
        </CollapsibleSection>
      )}
      {infoItems.length > 0 && (
        <CollapsibleSection title="Info / Feature Gaps" icon={Info} color="#60a5fa" count={infoItems.length} defaultOpen={false}>
          <div className="space-y-3 mt-3">{infoItems.map(item => <ReportCard key={item.id} item={item} />)}</div>
        </CollapsibleSection>
      )}

      <div className="rounded-xl px-5 py-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[12px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
          ClientFlow Companies / SaaS Platforms Report &nbsp;·&nbsp; {generatedAt || 'Loading...'} &nbsp;·&nbsp; {REPORT_ITEMS.length} total findings &nbsp;·&nbsp; Auto-refreshes on every page load
        </p>
      </div>
    </div>
  );
}
