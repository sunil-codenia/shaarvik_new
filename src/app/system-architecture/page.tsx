'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Network, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, ArrowRight, Megaphone, Users, TrendingUp, FileText, LifeBuoy, CheckSquare, Building2, CreditCard, LayoutList, UserCog, LayoutDashboard, Globe, Zap, Database, Link2, AlertCircle, Info, Cloud, Server, Shield, Lock, Terminal, Settings, BookOpen, Activity, Key, GitBranch, Package, Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleNode {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  description: string;
  route: string;
}

interface ModuleConnection {
  from: string;
  to: string;
  label: string;
  type: 'primary' | 'secondary' | 'data';
}

interface DebugCheck {
  id: string;
  module: string;
  check: string;
  status: 'ok' | 'warning' | 'error' | 'checking';
  detail: string;
  rowCount?: number | null;
}

interface AWSCheck {
  id: string;
  category: string;
  check: string;
  status: 'ok' | 'warning' | 'error' | 'checking';
  detail: string;
  suggestion: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ─── Module Definitions ───────────────────────────────────────────────────────

const MODULES: ModuleNode[] = [
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.3)',
    description: 'Campaign builder, AI performance, ad webhooks, creatives, UCB engine',
    route: '/marketing',
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: TrendingUp,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.3)',
    description: 'Lead capture from website & ad webhooks, pipeline management, conversion',
    route: '/leads',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.3)',
    description: 'Client records created from converted leads, relationship management',
    route: '/clients',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: CreditCard,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    description: 'Plans assigned to clients, renewal reminders, trial management',
    route: '/subscriptions',
  },
  {
    id: 'invoices',
    label: 'Billing',
    icon: FileText,
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.1)',
    border: 'rgba(251,146,60,0.3)',
    description: 'Invoices generated from subscriptions, payment tracking',
    route: '/invoices',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)',
    border: 'rgba(56,189,248,0.3)',
    description: 'Tasks linked to clients, projects, and staff assignments',
    route: '/tasks',
  },
  {
    id: 'tickets',
    label: 'Support',
    icon: LifeBuoy,
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.1)',
    border: 'rgba(244,114,182,0.3)',
    description: 'Support tickets raised by clients, resolved by staff',
    route: '/tickets',
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: UserCog,
    color: '#a3e635',
    bg: 'rgba(163,230,53,0.1)',
    border: 'rgba(163,230,53,0.3)',
    description: 'Staff members assigned to tasks, tickets, and client accounts',
    route: '/staff',
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: Building2,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.1)',
    border: 'rgba(148,163,184,0.3)',
    description: 'Multi-tenant company isolation, module access control per company',
    route: '/companies',
  },
  {
    id: 'plans',
    label: 'Plans',
    icon: LayoutList,
    color: '#c084fc',
    bg: 'rgba(192,132,252,0.1)',
    border: 'rgba(192,132,252,0.3)',
    description: 'SaaS plan definitions (monthly/yearly pricing) used by subscriptions',
    route: '/plans',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.3)',
    description: 'Aggregated KPIs from all modules — leads, clients, tasks, campaigns',
    route: '/dashboard',
  },
  {
    id: 'website',
    label: 'Website',
    icon: Globe,
    color: '#67e8f9',
    bg: 'rgba(103,232,249,0.1)',
    border: 'rgba(103,232,249,0.3)',
    description: 'Public-facing pages, contact form → lead capture, product showcase',
    route: '/website',
  },
];

// ─── Connection Map ───────────────────────────────────────────────────────────

const CONNECTIONS: ModuleConnection[] = [
  { from: 'website', to: 'leads', label: 'Contact form → Lead', type: 'primary' },
  { from: 'marketing', to: 'leads', label: 'Ad webhook → Lead attribution', type: 'primary' },
  { from: 'leads', to: 'clients', label: 'Lead conversion → Client record', type: 'primary' },
  { from: 'clients', to: 'subscriptions', label: 'Client assigned a plan', type: 'primary' },
  { from: 'plans', to: 'subscriptions', label: 'Plan definition used', type: 'data' },
  { from: 'subscriptions', to: 'invoices', label: 'Subscription → Invoice generated', type: 'primary' },
  { from: 'clients', to: 'tasks', label: 'Tasks linked to client', type: 'secondary' },
  { from: 'clients', to: 'tickets', label: 'Client raises support ticket', type: 'secondary' },
  { from: 'staff', to: 'tasks', label: 'Staff assigned to task', type: 'secondary' },
  { from: 'staff', to: 'tickets', label: 'Staff resolves ticket', type: 'secondary' },
  { from: 'companies', to: 'clients', label: 'Company → Client isolation', type: 'data' },
  { from: 'companies', to: 'marketing', label: 'Company → Campaign isolation', type: 'data' },
  { from: 'marketing', to: 'dashboard', label: 'Campaign KPIs → Dashboard', type: 'data' },
  { from: 'leads', to: 'dashboard', label: 'Lead stats → Dashboard', type: 'data' },
  { from: 'tasks', to: 'dashboard', label: 'Overdue tasks → Dashboard', type: 'data' },
  { from: 'invoices', to: 'dashboard', label: 'Revenue → Dashboard', type: 'data' },
];

// ─── DB Checks ────────────────────────────────────────────────────────────────

const DB_CHECKS = [
  { id: 'dc-01', module: 'Marketing', check: 'campaigns table', table: 'campaigns' },
  { id: 'dc-02', module: 'Marketing', check: 'campaign_creatives table', table: 'campaign_creatives' },
  { id: 'dc-03', module: 'Marketing', check: 'creatives table', table: 'creatives' },
  { id: 'dc-04', module: 'Leads', check: 'leads table', table: 'leads' },
  { id: 'dc-05', module: 'Clients', check: 'clients table', table: 'clients' },
  { id: 'dc-06', module: 'Subscriptions', check: 'subscriptions table', table: 'subscriptions' },
  { id: 'dc-07', module: 'Billing', check: 'invoices table', table: 'invoices' },
  { id: 'dc-08', module: 'Tasks', check: 'tasks table', table: 'tasks' },
  { id: 'dc-09', module: 'Support', check: 'support_tickets table', table: 'support_tickets' },
  { id: 'dc-10', module: 'Staff', check: 'staff table', table: 'staff' },
  { id: 'dc-11', module: 'Companies', check: 'companies table', table: 'companies' },
  { id: 'dc-12', module: 'Plans', check: 'plans table', table: 'plans' },
  { id: 'dc-13', module: 'Marketing', check: 'ai_insights_logs table', table: 'ai_insights_logs' },
  { id: 'dc-14', module: 'Marketing', check: 'ai_autonomous_actions table', table: 'ai_autonomous_actions' },
];

// ─── Architecture Issues ──────────────────────────────────────────────────────

const ARCH_ISSUES = [
  {
    id: 'AI-001',
    severity: 'critical' as const,
    module: 'Marketing → Leads',
    title: 'Ad webhook lead attribution not linked back to campaigns',
    description: 'Leads captured via /api/webhooks/meta-ads, /api/webhooks/google-ads, /api/webhooks/linkedin-ads are inserted into the leads table but the campaign_id foreign key is not populated. This breaks the Marketing → Leads data flow.',
    fix: 'Pass campaign_id in webhook payload and store it in leads.campaign_id. Add a foreign key constraint.',
  },
  {
    id: 'AI-002',
    severity: 'critical' as const,
    module: 'Leads → Clients',
    title: 'Lead conversion does not auto-create subscription or invoice',
    description: 'When a lead is converted to a client via /api/leads/convert, only a client record is created. No subscription or invoice is auto-generated, breaking the Leads → Clients → Subscriptions → Billing chain.',
    fix: 'After client creation, prompt user to assign a plan and auto-create a subscription + first invoice.',
  },
  {
    id: 'AI-003',
    severity: 'warning' as const,
    module: 'Subscriptions → Billing',
    title: 'Renewal reminders not connected to invoice generation',
    description: 'The renewal reminder system (/api/reminders/process) sends email alerts but does not auto-generate a renewal invoice. The Billing module must be triggered from Subscriptions.',
    fix: 'In renewalReminders.ts, after sending reminder, call invoice creation logic for the upcoming renewal period.',
  },
  {
    id: 'AI-004',
    severity: 'warning' as const,
    module: 'Companies → All Modules',
    title: 'company_id not enforced in Tasks and Staff modules',
    description: 'Tasks and Staff tables may not have company_id RLS policies enforced consistently, allowing cross-company data leakage in multi-tenant setup.',
    fix: 'Audit RLS policies on tasks and staff tables. Ensure all SELECT/INSERT/UPDATE/DELETE policies filter by company_id.',
  },
  {
    id: 'AI-005',
    severity: 'warning' as const,
    module: 'Marketing (Creatives)',
    title: 'Dual creatives tables: creatives vs campaign_creatives',
    description: 'Two separate tables store creative assets. Assets added via /marketing/creatives do not appear in campaign detail views and vice versa.',
    fix: 'Consolidate to a single table. Migrate data and update all queries to use one source of truth.',
  },
  {
    id: 'AI-006',
    severity: 'info' as const,
    module: 'Dashboard',
    title: 'Dashboard KPIs are not real-time — no live subscription',
    description: 'Dashboard data is fetched on mount but not subscribed to real-time Supabase changes. KPIs go stale without a page refresh.',
    fix: 'Add Supabase real-time subscriptions on key tables (leads, tasks, campaigns) to push live updates to the dashboard.',
  },
  {
    id: 'AI-007',
    severity: 'info' as const,
    module: 'Website → Leads',
    title: 'Website contact form lead source not tagged',
    description: 'Leads from the website contact form are inserted without a source tag. This makes it impossible to distinguish website leads from ad-webhook leads in the pipeline.',
    fix: 'Add source: "website_contact" field when inserting leads from the website contact form.',
  },
];

// ─── AWS Deployment Sections ──────────────────────────────────────────────────

