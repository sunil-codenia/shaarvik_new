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
  total: number; active: number; inactive: number; departments: number; roles: number;
}

const REPORT_ITEMS: ReportItem[] = [
  {
    id: 'ST-001', category: 'Feature Gap', title: 'Staff creation does not create a Supabase Auth user',
    severity: 'critical',
    description: 'The "Add Staff" form creates a record in the user_profiles table but does NOT create a corresponding Supabase Auth user. The staff member cannot log in because no auth.users entry exists. The /api/staff/create route is supposed to handle this but may not be wired to the form.',
    location: 'src/app/staff/page.tsx — handleAdd() function; src/app/api/staff/create/route.ts',
    recommendation: 'Ensure the Add Staff form calls /api/staff/create (not a direct Supabase insert). The API route should use the service role key to call supabase.auth.admin.createUser() and then insert into user_profiles. Verify the API route is actually called on form submit.',
  },
  {
    id: 'ST-002', category: 'Feature Gap', title: 'No staff performance or activity metrics',
    severity: 'warning',
    description: 'The staff list shows name, role, department, and status but no performance data. There is no way to see how many tasks, tickets, or activities each staff member has handled.',
    location: 'src/app/staff/page.tsx — staff row rendering, no metrics',
    recommendation: 'Add a "View Performance" action per staff member that shows: tasks assigned/completed, tickets resolved, activities logged. Query tasks, support_tickets, and activities tables filtered by user_id.',
  },
  {
    id: 'ST-003', category: 'Feature Gap', title: 'No staff leave or availability management',
    severity: 'warning',
    description: 'There is no way to mark a staff member as on leave or unavailable. Tasks and tickets can still be assigned to unavailable staff, causing delays.',
    location: 'src/app/staff/page.tsx — staff status field only has active/inactive',
    recommendation: 'Add "on_leave" as a valid status. Add leave_start_date and leave_end_date fields. Show an "On Leave" badge on staff cards. Exclude on-leave staff from task/ticket assignment dropdowns.',
  },
  {
    id: 'ST-004', category: 'Data Integrity', title: 'Department and role deletion not protected',
    severity: 'warning',
    description: 'Departments and roles can be deleted even if staff members are currently assigned to them. Deleting a role that has active staff members will leave those staff with a null role_id.',
    location: 'src/app/staff/page.tsx — department/role delete handlers, no pre-delete check',
    recommendation: 'Before deleting a department or role, check if any staff members reference it. If yes, show a blocking error: "Cannot delete — X staff members use this role/department." Require reassignment first.',
  },
  {
    id: 'ST-005', category: 'UX Issue', title: 'No staff profile photo / avatar support',
    severity: 'info',
    description: 'Staff cards show initials as avatars but there is no way to upload a profile photo. The user_profiles table may have an avatar_url column but the staff page does not expose it.',
    location: 'src/app/staff/page.tsx — staff card, initials-only avatar',
    recommendation: 'Add an avatar upload field to the staff form. Use Supabase Storage to store photos in a "staff-avatars" bucket. Display the photo in staff cards and throughout the app wherever the staff member is referenced.',
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

export default function StaffReportPage() {
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
    const tables = ['user_profiles', 'departments', 'roles'];
    const results: DBCheckResult[] = [];
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        results.push(error ? { table, status: 'error', rowCount: null, message: error.message } : { table, status: 'ok', rowCount: count ?? 0, message: 'Accessible' });
      } catch { results.push({ table, status: 'error', rowCount: null, message: 'Query failed' }); }
    }
    setDbChecks(results);
    try {
      const [activeR, inactiveR] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
      ]);
      const totalRow = results.find(r => r.table === 'user_profiles');
      const deptRow = results.find(r => r.table === 'departments');
      const rolesRow = results.find(r => r.table === 'roles');
      setLiveStats({ total: totalRow?.rowCount ?? 0, active: activeR.count ?? 0, inactive: inactiveR.count ?? 0, departments: deptRow?.rowCount ?? 0, roles: rolesRow?.rowCount ?? 0 });
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
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Staff Debug Report</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;padding:40px;}h1{font-size:24px;font-weight:700;color:#1e3a5f;margin-bottom:4px;}h2{font-size:16px;font-weight:700;color:#1e3a5f;margin:28px 0 12px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;}.meta{font-size:12px;color:#6b7280;margin-bottom:24px;}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0;}.summary-card{border-radius:8px;padding:16px;text-align:center;}.summary-card .num{font-size:28px;font-weight:700;}.summary-card .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;}.card-critical{background:#fef2f2;border:1px solid #fecaca;}.card-critical .num,.card-critical .lbl{color:#dc2626;}.card-warning{background:#fffbeb;border:1px solid #fde68a;}.card-warning .num,.card-warning .lbl{color:#d97706;}.card-info{background:#eff6ff;border:1px solid #bfdbfe;}.card-info .num,.card-info .lbl{color:#2563eb;}.card-total{background:#f0fdf4;border:1px solid #bbf7d0;}.card-total .num,.card-total .lbl{color:#16a34a;}table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0;}th{background:#f3f4f6;padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;}td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;}tr:nth-child(even) td{background:#f9fafb;}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;}@media print{body{padding:20px;}tr{page-break-inside:avoid;}}</style></head><body><h1>👥 Staff Module Debug Report</h1><p class="meta">Generated: ${now} | Application: ClientFlow | Module: Staff</p><h2>Summary</h2><div class="summary-grid"><div class="summary-card card-critical"><div class="num">${criticalItems.length}</div><div class="lbl">Critical</div></div><div class="summary-card card-warning"><div class="num">${warningItems.length}</div><div class="lbl">Warnings</div></div><div class="summary-card card-info"><div class="num">${infoItems.length}</div><div class="lbl">Info</div></div><div class="summary-card card-total"><div class="num">${REPORT_ITEMS.length}</div><div class="lbl">Total</div></div></div><h2>Database Health Check</h2><table><thead><tr><th>Table</th><th>Row Count</th><th>Message</th><th>Status</th></tr></thead><tbody>${dbRows}</tbody></table><h2>All Findings (${REPORT_ITEMS.length})</h2><table><thead><tr><th>ID</th><th>Severity</th><th>Category</th><th>Title</th><th>Description</th><th>Location</th><th>Recommendation</th></tr></thead><tbody>${issueRows}</tbody></table><div class="footer">ClientFlow Staff Module Report | Generated: ${now} | Total Issues: ${REPORT_ITEMS.length}</div></body></html>`;
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
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20} style={{ color: '#60a5fa' }} />Staff Module — Full Analysis &amp; Debug Report</h1>
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
              { label: 'Total Staff', value: liveStats.total, color: '#3b82f6' },
              { label: 'Active', value: liveStats.active, color: '#34d399' },
              { label: 'Inactive', value: liveStats.inactive, color: '#f87171' },
              { label: 'Departments', value: liveStats.departments, color: '#a78bfa' },
              { label: 'Roles', value: liveStats.roles, color: '#fbbf24' },
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
            { feature: 'Staff List with Search & Filter', status: 'ok' as const, note: 'Loads from Supabase with status filter and search' },
            { feature: 'Add Staff Member', status: 'ok' as const, note: 'Form with name, email, phone, role, status' },
            { feature: 'Edit Staff Member', status: 'ok' as const, note: 'Updates user_profiles table via Supabase' },
            { feature: 'Department Management', status: 'ok' as const, note: 'CRUD for departments table' },
            { feature: 'Role Management', status: 'ok' as const, note: 'CRUD for roles table with department association' },
            { feature: 'Auth User Creation on Add Staff', status: 'warn' as const, note: 'May not create Supabase Auth user — staff cannot log in (ST-001)' },
            { feature: 'Staff Performance Metrics', status: 'fail' as const, note: 'No tasks/tickets/activities metrics per staff (ST-002)' },
            { feature: 'Leave / Availability Management', status: 'fail' as const, note: 'No on_leave status or date range (ST-003)' },
            { feature: 'Delete Protection for Active Staff', status: 'fail' as const, note: 'No check before deleting dept/role with active staff (ST-004)' },
            { feature: 'Staff Profile Photo Upload', status: 'fail' as const, note: 'No avatar upload — initials only (ST-005)' },
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

      {criticalItems.length > 0 && (
        <CollapsibleSection title="Critical Issues" icon={XCircle} color="#f87171" count={criticalItems.length} defaultOpen={true}>
          <div className="space-y-3 mt-3">{criticalItems.map(item => <ReportCard key={item.id} item={item} />)}</div>
        </CollapsibleSection>
      )}
      {warningItems.length > 0 && (
        <CollapsibleSection title="Warnings" icon={AlertTriangle} color="#fbbf24" count={warningItems.length} defaultOpen={false}>
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
          ClientFlow Staff Module Report &nbsp;·&nbsp; {generatedAt || 'Loading...'} &nbsp;·&nbsp; {REPORT_ITEMS.length} total findings &nbsp;·&nbsp; Auto-refreshes on every page load
        </p>
      </div>
    </div>
  );
}