const AWS_SECTIONS = [
  {
    id: 'aws-01',
    icon: Cloud,
    color: '#f59e0b',
    title: 'AWS Compatibility Overview',
    content: [
      { type: 'para', text: 'This application is a Next.js 15 (App Router) + Supabase + OpenAI stack. It is fully compatible with AWS cloud hosting. The frontend/backend (Next.js) runs on AWS compute, while the database (Supabase PostgreSQL) can either remain on Supabase cloud or be migrated to AWS RDS (PostgreSQL). All debug report pages, module health checks, and API routes will continue to work on AWS without any code changes — they rely on environment variables and HTTP endpoints, not on any platform-specific runtime.' },
      { type: 'list', items: [
        '✅ Next.js App Router — fully portable, no platform lock-in',
        '✅ Supabase client uses <code>NEXT_PUBLIC_SUPABASE_URL</code> — just update the env var to point to new DB',
        '✅ All API routes (<code>/api/*</code>) are standard Next.js serverless functions',
        '✅ Debug report pages query Supabase via the JS client — work anywhere with correct env vars',
        '✅ OpenAI integration uses server-side API routes — key stays in env vars',
        '✅ Static assets served from <code>/public</code> — compatible with S3 + CloudFront',
      ]},
    ],
  },
  {
    id: 'aws-02',
    icon: Server,
    color: '#60a5fa',
    title: 'Option A — AWS Amplify (Recommended for Next.js)',
    content: [
      { type: 'step', num: '1', text: 'Go to <strong>AWS Console → AWS Amplify → "New App" → "Host web app"</strong>.' },
      { type: 'step', num: '2', text: 'Connect your Git repository (GitHub / GitLab / Bitbucket). Select the branch to deploy (e.g., <code>main</code>).' },
      { type: 'step', num: '3', text: 'Amplify auto-detects Next.js. Accept the default build settings.<br/>Build command: <code>npm run build</code> &nbsp;|&nbsp; Output directory: <code>.next</code>' },
      { type: 'step', num: '4', text: 'In <strong>Amplify Console → App Settings → Environment Variables</strong>, add ALL variables from your <code>.env</code> file (see Section 4 for the full list).' },
      { type: 'step', num: '5', text: 'Click <strong>"Save and Deploy"</strong>. Amplify builds and deploys the app. You get a <code>*.amplifyapp.com</code> URL immediately.' },
      { type: 'step', num: '6', text: 'To add a custom domain: <strong>Amplify Console → Domain Management → Add Domain</strong>. Follow the CNAME/A record instructions for your DNS provider.' },
      { type: 'note', text: 'ℹ️ AWS Amplify natively supports Next.js SSR, API routes, and middleware. No additional configuration is needed for App Router.' },
    ],
  },
  {
    id: 'aws-03',
    icon: Terminal,
    color: '#a78bfa',
    title: 'Option B — AWS EC2 (Full Control)',
    content: [
      { type: 'step', num: '1', text: 'Launch an EC2 instance: Ubuntu 22.04 LTS, t3.medium (minimum for production). Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS) in the Security Group.' },
      { type: 'step', num: '2', text: 'SSH into the instance. Install Node.js 20 LTS:\n  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\n  sudo apt-get install -y nodejs' },
      { type: 'step', num: '3', text: 'Install PM2 (process manager for Node.js):\n  sudo npm install -g pm2' },
      { type: 'step', num: '4', text: 'Clone your repository:\n  git clone https://github.com/your-org/your-repo.git /var/www/clientflow\n  cd /var/www/clientflow\n  npm install' },
      { type: 'step', num: '5', text: 'Create the <code>.env</code> file on the server:\n  nano /var/www/clientflow/.env\n  Paste all environment variables (see Section 4). Save and exit. Set permissions: <code>chmod 600 .env</code>' },
      { type: 'step', num: '6', text: 'Build the Next.js app:\n  npm run build' },
      { type: 'step', num: '7', text: 'Start with PM2:\n  pm2 start npm --name "clientflow" -- start\n  pm2 save\n  pm2 startup' },
      { type: 'step', num: '8', text: 'Install and configure Nginx as reverse proxy:\n  sudo apt install nginx\n  Create /etc/nginx/sites-available/clientflow with proxy_pass to localhost:3000\n  Enable: sudo ln -s /etc/nginx/sites-available/clientflow /etc/nginx/sites-enabled/\n  sudo nginx -t && sudo systemctl reload nginx' },
      { type: 'step', num: '9', text: 'Install SSL with Certbot:\n  sudo apt install certbot python3-certbot-nginx\n  sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com' },
      { type: 'note', text: 'ℹ️ Use an Elastic IP to keep a static public IP address. Set up Auto Scaling Groups for high availability in production.' },
    ],
  },
  {
    id: 'aws-04',
    icon: Settings,
    color: '#34d399',
    title: 'Environment Variables — Complete List',
    content: [
      { type: 'para', text: 'These environment variables MUST be set on your AWS server or Amplify before the app will function. <strong>Never commit real values to Git.</strong>' },
      { type: 'envtable', rows: [
        { key: 'NEXT_PUBLIC_SUPABASE_URL', desc: 'Your Supabase project URL (or AWS RDS endpoint if migrated)', required: true },
        { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', desc: 'Supabase anonymous/public key for client-side queries', required: true },
        { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Supabase service role key for server-side admin operations (NEVER expose to browser)', required: true },
        { key: 'OPENAI_API_KEY', desc: 'OpenAI API key for AI chat completion and marketing AI features', required: true },
        { key: 'NEXT_PUBLIC_SITE_URL', desc: 'Your production domain (e.g., https://yourdomain.com) — used for OAuth callbacks', required: true },
        { key: 'GEMINI_API_KEY', desc: 'Google Gemini API key (optional — only if Gemini AI features are used)', required: false },
        { key: 'ANTHROPIC_API_KEY', desc: 'Anthropic Claude API key', required: false },
        { key: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', desc: 'Google Analytics 4 Measurement ID', required: false },
        { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', desc: 'Stripe publishable key for payment features', required: false },
        { key: 'PERPLEXITY_API_KEY', desc: 'Perplexity AI API key', required: false },
      ]},
      { type: 'note', text: 'On EC2: store env vars in <code>/var/www/clientflow/.env</code> with <code>chmod 600</code>. On Amplify: use the Environment Variables panel in App Settings. NEVER expose <code>SUPABASE_SERVICE_ROLE_KEY</code> or <code>OPENAI_API_KEY</code> to the browser — they are server-side only (used only in <code>/api/*</code> routes).' },
    ],
  },
  {
    id: 'aws-05',
    icon: Database,
    color: '#f472b6',
    title: 'Database Migration — Supabase to AWS RDS (Optional)',
    content: [
      { type: 'para', text: 'You have two options for the database on AWS. Option 1 (Recommended): Keep Supabase as your database — it is already cloud-hosted and works perfectly from AWS. Only migrate to RDS if you have specific compliance or data residency requirements.' },
      { type: 'step', num: '1', text: 'Create an AWS RDS PostgreSQL 15 instance. Choose the same AWS region as your EC2. Enable Multi-AZ for production. Note the endpoint URL.' },
      { type: 'step', num: '2', text: 'Export your Supabase database: Go to Supabase Dashboard → Settings → Database → "Database Backups". Download the latest backup (.sql file).' },
      { type: 'step', num: '3', text: 'Import to RDS: psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d clientflow < backup.sql' },
      { type: 'step', num: '4', text: 'Run all Supabase migrations on RDS: Apply all SQL files in /supabase/migrations/ in chronological order (by filename timestamp).' },
      { type: 'step', num: '5', text: 'Update NEXT_PUBLIC_SUPABASE_URL to point to your RDS endpoint. Update NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY with new credentials.' },
      { type: 'step', num: '6', text: 'Re-apply all Row Level Security (RLS) policies. The migration files in /supabase/migrations/ contain all RLS definitions — run them on RDS.' },
      { type: 'warning', text: '⚠️ If you migrate away from Supabase, you lose Supabase Auth, Realtime, and Storage features. You will need to replace these with AWS Cognito (auth), AWS AppSync (realtime), and S3 (storage). Keeping Supabase as the database provider is strongly recommended.' },
    ],
  },
  {
    id: 'aws-06',
    icon: BookOpen,
    color: '#67e8f9',
    title: 'Debug Report Pages — AWS Compatibility',
    content: [
      { type: 'para', text: 'All debug report pages will work identically on AWS. No code changes are required.' },
      { type: 'list', items: [
        '✅ Debug pages use the Supabase JS client (createClient) — they connect to Supabase via HTTPS from the browser',
        '✅ The Supabase URL is injected via NEXT_PUBLIC_SUPABASE_URL — update it and all debug pages automatically point to the new DB',
        '✅ DB health checks (table row counts, accessibility checks) are standard Supabase queries — no platform dependency',
        '✅ PDF download feature uses browser window.open() and window.print() — works in any browser on any hosting platform',
        '✅ All /api/* routes are Next.js serverless functions — they run on EC2 (Node.js process) or Amplify (Lambda) without changes',
        '✅ The System Architecture page, all module debug tabs, and the Download PDF button require zero code changes for AWS',
      ]},
      { type: 'note', text: 'ℹ️ The only requirement: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY correctly in your AWS environment. All debug functionality flows from these two variables.' },
    ],
  },
  {
    id: 'aws-07',
    icon: Globe,
    color: '#fbbf24',
    title: 'Domain, HTTPS & CDN Setup',
    content: [
      { type: 'step', num: '1', text: 'Register or transfer your domain to Route 53 (AWS DNS) for easiest integration, or use any external DNS provider (GoDaddy, Cloudflare, etc.).' },
      { type: 'step', num: '2', text: 'For Amplify: Go to Amplify Console → Domain Management → Add Domain. Amplify auto-provisions an SSL certificate via AWS Certificate Manager (ACM). No manual SSL setup needed.' },
      { type: 'step', num: '3', text: "For EC2: Use Certbot (Let's Encrypt) for free SSL: sudo certbot --nginx -d yourdomain.com. Certbot auto-renews every 90 days." },
      { type: 'step', num: '4', text: 'Set up CloudFront CDN (optional but recommended): Create a CloudFront distribution pointing to your EC2 or Amplify URL. Enable HTTPS-only. Set cache behaviors for /public/* assets (long TTL) and /api/* (no cache).' },
      { type: 'step', num: '5', text: 'Update NEXT_PUBLIC_SITE_URL in your environment variables to your new production domain (e.g., https://yourdomain.com). This is critical for Supabase OAuth callbacks.' },
      { type: 'step', num: '6', text: 'In Supabase Dashboard → Authentication → URL Configuration: Add your new domain to "Site URL" and "Redirect URLs". This ensures login/logout redirects work correctly.' },
    ],
  },
  {
    id: 'aws-08',
    icon: Shield,
    color: '#f87171',
    title: 'Security Best Practices on AWS',
    content: [
      { type: 'list', items: [
        '🔒 Use AWS IAM roles — never hardcode AWS credentials in code or .env files',
        '🔒 Store secrets in AWS Secrets Manager or Parameter Store — not in .env files on EC2',
        '🔒 Enable VPC for EC2 — place RDS in a private subnet, only accessible from EC2',
        '🔒 Security Groups: EC2 should only accept traffic on ports 80/443 from the internet; port 22 (SSH) only from your IP',
        '🔒 Enable AWS WAF (Web Application Firewall) on CloudFront to block SQL injection, XSS attacks',
        '🔒 Enable AWS CloudTrail for audit logging of all API calls',
        '🔒 Enable AWS GuardDuty for threat detection',
        '🔒 Rotate API keys (OpenAI, Supabase) every 90 days',
        '🔒 NEXT_PUBLIC_SUPABASE_ANON_KEY has minimal permissions — it is exposed to the browser by design',
        '🔒 SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the browser — only used in /api/* server routes',
        '🔒 Enable MFA on your AWS root account and all IAM users',
        '🔒 Use HTTPS everywhere — redirect all HTTP → HTTPS in Nginx/Amplify',
      ]},
    ],
  },
  {
    id: 'aws-09',
    icon: Lock,
    color: '#34d399',
    title: 'Pre-Launch Checklist',
    content: [
      { type: 'checklist', items: [
        { done: false, text: 'All environment variables set correctly in AWS (Amplify env panel or EC2 .env file)' },
        { done: false, text: 'NEXT_PUBLIC_SITE_URL updated to production domain' },
        { done: false, text: 'Supabase Dashboard → Auth → URL Configuration updated with production domain' },
        { done: false, text: 'SSL certificate active and HTTPS working (test with browser padlock)' },
        { done: false, text: 'All /api/* routes tested and returning correct responses' },
        { done: false, text: 'Debug report pages load and show DB health (green status)' },
        { done: false, text: 'Login / Logout / OAuth flow tested end-to-end' },
        { done: false, text: 'Database migrations applied (all files in /supabase/migrations/ executed)' },
        { done: false, text: "RLS policies verified — each user only sees their company's data" },
        { done: false, text: 'OpenAI API key valid and AI features tested' },
        { done: false, text: 'PM2 or Amplify auto-restart configured (app restarts on crash/reboot)' },
        { done: false, text: 'CloudFront or CDN configured for static assets' },
        { done: false, text: 'AWS CloudWatch monitoring enabled for EC2 CPU/memory alerts' },
        { done: false, text: 'Database backup schedule configured (Supabase auto-backups or RDS automated backups)' },
        { done: false, text: 'Domain DNS propagated and resolving correctly (test with nslookup)' },
      ]},
    ],
  },
];

// ─── AWS Debug Check Definitions ─────────────────────────────────────────────

const AWS_CHECK_DEFS = [
  { id: 'aws-chk-01', category: 'Database Connectivity', check: 'Supabase connection reachable', table: 'clients', priority: 'critical' as const, suggestion: 'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correctly set in AWS environment variables. Test connectivity from your AWS server using curl.' },
  { id: 'aws-chk-02', category: 'Database Connectivity', check: 'Core tables accessible (leads)', table: 'leads', priority: 'critical' as const, suggestion: 'Verify RLS policies allow authenticated reads. Run: SELECT * FROM leads LIMIT 1 in Supabase SQL editor to confirm access.' },
  { id: 'aws-chk-03', category: 'Database Connectivity', check: 'Subscriptions table accessible', table: 'subscriptions', priority: 'high' as const, suggestion: 'Check RLS policies on subscriptions table. Ensure company_id filter is applied correctly.' },
  { id: 'aws-chk-04', category: 'Database Connectivity', check: 'Invoices/Billing table accessible', table: 'invoices', priority: 'high' as const, suggestion: 'Billing data is critical. Verify invoices table has correct RLS and is accessible post-migration.' },
  { id: 'aws-chk-05', category: 'Database Connectivity', check: 'Staff table accessible', table: 'staff', priority: 'high' as const, suggestion: 'Staff authentication depends on this table. Verify access and RLS policies before go-live.' },
  { id: 'aws-chk-06', category: 'Database Connectivity', check: 'Companies table accessible', table: 'companies', priority: 'critical' as const, suggestion: 'Multi-tenancy depends on companies table. If this fails, all module isolation breaks. Check RLS immediately.' },
  { id: 'aws-chk-07', category: 'Module Health', check: 'Marketing campaigns table', table: 'campaigns', priority: 'medium' as const, suggestion: 'Marketing module will be non-functional if campaigns table is inaccessible. Verify RLS policies.' },
  { id: 'aws-chk-08', category: 'Module Health', check: 'Support tickets table', table: 'support_tickets', priority: 'medium' as const, suggestion: 'Support module depends on this table. Ensure tickets can be created and read by authenticated users.' },
  { id: 'aws-chk-09', category: 'Module Health', check: 'Tasks table accessible', table: 'tasks', priority: 'medium' as const, suggestion: 'Task management will fail if this table is inaccessible. Check company_id RLS enforcement.' },
  { id: 'aws-chk-10', category: 'Module Health', check: 'Plans table accessible', table: 'plans', priority: 'high' as const, suggestion: 'Subscription plan selection depends on this table. Verify plans are readable by all authenticated users.' },
  { id: 'aws-chk-11', category: 'AI Integration', check: 'AI insights logs table', table: 'ai_insights_logs', priority: 'low' as const, suggestion: 'AI features log to this table. If inaccessible, AI insights will fail silently. Check RLS policies.' },
  { id: 'aws-chk-12', category: 'AI Integration', check: 'AI autonomous actions table', table: 'ai_autonomous_actions', priority: 'low' as const, suggestion: 'Shaarvik AI autonomous system depends on this table. Verify write permissions for the service role.' },
  { id: 'aws-chk-13', category: 'Module Health', check: 'Creatives table accessible', table: 'creatives', priority: 'medium' as const, suggestion: 'Campaign creatives upload will fail if this table is inaccessible. Check storage bucket permissions too.' },
  { id: 'aws-chk-14', category: 'Module Health', check: 'Campaign creatives junction table', table: 'campaign_creatives', priority: 'low' as const, suggestion: 'Campaign-creative associations depend on this table. Verify foreign key constraints are intact post-migration.' },
];

// ─── Severity helpers ─────────────────────────────────────────────────────────

const severityConfig = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: XCircle, label: 'Critical' },
  warning: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', icon: AlertTriangle, label: 'Warning' },
  info: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', icon: Info, label: 'Info' },
  ok: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', icon: CheckCircle, label: 'OK' },
};

const connectionTypeConfig = {
  primary: { color: '#60a5fa', label: 'Primary Flow' },
  secondary: { color: '#a78bfa', label: 'Secondary Link' },
  data: { color: '#34d399', label: 'Data Feed' },
};

const priorityConfig = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', label: 'CRITICAL' },
  high: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.3)', label: 'HIGH' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', label: 'MEDIUM' },
  low: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)', label: 'LOW' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SystemArchitecturePage() {
  const [dbChecks, setDbChecks] = useState<DebugCheck[]>(
    DB_CHECKS.map((c) => ({ id: c.id, module: c.module, check: c.check, status: 'checking', detail: 'Running…' }))
  );
  const [awsChecks, setAwsChecks] = useState<AWSCheck[]>(
    AWS_CHECK_DEFS.map((c) => ({
      id: c.id,
      category: c.category,
      check: c.check,
      status: 'checking',
      detail: 'Running live check…',
      suggestion: c.suggestion,
      priority: c.priority,
    }))
  );
  const [refreshing, setRefreshing] = useState(false);
  const [awsRefreshing, setAwsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [awsLastRefreshed, setAwsLastRefreshed] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'architecture' | 'debug' | 'aws'>('architecture');
  const [awsSubTab, setAwsSubTab] = useState<'guide' | 'debug'>('guide');

  const runChecks = async () => {
    setRefreshing(true);
    const supabase = createClient();
    const results: DebugCheck[] = [];

    for (const check of DB_CHECKS) {
      try {
        const { count, error } = await supabase
          .from(check.table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({
            id: check.id,
            module: check.module,
            check: check.check,
            status: 'error',
            detail: error.message,
            rowCount: null,
          });
        } else {
          results.push({
            id: check.id,
            module: check.module,
            check: check.check,
            status: 'ok',
            detail: `Accessible — ${count ?? 0} rows`,
            rowCount: count,
          });
        }
      } catch (e: unknown) {
        results.push({
          id: check.id,
          module: check.module,
          check: check.check,
          status: 'error',
          detail: e instanceof Error ? e.message : 'Unknown error',
          rowCount: null,
        });
      }
    }

    setDbChecks(results);
    setLastRefreshed(new Date().toLocaleTimeString());
    setRefreshing(false);
  };

  const runAwsChecks = async () => {
    setAwsRefreshing(true);
    const supabase = createClient();
    const results: AWSCheck[] = [];

    for (const checkDef of AWS_CHECK_DEFS) {
      try {
        const start = Date.now();
        const { count, error } = await supabase
          .from(checkDef.table)
          .select('*', { count: 'exact', head: true });
        const latency = Date.now() - start;

        if (error) {
          results.push({
            id: checkDef.id,
            category: checkDef.category,
            check: checkDef.check,
            status: 'error',
            detail: `❌ Error: ${error.message}`,
            suggestion: checkDef.suggestion,
            priority: checkDef.priority,
          });
        } else {
          const latencyStatus = latency > 2000 ? 'warning' : 'ok';
          results.push({
            id: checkDef.id,
            category: checkDef.category,
            check: checkDef.check,
            status: latencyStatus,
            detail: latencyStatus === 'warning'
              ? `⚠️ Slow response: ${latency}ms — ${count ?? 0} rows (consider AWS region proximity)`
              : `✅ OK — ${count ?? 0} rows — ${latency}ms latency`,
            suggestion: latencyStatus === 'warning'
              ? `Response time ${latency}ms exceeds 2s threshold. Deploy your AWS server in the same region as your Supabase project to reduce latency. Consider enabling Supabase connection pooling.`
              : checkDef.suggestion,
            priority: checkDef.priority,
          });
        }
      } catch (e: unknown) {
        results.push({
          id: checkDef.id,
          category: checkDef.category,
          check: checkDef.check,
          status: 'error',
          detail: `❌ Connection failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
          suggestion: checkDef.suggestion,
          priority: checkDef.priority,
        });
      }
    }

    setAwsChecks(results);
    setAwsLastRefreshed(new Date().toLocaleTimeString());
    setAwsRefreshing(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  useEffect(() => {
    if (activeTab === 'aws' && awsSubTab === 'debug') {
      runAwsChecks();
    }
  }, [activeTab, awsSubTab]);

  const okCount = dbChecks.filter((c) => c.status === 'ok').length;
  const errCount = dbChecks.filter((c) => c.status === 'error').length;
  const criticalIssues = ARCH_ISSUES.filter((i) => i.severity === 'critical').length;
  const warningIssues = ARCH_ISSUES.filter((i) => i.severity === 'warning').length;

  const awsOkCount = awsChecks.filter((c) => c.status === 'ok').length;
  const awsWarnCount = awsChecks.filter((c) => c.status === 'warning').length;
  const awsErrCount = awsChecks.filter((c) => c.status === 'error').length;
  const awsReadinessScore = awsChecks.length > 0
    ? Math.round(((awsOkCount + awsWarnCount * 0.5) / awsChecks.length) * 100)
    : 0;

  // Group AWS checks by category
  const awsChecksByCategory = awsChecks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, AWSCheck[]>);

  // Generate analysis and suggestions from live results
  const awsAnalysis = [
    {
      id: 'ana-01',
      icon: Database,
      color: '#60a5fa',
      title: 'Database Connectivity Analysis',
      findings: awsChecks
        .filter((c) => c.category === 'Database Connectivity')
        .map((c) => ({
          status: c.status,
          text: c.status === 'ok'
            ? `${c.check}: Connected successfully`
            : c.status === 'warning'
            ? `${c.check}: Connected but slow — ${c.detail}`
            : `${c.check}: FAILED — ${c.detail}`,
        })),
      suggestion: awsChecks.filter((c) => c.category === 'Database Connectivity' && c.status === 'error').length > 0
        ? 'Critical: One or more database tables are inaccessible. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in your AWS environment. Check Supabase project status at supabase.com/dashboard.'
        : awsChecks.filter((c) => c.category === 'Database Connectivity' && c.status === 'warning').length > 0
        ? 'Performance: Some queries are slow. Deploy your AWS server in the same region as your Supabase project (check Supabase Dashboard → Settings → General for your project region). Enable Supabase connection pooling (PgBouncer) for production.' :'All database connections are healthy. Your app is ready for AWS deployment from a database connectivity standpoint.',
    },
    {
      id: 'ana-02',
      icon: Package,
      color: '#a78bfa',
      title: 'Module Health Analysis',
      findings: awsChecks
        .filter((c) => c.category === 'Module Health')
        .map((c) => ({
          status: c.status,
          text: c.status === 'ok'
            ? `${c.check}: Healthy`
            : c.status === 'warning'
            ? `${c.check}: Degraded performance`
            : `${c.check}: UNAVAILABLE`,
        })),
      suggestion: awsChecks.filter((c) => c.category === 'Module Health' && c.status === 'error').length > 0
        ? 'One or more module tables are inaccessible. Run all migration files in /supabase/migrations/ in order. Verify RLS policies are applied. Check Supabase logs for permission errors.' :'All module tables are accessible. Verify each module works end-to-end after deploying to AWS by testing create/read/update operations.',
    },
    {
      id: 'ana-03',
      icon: Zap,
      color: '#34d399',
      title: 'AI Integration Analysis',
      findings: awsChecks
        .filter((c) => c.category === 'AI Integration')
        .map((c) => ({
          status: c.status,
          text: c.status === 'ok'
            ? `${c.check}: Operational`
            : c.status === 'warning'
            ? `${c.check}: Slow response`
            : `${c.check}: FAILED`,
        })),
      suggestion: awsChecks.filter((c) => c.category === 'AI Integration' && c.status === 'error').length > 0
        ? 'AI tables are inaccessible. Ensure OPENAI_API_KEY is set in AWS environment. Verify ai_insights_logs and ai_autonomous_actions tables exist and have correct RLS policies.' :'AI integration tables are accessible. Ensure OPENAI_API_KEY is set in your AWS environment variables. Test the /api/ai/chat-completion endpoint after deployment.',
    },
  ];

  // ─── Architecture PDF Download ─────────────────────────────────────────────

  const handleDownloadPDF = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>ClientFlow — System Architecture & Debug Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 32px; }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 24px; }
  h2 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 24px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  h3 { font-size: 13px; font-weight: 600; color: #334155; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 7px 10px; text-align: left; border: 1px solid #e2e8f0; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  .ok { color: #16a34a; font-weight: 600; }
  .error { color: #dc2626; font-weight: 600; }
  .warning { color: #d97706; font-weight: 600; }
  .info { color: #2563eb; font-weight: 600; }
  .critical { color: #dc2626; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-ok { background: #dcfce7; color: #16a34a; }
  .badge-error { background: #fee2e2; color: #dc2626; }
  .badge-critical { background: #fee2e2; color: #dc2626; }
  .badge-warning { background: #fef3c7; color: #d97706; }
  .badge-info { background: #dbeafe; color: #2563eb; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .val { font-size: 24px; font-weight: 700; }
  .summary-card .lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
  .issue-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
  .issue-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
  .issue-meta { font-size: 10px; color: #64748b; margin-bottom: 6px; }
  .issue-desc { font-size: 11px; color: #475569; margin-bottom: 4px; }
  .issue-fix { font-size: 11px; color: #16a34a; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>ClientFlow — System Architecture &amp; Debug Report</h1>
<p class="subtitle">Generated: ${new Date().toLocaleString()} | ⚠️ TEMPORARY MODULE — for development use only</p>

<div class="summary-grid">
  <div class="summary-card"><div class="val" style="color:#16a34a">${okCount}</div><div class="lbl">DB Tables OK</div></div>
  <div class="summary-card"><div class="val" style="color:#dc2626">${errCount}</div><div class="lbl">DB Errors</div></div>
  <div class="summary-card"><div class="val" style="color:#dc2626">${criticalIssues}</div><div class="lbl">Critical Issues</div></div>
  <div class="summary-card"><div class="val" style="color:#d97706">${warningIssues}</div><div class="lbl">Warnings</div></div>
</div>

<h2>Module Overview</h2>
<table>
  <tr><th>Module</th><th>Route</th><th>Description</th></tr>
  ${MODULES.map((m) => `<tr><td><strong>${m.label}</strong></td><td>${m.route}</td><td>${m.description}</td></tr>`).join('')}
</table>

<h2>Inter-Module Connection Map</h2>
<table>
  <tr><th>From</th><th>To</th><th>Connection</th><th>Type</th></tr>
  ${CONNECTIONS.map((c) => `<tr><td>${c.from}</td><td>${c.to}</td><td>${c.label}</td><td><span class="badge badge-${c.type === 'primary' ? 'ok' : c.type === 'secondary' ? 'info' : 'warning'}">${c.type}</span></td></tr>`).join('')}
</table>

<h2>Database Health Check</h2>
<table>
  <tr><th>ID</th><th>Module</th><th>Table</th><th>Status</th><th>Detail</th></tr>
  ${dbChecks.map((c) => `<tr><td>${c.id}</td><td>${c.module}</td><td>${c.check}</td><td><span class="badge badge-${c.status}">${c.status.toUpperCase()}</span></td><td>${c.detail}</td></tr>`).join('')}
</table>

<h2>Architecture Issues &amp; Recommendations</h2>
${ARCH_ISSUES.map((issue) => `
<div class="issue-block">
  <div class="issue-title"><span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span> &nbsp;[${issue.id}] ${issue.title}</div>
  <div class="issue-meta">Module: ${issue.module}</div>
  <div class="issue-desc">${issue.description}</div>
  <div class="issue-fix">✅ Fix: ${issue.fix}</div>
</div>`).join('')}

<p style="margin-top:32px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px;">
  This report is auto-generated from live Supabase data. This module is temporary and will be removed before production release.
</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  // ─── AWS Debug Report PDF Download ────────────────────────────────────────

  const handleDownloadAWSDebugPDF = () => {
    const ts = new Date().toLocaleString();
    const readinessColor = awsReadinessScore >= 80 ? '#16a34a' : awsReadinessScore >= 50 ? '#d97706' : '#dc2626';
    const readinessLabel = awsReadinessScore >= 80 ? 'READY' : awsReadinessScore >= 50 ? 'NEEDS ATTENTION' : 'NOT READY';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>ClientFlow — AWS Deployment Debug Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 36px; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 6px; }
  .tagline { font-size: 11px; color: #94a3b8; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; }
  h2 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 24px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  h3 { font-size: 13px; font-weight: 600; color: #334155; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 7px 10px; text-align: left; border: 1px solid #e2e8f0; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; color: #334155; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-ok { background: #dcfce7; color: #16a34a; }
  .badge-warning { background: #fef3c7; color: #d97706; }
  .badge-error { background: #fee2e2; color: #dc2626; }
  .badge-critical { background: #fee2e2; color: #dc2626; }
  .badge-high { background: #ffedd5; color: #c2410c; }
  .badge-medium { background: #fef3c7; color: #d97706; }
  .badge-low { background: #dbeafe; color: #2563eb; }
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .val { font-size: 22px; font-weight: 700; }
  .summary-card .lbl { font-size: 10px; color: #64748b; margin-top: 2px; }
  .readiness-bar { background: #f1f5f9; border-radius: 8px; height: 12px; margin: 8px 0; overflow: hidden; }
  .readiness-fill { height: 100%; border-radius: 8px; background: ${readinessColor}; width: ${awsReadinessScore}%; }
  .analysis-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
  .analysis-title { font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
  .finding { display: flex; gap: 8px; margin-bottom: 5px; font-size: 11px; }
  .suggestion-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; margin-top: 10px; font-size: 11px; color: #166534; }
  .suggestion-box.warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
  .suggestion-box.err { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 10px; color: #0f172a; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>ClientFlow — AWS Deployment Debug Report</h1>
<p class="subtitle">Live database connectivity &amp; module health analysis for AWS deployment</p>
<p class="tagline">Generated: ${ts} &nbsp;|&nbsp; Next.js 15 + Supabase + OpenAI &nbsp;|&nbsp; Confidential — Internal Use Only</p>

<h2>Deployment Readiness Summary</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="val" style="color:${readinessColor}">${awsReadinessScore}%</div><div class="lbl">Readiness Score</div></div>
  <div class="summary-card"><div class="val" style="color:#16a34a">${awsOkCount}</div><div class="lbl">Checks Passed</div></div>
  <div class="summary-card"><div class="val" style="color:#d97706">${awsWarnCount}</div><div class="lbl">Warnings</div></div>
  <div class="summary-card"><div class="val" style="color:#dc2626">${awsErrCount}</div><div class="lbl">Failures</div></div>
  <div class="summary-card"><div class="val" style="color:${readinessColor}">${readinessLabel}</div><div class="lbl">Status</div></div>
</div>
<div class="readiness-bar"><div class="readiness-fill"></div></div>
<p style="font-size:11px; color:#64748b; margin-bottom:20px;">Readiness score: ${awsOkCount} passed + ${awsWarnCount} warnings (×0.5) out of ${awsChecks.length} total checks</p>

<h2>Live Check Results by Category</h2>
${Object.entries(awsChecksByCategory).map(([category, checks]) => `
<h3>${category}</h3>
<table>
  <tr><th>Check</th><th>Priority</th><th>Status</th><th>Detail</th></tr>
  ${checks.map((c) => `
  <tr>
    <td><strong>${c.check}</strong></td>
    <td><span class="badge badge-${c.priority}">${c.priority.toUpperCase()}</span></td>
    <td><span class="badge badge-${c.status}">${c.status.toUpperCase()}</span></td>
    <td>${c.detail}</td>
  </tr>`).join('')}
</table>`).join('')}

<h2>Analysis &amp; Recommendations</h2>
${awsAnalysis.map((ana) => {
  const hasErrors = ana.findings.some((f) => f.status === 'error');
  const hasWarnings = ana.findings.some((f) => f.status === 'warning');
  const allOk = !hasErrors && !hasWarnings;
  const sev = hasErrors ? severityConfig['critical'] : hasWarnings ? severityConfig['warning'] : severityConfig['ok'];
  const SevIcon = sev.icon;
  return `
<div class="analysis-block">
  <div class="analysis-title">${ana.title}</div>
  ${ana.findings.map((f) => `
  <div class="finding">
    <span>${f.status === 'ok' ? '✅' : f.status === 'warning' ? '⚠️' : '❌'}</span>
    <span>${f.text}</span>
  </div>`).join('')}
  <div class="suggestion-box ${allOk ? 'ok' : hasErrors ? 'err' : 'warn'}">
    <strong>Recommendation:</strong> ${ana.suggestion}
  </div>
</div>`;
}).join('')}

<h2>Detailed Suggestions per Failed/Warning Check</h2>
<table>
  <tr><th>Check</th><th>Status</th><th>Priority</th><th>Action Required</th></tr>
  ${awsChecks.filter((c) => c.status !== 'ok').map((c) => `
  <tr>
    <td><strong>${c.check}</strong></td>
    <td><span class="badge badge-${c.status}">${c.status.toUpperCase()}</span></td>
    <td><span class="badge badge-${c.priority}">${c.priority.toUpperCase()}</span></td>
    <td>${c.suggestion}</td>
  </tr>`).join('')}
  ${awsChecks.filter((c) => c.status !== 'ok').length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#16a34a; font-weight:600;">✅ All checks passed — no action required</td></tr>' : ''}
</table>

<h2>Next Steps Before AWS Go-Live</h2>
<table>
  <tr><th>#</th><th>Action</th><th>Priority</th></tr>
  <tr><td>1</td><td>Set all required environment variables in AWS Amplify or EC2 .env file</td><td><span class="badge badge-critical">CRITICAL</span></td></tr>
  <tr><td>2</td><td>Update NEXT_PUBLIC_SITE_URL to your production domain</td><td><span class="badge badge-critical">CRITICAL</span></td></tr>
  <tr><td>3</td><td>Update Supabase Auth → URL Configuration with production domain</td><td><span class="badge badge-critical">CRITICAL</span></td></tr>
  <tr><td>4</td><td>Run all migration files in /supabase/migrations/ in chronological order</td><td><span class="badge badge-high">HIGH</span></td></tr>
  <tr><td>5</td><td>Test login/logout/OAuth flow end-to-end on production domain</td><td><span class="badge badge-high">HIGH</span></td></tr>
  <tr><td>6</td><td>Verify all /api/* routes return correct responses</td><td><span class="badge badge-high">HIGH</span></td></tr>
  <tr><td>7</td><td>Enable SSL/HTTPS and verify browser padlock is green</td><td><span class="badge badge-high">HIGH</span></td></tr>
  <tr><td>8</td><td>Configure PM2 auto-restart (EC2) or verify Amplify auto-deploy</td><td><span class="badge badge-medium">MEDIUM</span></td></tr>
  <tr><td>9</td><td>Set up AWS CloudWatch monitoring for CPU/memory alerts</td><td><span class="badge badge-medium">MEDIUM</span></td></tr>
  <tr><td>10</td><td>Configure database backup schedule</td><td><span class="badge badge-medium">MEDIUM</span></td></tr>
</table>

<div class="footer">
  ClientFlow — AWS Deployment Debug Report &nbsp;|&nbsp; Generated: ${ts} &nbsp;|&nbsp; Confidential — Internal Use Only<br/>
  This report reflects live database connectivity checks run at the time of generation. Re-run after any infrastructure changes.
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    }
  };

  // ─── AWS Guide PDF Download ────────────────────────────────────────────────

  const handleDownloadAWSPDF = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>ClientFlow — AWS Cloud Deployment Guide</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 36px; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 6px; }
  .tagline { font-size: 11px; color: #94a3b8; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
  h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 28px 0 10px; padding: 8px 12px; border-left: 4px solid #f59e0b; background: #fffbeb; border-radius: 0 6px 6px 0; }
  h3 { font-size: 13px; font-weight: 600; color: #334155; margin: 14px 0 6px; }
  p { margin-bottom: 10px; color: #475569; }
  ul { margin: 8px 0 12px 20px; }
  li { margin-bottom: 5px; color: #475569; }
  .step { display: flex; gap: 12px; margin-bottom: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
  .step-num { background: #3b82f6; color: #fff; font-weight: 700; font-size: 11px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .step-text { flex: 1; white-space: pre-line; color: #334155; }
  .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; margin: 10px 0; color: #1d4ed8; font-size: 11px; }
  .warning { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 12px; margin: 10px 0; color: #c2410c; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0 16px; }
  th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 8px 10px; text-align: left; border: 1px solid #e2e8f0; }
  td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; color: #334155; }
  .req-yes { color: #16a34a; font-weight: 600; }
  .req-no { color: #94a3b8; }
  .check-item { display: flex; gap: 8px; margin-bottom: 7px; align-items: flex-start; }
  .check-box { width: 14px; height: 14px; border: 2px solid #94a3b8; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  .check-text { flex: 1; color: #475569; }
  .compat-ok { color: #16a34a; font-weight: 600; }
  .section-intro { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 14px; color: #475569; }
  .page-break { page-break-before: always; }
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 10px; color: #0f172a; }
  .toc { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
  .toc h3 { margin-top: 0; margin-bottom: 10px; color: #0f172a; }
  .toc ol { margin-left: 18px; }
  .toc li { margin-bottom: 4px; color: #3b82f6; }
</style>
</head>
<body>
<h1>ClientFlow — AWS Cloud Deployment Guide</h1>
<p class="subtitle">Complete step-by-step instructions for hosting on AWS</p>
<p class="tagline">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Next.js 15 + Supabase + OpenAI &nbsp;|&nbsp; Confidential — Internal Use Only</p>

<div class="toc">
  <h3>Table of Contents</h3>
  <ol>
    <li>AWS Compatibility Overview</li>
    <li>Option A — AWS Amplify (Recommended)</li>
    <li>Option B — AWS EC2 (Full Control)</li>
    <li>Environment Variables — Complete List</li>
    <li>Database Migration — Supabase to AWS RDS</li>
    <li>Debug Report Pages — AWS Compatibility</li>
    <li>Domain, HTTPS &amp; CDN Setup</li>
    <li>Security Best Practices</li>
    <li>Pre-Launch Checklist</li>
  </ol>
</div>

<h2>1. AWS Compatibility Overview</h2>
<div class="section-intro">This application is a <strong>Next.js 15 (App Router) + Supabase + OpenAI</strong> stack. Fully compatible with AWS cloud hosting.</div>
<ul>
  <li><span class="compat-ok">✅</span> Next.js App Router — fully portable, no platform lock-in</li>
  <li><span class="compat-ok">✅</span> Supabase client uses <code>NEXT_PUBLIC_SUPABASE_URL</code> — just update the env var</li>
  <li><span class="compat-ok">✅</span> All API routes (<code>/api/*</code>) are standard Next.js serverless functions</li>
  <li><span class="compat-ok">✅</span> Debug report pages query Supabase via the JS client — work anywhere</li>
  <li><span class="compat-ok">✅</span> OpenAI integration uses server-side API routes — key stays in env vars</li>
  <li><span class="compat-ok">✅</span> Static assets served from <code>/public</code> — compatible with S3 + CloudFront</li>
</ul>

<h2>2. Option A — AWS Amplify (Recommended)</h2>
<div class="step"><div class="step-num">1</div><div class="step-text">Go to AWS Console → AWS Amplify → "New App" → "Host web app".</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Connect your Git repository. Select the branch to deploy (e.g., main).</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Amplify auto-detects Next.js. Build command: npm run build | Output: .next</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">In Amplify Console → App Settings → Environment Variables, add ALL variables from your .env file.</div></div>
<div class="step"><div class="step-num">5</div><div class="step-text">Click "Save and Deploy". You get a *.amplifyapp.com URL immediately.</div></div>
<div class="step"><div class="step-num">6</div><div class="step-text">Custom domain: Amplify Console → Domain Management → Add Domain.</div></div>
<div class="note">ℹ️ AWS Amplify natively supports Next.js SSR, API routes, and middleware.</div>

<h2 class="page-break">3. Option B — AWS EC2</h2>
<div class="step"><div class="step-num">1</div><div class="step-text">Launch EC2: Ubuntu 22.04 LTS, t3.medium. Open ports 22, 80, 443.</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Install Node.js 20 LTS: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Install PM2: sudo npm install -g pm2</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Clone repo: git clone https://github.com/your-org/your-repo.git /var/www/clientflow && cd /var/www/clientflow && npm install</div></div>
<div class="step"><div class="step-num">5</div><div class="step-text">Create .env: nano /var/www/clientflow/.env — paste all env vars. chmod 600 .env</div></div>
<div class="step"><div class="step-num">6</div><div class="step-text">Build: npm run build</div></div>
<div class="step"><div class="step-num">7</div><div class="step-text">Start: pm2 start npm --name "clientflow" -- start && pm2 save && pm2 startup</div></div>
<div class="step"><div class="step-num">8</div><div class="step-text">Configure Nginx reverse proxy to localhost:3000. Enable site. sudo nginx -t && sudo systemctl reload nginx</div></div>
<div class="step"><div class="step-num">9</div><div class="step-text">SSL: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.com</div></div>

<h2 class="page-break">4. Environment Variables</h2>
<table>
  <tr><th>Variable</th><th>Required</th><th>Description</th></tr>
  <tr><td><code>NEXT_PUBLIC_SUPABASE_URL</code></td><td class="req-yes">Required</td><td>Supabase project URL</td></tr>
  <tr><td><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></td><td class="req-yes">Required</td><td>Supabase anonymous key</td></tr>
  <tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td class="req-yes">Required</td><td>Service role key (server-side only)</td></tr>
  <tr><td><code>OPENAI_API_KEY</code></td><td class="req-yes">Required</td><td>OpenAI API key</td></tr>
  <tr><td><code>NEXT_PUBLIC_SITE_URL</code></td><td class="req-yes">Required</td><td>Production domain for OAuth callbacks</td></tr>
  <tr><td><code>GEMINI_API_KEY</code></td><td class="req-no">Optional</td><td>Google Gemini API key</td></tr>
  <tr><td><code>ANTHROPIC_API_KEY</code></td><td class="req-no">Optional</td><td>Anthropic Claude key</td></tr>
  <tr><td><code>NEXT_PUBLIC_GA_MEASUREMENT_ID</code></td><td class="req-no">Optional</td><td>Google Analytics 4 ID</td></tr>
  <tr><td><code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code></td><td class="req-no">Optional</td><td>Stripe publishable key</td></tr>
</table>

<h2>9. Pre-Launch Checklist</h2>
${AWS_SECTIONS[8].content[0].items?.map((item: {done: boolean; text: string}) => `<div class="check-item"><div class="check-box"></div><div class="check-text">${item.text}</div></div>`).join('') ?? ''}

<div class="footer">
  ClientFlow — AWS Cloud Deployment Guide &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Confidential — Internal Use Only
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#060d1a', color: '#e2e8f0' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(6,13,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            <Network size={18} style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-white">System Architecture</h1>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
              >
                TEMP MODULE
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Inter-module connection map &amp; live debug analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {lastRefreshed && (
            <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Last checked: {lastRefreshed}
            </span>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            <ArrowLeft size={13} />
            Back to Dashboard
          </Link>
          <button
            onClick={runChecks}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          {activeTab === 'aws' && awsSubTab === 'debug' ? (
            <button
              onClick={handleDownloadAWSDebugPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
            >
              <Download size={13} />
              Download Debug Report PDF
            </button>
          ) : activeTab === 'aws' ? (
            <button
              onClick={handleDownloadAWSPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}
            >
              <Download size={13} />
              Download AWS Guide PDF
            </button>
          ) : (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              <Download size={13} />
              Download PDF
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Warning Banner */}
        <div
          className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <AlertTriangle size={16} style={{ color: '#fbbf24', marginTop: 1, flexShrink: 0 }} />
          <p className="text-[12px]" style={{ color: 'rgba(251,191,36,0.85)' }}>
            <strong>Temporary Development Module</strong> — This page is for internal architecture review and debugging only. It will be removed before production release.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Modules', value: MODULES.length, color: '#60a5fa', icon: Network },
            { label: 'Connections', value: CONNECTIONS.length, color: '#a78bfa', icon: Link2 },
            { label: 'DB Tables OK', value: okCount, color: '#34d399', icon: Database },
            { label: 'Critical Issues', value: criticalIssues, color: '#f87171', icon: AlertCircle },
          ].map((card) => {
            const CardIcon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>{card.label}</span>
                  <CardIcon size={14} style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { id: 'architecture', label: 'Architecture Map', icon: Network },
            { id: 'debug', label: 'Debug Analysis', icon: Database },
            { id: 'aws', label: 'AWS Deployment', icon: Cloud },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'architecture' | 'debug' | 'aws')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
                style={
                  isActive
                    ? { background: tab.id === 'aws' ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.15)', color: tab.id === 'aws' ? '#60a5fa' : '#fbbf24', border: `1px solid ${tab.id === 'aws' ? 'rgba(96,165,250,0.25)' : 'rgba(251,191,36,0.25)'}` }
                    : { color: 'rgba(148,163,184,0.6)' }
                }
              >
                <TabIcon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Architecture Tab ── */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            {/* Module Grid */}
            <div>
              <h2 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                <Network size={14} style={{ color: '#fbbf24' }} />
                All Modules
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {MODULES.map((mod) => {
                  const ModIcon = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      className="rounded-xl p-4"
                      style={{ background: mod.bg, border: `1px solid ${mod.border}` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <ModIcon size={15} style={{ color: mod.color, flexShrink: 0 }} />
                        <span className="text-[13px] font-semibold" style={{ color: mod.color }}>{mod.label}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.7)' }}>{mod.description}</p>
                      <p className="text-[10px] mt-2 font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>{mod.route}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connection Map */}
            <div>
              <h2 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                <Link2 size={14} style={{ color: '#fbbf24' }} />
                Inter-Module Connection Map
              </h2>
              <div className="flex gap-4 mb-3 flex-wrap">
                {Object.entries(connectionTypeConfig).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
                    <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>{cfg.label}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>From</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}></th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>To</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Connection</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONNECTIONS.map((conn, idx) => {
                      const fromMod = MODULES.find((m) => m.id === conn.from);
                      const toMod = MODULES.find((m) => m.id === conn.to);
                      const typeCfg = connectionTypeConfig[conn.type];
                      return (
                        <tr
                          key={idx}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium" style={{ color: fromMod?.color || '#e2e8f0' }}>{fromMod?.label || conn.from}</span>
                          </td>
                          <td className="px-2 py-3">
                            <ArrowRight size={13} style={{ color: typeCfg.color }} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium" style={{ color: toMod?.color || '#e2e8f0' }}>{toMod?.label || conn.to}</span>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'rgba(148,163,184,0.75)' }}>{conn.label}</td>
                          <td className="px-4 py-3">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${typeCfg.color}18`, color: typeCfg.color, border: `1px solid ${typeCfg.color}40` }}
                            >
                              {conn.type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Architecture Issues */}
            <div>
              <h2 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle size={14} style={{ color: '#fbbf24' }} />
                Architecture Issues &amp; Recommendations
              </h2>
              <div className="space-y-3">
                {ARCH_ISSUES.map((issue) => {
                  const sev = severityConfig[issue.severity];
                  const SevIcon = sev.icon;
                  return (
                    <div
                      key={issue.id}
                      className="rounded-xl p-4"
                      style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                    >
                      <div className="flex items-start gap-3">
                        <SevIcon size={15} style={{ color: sev.color, flexShrink: 0, marginTop: 1 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${sev.color}18`, color: sev.color, border: `1px solid ${sev.color}40` }}
                            >
                              {sev.label}
                            </span>
                            <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>[{issue.id}]</span>
                            <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{issue.module}</span>
                          </div>
                          <p className="text-[13px] font-semibold text-white mb-1">{issue.title}</p>
                          <p className="text-[12px] mb-2" style={{ color: 'rgba(148,163,184,0.75)' }}>{issue.description}</p>
                          <div className="flex items-start gap-1.5">
                            <CheckCircle size={12} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }} />
                            <p className="text-[11px]" style={{ color: '#34d399' }}>{issue.fix}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Debug Tab ── */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            {/* DB Health */}
            <div>
              <h2 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                <Database size={14} style={{ color: '#fbbf24' }} />
                Live Database Health Check
              </h2>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>ID</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Module</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Table</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Status</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbChecks.map((check, idx) => {
                      const isOk = check.status === 'ok';
                      const isErr = check.status === 'error';
                      const isChecking = check.status === 'checking';
                      return (
                        <tr
                          key={check.id}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                        >
                          <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{check.id}</td>
                          <td className="px-4 py-3 font-medium text-white">{check.module}</td>
                          <td className="px-4 py-3 font-mono" style={{ color: 'rgba(148,163,184,0.75)' }}>{check.check}</td>
                          <td className="px-4 py-3">
                            {isChecking ? (
                              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#94a3b8' }}>
                                <RefreshCw size={11} className="animate-spin" /> Checking…
                              </span>
                            ) : (
                              <span
                                className="flex items-center gap-1.5 text-[11px] font-semibold"
                                style={{ color: isOk ? '#34d399' : isErr ? '#f87171' : '#fbbf24' }}
                              >
                                {isOk ? <CheckCircle size={12} /> : isErr ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                                {check.status.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'rgba(148,163,184,0.65)' }}>{check.detail}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Integration Points */}
            <div>
              <h2 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                <Zap size={14} style={{ color: '#fbbf24' }} />
                Key Integration Points
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Ad Webhook → Lead Pipeline',
                    status: 'warning',
                    items: [
                      'POST /api/webhooks/meta-ads → leads table',
                      'POST /api/webhooks/google-ads → leads table',
                      'POST /api/webhooks/linkedin-ads → leads table',
                      '⚠️ campaign_id not populated on webhook leads',
                    ],
                  },
                  {
                    title: 'Lead Conversion → Client + Subscription',
                    status: 'warning',
                    items: [
                      'POST /api/leads/convert → clients table',
                      '⚠️ No auto-subscription creation after conversion',
                      '⚠️ No auto-invoice generation after conversion',
                      'Manual plan assignment required',
                    ],
                  },
                  {
                    title: 'Subscription Renewal Engine',
                    status: 'warning',
                    items: [
                      'POST /api/reminders/schedule → schedules reminders',
                      'POST /api/reminders/process → sends email alerts',
                      '⚠️ No auto-invoice on renewal trigger',
                      'lib/services/renewalReminders.ts handles logic',
                    ],
                  },
                  {
                    title: 'Shaarvik AI Autonomous System',
                    status: 'ok',
                    items: [
                      'POST /api/marketing/shaarvik-ai → AI actions',
                      'ai_autonomous_actions table stores decisions',
                      'ai_approval_thresholds controls auto-approval',
                      'Fallback engine: shaarvik_fallback_patterns',
                    ],
                  },
                ].map((block) => {
                  const isOk = block.status === 'ok';
                  return (
                    <div
                      key={block.title}
                      className="rounded-xl p-4"
                      style={{
                        background: isOk ? 'rgba(52,211,153,0.05)' : 'rgba(251,191,36,0.05)',
                        border: `1px solid ${isOk ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {isOk ? <CheckCircle size={13} style={{ color: '#34d399' }} /> : <AlertTriangle size={13} style={{ color: '#fbbf24' }} />}
                        <span className="text-[12px] font-semibold text-white">{block.title}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {block.items.map((item, i) => (
                          <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: item.startsWith('⚠️') ? '#fbbf24' : 'rgba(148,163,184,0.7)' }}>
                            <span className="mt-0.5 flex-shrink-0">{item.startsWith('⚠️') ? '' : '•'}</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── AWS Deployment Tab ── */}
        {activeTab === 'aws' && (
          <div className="space-y-4">
            {/* AWS Sub-tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-fit mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[
                { id: 'guide', label: 'Deployment Guide', icon: BookOpen },
                { id: 'debug', label: 'Live Debug Report', icon: Activity },
              ].map((sub) => {
                const SubIcon = sub.icon;
                const isActive = awsSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setAwsSubTab(sub.id as 'guide' | 'debug')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={
                      isActive
                        ? { background: sub.id === 'debug' ? 'rgba(52,211,153,0.15)' : 'rgba(96,165,250,0.15)', color: sub.id === 'debug' ? '#34d399' : '#60a5fa', border: `1px solid ${sub.id === 'debug' ? 'rgba(52,211,153,0.25)' : 'rgba(96,165,250,0.25)'}` }
                        : { color: 'rgba(148,163,184,0.6)' }
                    }
                  >
                    <SubIcon size={13} />
                    {sub.label}
                  </button>
                );
              })}
            </div>

            {/* ── AWS Guide Sub-tab ── */}
            {awsSubTab === 'guide' && (
              <>
                {/* AWS Banner */}
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-xl mb-2"
                  style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
                >
                  <Cloud size={16} style={{ color: '#60a5fa', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: '#60a5fa' }}>AWS Cloud Deployment Guide</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      Complete instructions to host this Next.js + Supabase + OpenAI application on AWS. Click <strong style={{ color: '#60a5fa' }}>"Download AWS Guide PDF"</strong> in the header to save a printable copy.
                    </p>
                  </div>
                </div>

                {AWS_SECTIONS.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <div
                      key={section.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div
                        className="flex items-center gap-3 px-5 py-3"
                        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${section.color}18`, border: `1px solid ${section.color}30` }}
                        >
                          <SectionIcon size={14} style={{ color: section.color }} />
                        </div>
                        <h3 className="text-[13px] font-semibold text-white">{section.title}</h3>
                      </div>

                      <div className="px-5 py-4 space-y-3">
                        {section.content.map((block, bi) => {
                          if (block.type === 'para') {
                            return (
                              <p key={bi} className="text-[12px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.8)' }}>
                                {block.text}
                              </p>
                            );
                          }
                          if (block.type === 'list' && block.items) {
                            return (
                              <ul key={bi} className="space-y-1.5">
                                {block.items.map((item, ii) => (
                                  <li key={ii} className="text-[12px] flex items-start gap-2" style={{ color: 'rgba(148,163,184,0.8)' }}>
                                    <span className="flex-shrink-0 mt-0.5">{item.startsWith('✅') || item.startsWith('🔒') ? '' : '•'}</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            );
                          }
                          if (block.type === 'step') {
                            return (
                              <div key={bi} className="flex gap-3 items-start">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                                  style={{ background: 'rgba(96,165,250,0.2)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}
                                >
                                  {block.num}
                                </div>
                                <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: 'rgba(148,163,184,0.8)' }}>
                                  {block.text}
                                </p>
                              </div>
                            );
                          }
                          if (block.type === 'note') {
                            return (
                              <div
                                key={bi}
                                className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                                style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
                              >
                                <Info size={13} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 1 }} />
                                <p className="text-[11px]" style={{ color: 'rgba(96,165,250,0.9)' }}>{block.text}</p>
                              </div>
                            );
                          }
                          if (block.type === 'warning') {
                            return (
                              <div
                                key={bi}
                                className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                              >
                                <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                                <p className="text-[11px]" style={{ color: 'rgba(251,191,36,0.9)' }}>{block.text}</p>
                              </div>
                            );
                          }
                          if (block.type === 'envtable' && block.rows) {
                            return (
                              <div key={bi} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                      <th className="text-left px-3 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Variable</th>
                                      <th className="text-left px-3 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Required</th>
                                      <th className="text-left px-3 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {block.rows.map((row, ri) => (
                                      <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                                        <td className="px-3 py-2 font-mono" style={{ color: '#60a5fa' }}>{row.key}</td>
                                        <td className="px-3 py-2">
                                          <span
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                            style={row.required
                                              ? { background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }
                                              : { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }
                                            }
                                          >
                                            {row.required ? 'Required' : 'Optional'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2" style={{ color: 'rgba(148,163,184,0.7)' }}>{row.desc}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          }
                          if (block.type === 'checklist' && block.items) {
                            return (
                              <div key={bi} className="space-y-2">
                                {block.items.map((item, ii) => (
                                  <div key={ii} className="flex items-start gap-2.5">
                                    <div
                                      className="w-4 h-4 rounded flex-shrink-0 mt-0.5"
                                      style={{ border: '2px solid rgba(148,163,184,0.4)', background: 'transparent' }}
                                    />
                                    <p className="text-[12px]" style={{ color: 'rgba(148,163,184,0.8)' }}>{item.text}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── AWS Live Debug Report Sub-tab ── */}
            {awsSubTab === 'debug' && (
              <div className="space-y-5">
                {/* Banner */}
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
                >
                  <Activity size={16} style={{ color: '#34d399', marginTop: 1, flexShrink: 0 }} />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: '#34d399' }}>Live AWS Deployment Debug Report</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      Real-time connectivity checks, latency analysis, and deployment readiness assessment. Click <strong style={{ color: '#34d399' }}>"Download Debug Report PDF"</strong> to save a full report.
                      {awsLastRefreshed && <span style={{ color: 'rgba(148,163,184,0.5)' }}> — Last run: {awsLastRefreshed}</span>}
                    </p>
                  </div>
                  <button
                    onClick={runAwsChecks}
                    disabled={awsRefreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                  >
                    <RefreshCw size={12} className={awsRefreshing ? 'animate-spin' : ''} />
                    {awsRefreshing ? 'Running…' : 'Re-run Checks'}
                  </button>
                </div>

                {/* Readiness Score */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                      <Eye size={14} style={{ color: '#34d399' }} />
                      AWS Deployment Readiness Score
                    </h3>
                    <span
                      className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{
                        background: awsReadinessScore >= 80 ? 'rgba(52,211,153,0.15)' : awsReadinessScore >= 50 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                        color: awsReadinessScore >= 80 ? '#34d399' : awsReadinessScore >= 50 ? '#fbbf24' : '#f87171',
                        border: `1px solid ${awsReadinessScore >= 80 ? 'rgba(52,211,153,0.3)' : awsReadinessScore >= 50 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
                      }}
                    >
                      {awsReadinessScore >= 80 ? '✅ READY FOR AWS' : awsReadinessScore >= 50 ? '⚠️ NEEDS ATTENTION' : '❌ NOT READY'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-4xl font-bold" style={{ color: awsReadinessScore >= 80 ? '#34d399' : awsReadinessScore >= 50 ? '#fbbf24' : '#f87171' }}>
                      {awsReadinessScore}%
                    </span>
                    <div className="flex-1">
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${awsReadinessScore}%`,
                            background: awsReadinessScore >= 80 ? '#34d399' : awsReadinessScore >= 50 ? '#fbbf24' : '#f87171',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{awsOkCount} passed</span>
                        <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{awsWarnCount} warnings</span>
                        <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{awsErrCount} failed</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {[
                      { label: 'Checks Passed', value: awsOkCount, color: '#34d399' },
                      { label: 'Warnings', value: awsWarnCount, color: '#fbbf24' },
                      { label: 'Failures', value: awsErrCount, color: '#f87171' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Check Results by Category */}
                {Object.entries(awsChecksByCategory).map(([category, checks]) => (
                  <div key={category}>
                    <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                      {category === 'Database Connectivity' && <Database size={14} style={{ color: '#60a5fa' }} />}
                      {category === 'Module Health' && <Package size={14} style={{ color: '#a78bfa' }} />}
                      {category === 'AI Integration' && <Zap size={14} style={{ color: '#34d399' }} />}
                      {category}
                    </h3>
                    <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Check</th>
                            <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Priority</th>
                            <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Status</th>
                            <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Live Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checks.map((check, idx) => {
                            const isOk = check.status === 'ok';
                            const isWarn = check.status === 'warning';
                            const isErr = check.status === 'error';
                            const isChecking = check.status === 'checking';
                            const pCfg = priorityConfig[check.priority];
                            return (
                              <tr
                                key={check.id}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                              >
                                <td className="px-4 py-3 font-medium" style={{ color: '#e2e8f0' }}>{check.check}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.border}` }}
                                  >
                                    {pCfg.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {isChecking ? (
                                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#94a3b8' }}>
                                      <RefreshCw size={11} className="animate-spin" /> Checking…
                                    </span>
                                  ) : (
                                    <span
                                      className="flex items-center gap-1.5 text-[11px] font-semibold"
                                      style={{ color: isOk ? '#34d399' : isWarn ? '#fbbf24' : '#f87171' }}
                                    >
                                      {isOk ? <CheckCircle size={12} /> : isWarn ? <AlertTriangle size={12} /> : <XCircle size={12} />}
                                      {check.status.toUpperCase()}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[11px]" style={{ color: isErr ? '#f87171' : isWarn ? '#fbbf24' : 'rgba(148,163,184,0.65)' }}>
                                  {check.detail}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Analysis & Recommendations */}
                <div>
                  <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertCircle size={14} style={{ color: '#fbbf24' }} />
                    Analysis &amp; Recommendations
                  </h3>
                  <div className="space-y-3">
                    {awsAnalysis.map((ana) => {
                      const hasErrors = ana.findings.some((f) => f.status === 'error');
                      const hasWarnings = ana.findings.some((f) => f.status === 'warning');
                      const allOk = !hasErrors && !hasWarnings;
                      const sev = hasErrors ? severityConfig['critical'] : hasWarnings ? severityConfig['warning'] : severityConfig['ok'];
                      const SevIcon = sev.icon;
                      return (
                        <div
                          key={ana.id}
                          className="rounded-xl p-4"
                          style={{
                            background: hasErrors ? 'rgba(248,113,113,0.05)' : hasWarnings ? 'rgba(251,191,36,0.05)' : 'rgba(52,211,153,0.05)',
                            border: `1px solid ${hasErrors ? 'rgba(248,113,113,0.2)' : hasWarnings ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'}`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <SevIcon size={14} style={{ color: sev.color }} />
                            <span className="text-[13px] font-semibold text-white">{ana.title}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: allOk ? 'rgba(52,211,153,0.15)' : hasErrors ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                                color: allOk ? '#34d399' : hasErrors ? '#f87171' : '#fbbf24',
                                border: `1px solid ${allOk ? 'rgba(52,211,153,0.3)' : hasErrors ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`,
                              }}
                            >
                              {allOk ? '✅ All OK' : hasErrors ? '❌ Issues Found' : '⚠️ Warnings'}
                            </span>
                          </div>
                          <div className="space-y-1 mb-3">
                            {ana.findings.map((f) => (
                              <div key={f.text} className="flex items-start gap-2 text-[11px]" style={{ color: f.status === 'ok' ? '#34d399' : f.status === 'warning' ? '#fbbf24' : '#f87171' }}>
                                <span className="flex-shrink-0">{f.status === 'ok' ? '✅' : f.status === 'warning' ? '⚠️' : '❌'}</span>
                                <span>{f.text}</span>
                              </div>
                            ))}
                          </div>
                          <div
                            className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                            style={{
                              background: allOk ? 'rgba(52,211,153,0.08)' : hasErrors ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
                              border: `1px solid ${allOk ? 'rgba(52,211,153,0.2)' : hasErrors ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
                            }}
                          >
                            <Info size={12} style={{ color: allOk ? '#34d399' : hasErrors ? '#f87171' : '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                            <p className="text-[11px]" style={{ color: allOk ? 'rgba(52,211,153,0.9)' : hasErrors ? 'rgba(248,113,113,0.9)' : 'rgba(251,191,36,0.9)' }}>
                              <strong>Recommendation:</strong> {ana.suggestion}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Suggestions for Failed/Warning Checks */}
                {awsChecks.filter((c) => c.status !== 'ok' && c.status !== 'checking').length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                      <Key size={14} style={{ color: '#f87171' }} />
                      Action Required — Failed &amp; Warning Checks
                    </h3>
                    <div className="space-y-2">
                      {awsChecks
                        .filter((c) => c.status !== 'ok' && c.status !== 'checking')
                        .sort((a, b) => {
                          const order = { critical: 0, high: 1, medium: 2, low: 3 };
                          return order[a.priority] - order[b.priority];
                        })
                        .map((check) => {
                          const pCfg = priorityConfig[check.priority as keyof typeof priorityConfig];
                          const isErr = check.status === 'error';
                          return (
                            <div
                              key={check.id}
                              className="rounded-xl p-4"
                              style={{
                                background: isErr ? 'rgba(248,113,113,0.06)' : 'rgba(251,191,36,0.06)',
                                border: `1px solid ${isErr ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {isErr ? <XCircle size={13} style={{ color: '#f87171' }} /> : <AlertTriangle size={13} style={{ color: '#fbbf24' }} />}
                                <span className="text-[12px] font-semibold text-white">{check.check}</span>
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.border}` }}
                                >
                                  {pCfg.label}
                                </span>
                                <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{check.category}</span>
                              </div>
                              <p className="text-[11px] mb-2" style={{ color: isErr ? '#f87171' : '#fbbf24' }}>{check.detail}</p>
                              <div className="flex items-start gap-1.5">
                                <CheckCircle size={11} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }} />
                                <p className="text-[11px]" style={{ color: '#34d399' }}>{check.suggestion}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* All Checks Passed Banner */}
                {awsChecks.filter((c) => c.status !== 'ok' && c.status !== 'checking').length === 0 && awsChecks.filter((c) => c.status === 'ok').length > 0 && (
                  <div
                    className="flex items-center gap-3 px-5 py-4 rounded-xl"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}
                  >
                    <CheckCircle size={20} style={{ color: '#34d399', flexShrink: 0 }} />
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: '#34d399' }}>All {awsChecks.length} checks passed — Application is ready for AWS deployment</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(52,211,153,0.7)' }}>
                        Database connectivity, module health, and AI integration are all operational. Proceed with AWS deployment using the Deployment Guide tab.
                      </p>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                    <GitBranch size={14} style={{ color: '#60a5fa' }} />
                    Next Steps Before AWS Go-Live
                  </h3>
                  <div className="space-y-2">
                    {[
                      { priority: 'critical', text: 'Set all required environment variables in AWS Amplify or EC2 .env file' },
                      { priority: 'critical', text: 'Update NEXT_PUBLIC_SITE_URL to your production domain' },
                      { priority: 'critical', text: 'Update Supabase Auth → URL Configuration with production domain' },
                      { priority: 'high', text: 'Run all migration files in /supabase/migrations/ in chronological order' },
                      { priority: 'high', text: 'Test login/logout/OAuth flow end-to-end on production domain' },
                      { priority: 'high', text: 'Verify all /api/* routes return correct responses' },
                      { priority: 'high', text: 'Enable SSL/HTTPS and verify browser padlock is green' },
                      { priority: 'medium', text: 'Configure PM2 auto-restart (EC2) or verify Amplify auto-deploy' },
                      { priority: 'medium', text: 'Set up AWS CloudWatch monitoring for CPU/memory alerts' },
                      { priority: 'low', text: 'Configure database backup schedule (Supabase auto-backups or RDS)' },
                    ].map((step, i) => {
                      const pCfg = priorityConfig[step.priority as keyof typeof priorityConfig];
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                            style={{ background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.border}` }}
                          >
                            {pCfg.label}
                          </span>
                          <p className="text-[12px]" style={{ color: 'rgba(148,163,184,0.8)' }}>{step.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
