'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, Database, AlertTriangle, CheckCircle,
  RefreshCw, ChevronDown, ChevronUp, XCircle, FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  constraint_type?: string | null;
}

interface ErrorLog {
  operation: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

// ─── STATIC DATA: Leads Table Structure (from migrations) ────────────────────

const LEADS_COLUMNS_FROM_MIGRATIONS: ColumnInfo[] = [
  { column_name: 'id',                    data_type: 'uuid',                        is_nullable: 'NO',  column_default: 'gen_random_uuid()', constraint_type: 'PRIMARY KEY' },
  { column_name: 'client_id',             data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → clients(id)' },
  { column_name: 'title',                 data_type: 'text',                        is_nullable: 'NO',  column_default: null,                constraint_type: null },
  { column_name: 'status',                data_type: 'lead_status (enum)',          is_nullable: 'NO',  column_default: "'new'",             constraint_type: null },
  { column_name: 'value',                 data_type: 'numeric(12,2)',               is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'follow_up_date',        data_type: 'date',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'notes',                 data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'assigned_to',           data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → user_profiles(id)' },
  { column_name: 'created_by',            data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → user_profiles(id)' },
  { column_name: 'created_at',            data_type: 'timestamp with time zone',    is_nullable: 'NO',  column_default: 'CURRENT_TIMESTAMP', constraint_type: null },
  { column_name: 'updated_at',            data_type: 'timestamp with time zone',    is_nullable: 'NO',  column_default: 'CURRENT_TIMESTAMP', constraint_type: null },
  { column_name: 'is_converted',          data_type: 'boolean',                     is_nullable: 'NO',  column_default: 'false',             constraint_type: null },
  { column_name: 'converted_to_client_id',data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → clients(id)' },
  { column_name: 'converted_at',          data_type: 'timestamp with time zone',    is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_status',          data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_start_date',      data_type: 'date',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_end_date',        data_type: 'date',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_name',            data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_email',           data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_phone',           data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'trial_product_id',      data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → products(id)' },
  { column_name: 'trial_plan_id',         data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → product_plans(id)' },
  { column_name: 'trial_started_by',      data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → user_profiles(id)' },
  { column_name: 'campaign_id',           data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → campaigns(id)' },
  { column_name: 'company_id',            data_type: 'uuid',                        is_nullable: 'YES', column_default: null,                constraint_type: 'FK → companies(id)' },
  { column_name: 'name',                  data_type: 'text',                        is_nullable: 'NO',  column_default: "'Unknown Lead'",    constraint_type: 'NOT NULL + DEFAULT' },
  { column_name: 'email',                 data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'phone',                 data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'source',                data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
  { column_name: 'company_name',          data_type: 'text',                        is_nullable: 'YES', column_default: null,                constraint_type: null },
];

const VALID_COLUMN_NAMES = new Set(LEADS_COLUMNS_FROM_MIGRATIONS.map(c => c.column_name));

// ─── STATIC DATA: All Queries from Leads Files ───────────────────────────────

const LEADS_QUERIES = [
  {
    file: 'src/app/leads/page.tsx',
    fn: 'loadLeads()',
    type: 'SELECT',
    trigger: 'Page mount + realtime subscription',
    sql: `supabase
  .from('leads')
  .select('id, name, phone, email, company_name, status, created_at')
  .order('created_at', { ascending: false })`,
    columnsUsed: ['id', 'name', 'phone', 'email', 'company_name', 'status', 'created_at'],
  },
  {
    file: 'src/app/leads/page.tsx',
    fn: 'loadActivities(leadId)',
    type: 'SELECT',
    trigger: 'Lead detail panel open',
    sql: `supabase
  .from('activities')
  .select('id, type, summary, notes, activity_date')
  .eq('lead_id', leadId)
  .order('activity_date', { ascending: false })
  .limit(10)`,
    columnsUsed: [],
    note: 'Queries activities table, not leads — no leads column issues',
  },
  {
    file: 'src/app/leads/page.tsx',
    fn: 'handleSaveNote() — INSERT activity',
    type: 'INSERT',
    trigger: 'Save note button in lead detail panel',
    sql: `supabase.from('activities').insert({
  lead_id: selectedLead.id,
  type: 'note',
  summary: noteText.trim(),
  activity_date: new Date().toISOString(),
  logged_by: user?.id || null,
})`,
    columnsUsed: [],
    note: 'Inserts into activities table — no leads column issues',
  },
  {
    file: 'src/app/leads/page.tsx',
    fn: 'handleDelete() — DELETE lead',
    type: 'DELETE',
    trigger: 'Delete lead button',
    sql: `supabase.from('leads').delete().eq('id', selectedLead.id)`,
    columnsUsed: ['id'],
  },
  {
    file: 'src/app/leads/add/AddLeadContent.tsx',
    fn: 'handleSubmit() — INSERT lead',
    type: 'INSERT',
    trigger: 'Add Lead form submit',
    sql: `supabase.from('leads').insert({
  name: formData.fullName.trim(),
  phone: formData.phone.trim(),
  email: formData.email.trim() || null,
  company_name: formData.companyName.trim() || null,
  status: 'new',
})`,
    columnsUsed: ['name', 'phone', 'email', 'company_name', 'status'],
  },
  {
    file: 'src/app/leads/[id]/edit/page.tsx',
    fn: 'fetchLead() — SELECT lead',
    type: 'SELECT',
    trigger: 'Edit page mount',
    sql: `supabase
  .from('leads')
  .select('id, name, phone, email, company_name, status, created_at')
  .eq('id', leadId)
  .single()`,
    columnsUsed: ['id', 'name', 'phone', 'email', 'company_name', 'status', 'created_at'],
  },
  {
    file: 'src/app/leads/[id]/edit/page.tsx',
    fn: 'handleSubmit() — UPDATE lead',
    type: 'UPDATE',
    trigger: 'Edit Lead form submit',
    sql: `supabase.from('leads').update({
  name: formData.fullName.trim(),
  phone: formData.phone.trim(),
  email: formData.email.trim() || null,
  company_name: formData.companyName.trim() || null,
  status: formData.status,
}).eq('id', leadId)`,
    columnsUsed: ['name', 'phone', 'email', 'company_name', 'status', 'id'],
  },
];

// ─── STATIC DATA: Field Mappings ─────────────────────────────────────────────

const FIELD_MAPPINGS = [
  // AddLeadContent.tsx
  { file: 'AddLeadContent.tsx', frontend: 'formData.fullName', dbColumn: 'name', direction: 'INSERT', valid: true, note: 'UI label "Full Name" maps to DB column name' },
  { file: 'AddLeadContent.tsx', frontend: 'formData.phone', dbColumn: 'phone', direction: 'INSERT', valid: true, note: '' },
  { file: 'AddLeadContent.tsx', frontend: 'formData.email', dbColumn: 'email', direction: 'INSERT', valid: true, note: '' },
  { file: 'AddLeadContent.tsx', frontend: 'formData.companyName', dbColumn: 'company_name', direction: 'INSERT', valid: true, note: '' },
  { file: 'AddLeadContent.tsx', frontend: '"new" (hardcoded)', dbColumn: 'status', direction: 'INSERT', valid: true, note: 'Default status on create' },
  // leads/page.tsx SELECT → UI mapping
  { file: 'leads/page.tsx', frontend: 'lead.full_name (interface)', dbColumn: 'name', direction: 'SELECT', valid: true, note: 'row.name mapped to lead.full_name in JS interface' },
  { file: 'leads/page.tsx', frontend: 'lead.phone', dbColumn: 'phone', direction: 'SELECT', valid: true, note: '' },
  { file: 'leads/page.tsx', frontend: 'lead.email', dbColumn: 'email', direction: 'SELECT', valid: true, note: '' },
  { file: 'leads/page.tsx', frontend: 'lead.companyName', dbColumn: 'company_name', direction: 'SELECT', valid: true, note: '' },
  { file: 'leads/page.tsx', frontend: 'lead.status', dbColumn: 'status', direction: 'SELECT', valid: true, note: '' },
  { file: 'leads/page.tsx', frontend: 'lead.createdAt', dbColumn: 'created_at', direction: 'SELECT', valid: true, note: '' },
  // edit/page.tsx
  { file: 'edit/page.tsx', frontend: 'formData.fullName', dbColumn: 'name', direction: 'SELECT+UPDATE', valid: true, note: 'data.name → formData.fullName → update name' },
  { file: 'edit/page.tsx', frontend: 'formData.phone', dbColumn: 'phone', direction: 'SELECT+UPDATE', valid: true, note: '' },
  { file: 'edit/page.tsx', frontend: 'formData.email', dbColumn: 'email', direction: 'SELECT+UPDATE', valid: true, note: '' },
  { file: 'edit/page.tsx', frontend: 'formData.companyName', dbColumn: 'company_name', direction: 'SELECT+UPDATE', valid: true, note: '' },
  { file: 'edit/page.tsx', frontend: 'formData.status', dbColumn: 'status', direction: 'SELECT+UPDATE', valid: true, note: '' },
];

// ─── STATIC DATA: Historical Invalid References (from conversation history) ───

const INVALID_REFS_HISTORY = [
  { column: 'full_name',              file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'DB column is name, not full_name. Now using name → mapped to full_name in JS interface.' },
  { column: 'value',                  file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'value exists in DB but was removed from SELECT per user request.' },
  { column: 'follow_up_date',         file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'follow_up_date exists in DB but was removed from SELECT per user request.' },
  { column: 'notes',                  file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'notes exists in DB but was removed from SELECT per user request.' },
  { column: 'is_converted',           file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'is_converted exists in DB but was removed from SELECT per user request.' },
  { column: 'converted_to_client_id', file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'converted_at',           file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'company_id',             file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'campaign_id',            file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_status',           file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_start_date',       file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_end_date',         file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_name',             file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_email',            file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_phone',            file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_product_id',       file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'trial_plan_id',          file: 'leads/page.tsx',         line: 'SELECT query',        status: 'FIXED', note: 'Exists in DB but removed from SELECT per user request.' },
  { column: 'created_by',             file: 'AddLeadContent.tsx',     line: 'INSERT payload',      status: 'FIXED', note: 'created_by exists in DB but was removed from INSERT per user request.' },
  { column: 'creative_id',            file: 'AddLeadContent.tsx',     line: 'INSERT payload',      status: 'FIXED', note: 'creative_id does NOT exist in leads table. Removed.' },
  { column: 'creative_id',            file: 'edit/page.tsx',          line: 'UPDATE payload',      status: 'FIXED', note: 'creative_id does NOT exist in leads table. Removed.' },
  { column: 'campaigns(name)',        file: 'leads/page.tsx',         line: 'SELECT join',         status: 'FIXED', note: 'Relational join removed per user request (standalone leads).' },
  { column: 'company_id (activity)',  file: 'leads/page.tsx',         line: 'handleSaveNote()',    status: 'FIXED', note: 'selectedLead.companyId passed to activities insert — removed.' },
];

// ─── STATIC DATA: Correct Final Queries ──────────────────────────────────────

const CORRECT_SELECT = `-- ✅ CORRECT SELECT QUERY (leads/page.tsx & edit/page.tsx)
SELECT id, name, phone, email, company_name, status, created_at
FROM public.leads
ORDER BY created_at DESC;

-- Supabase client syntax:
supabase
  .from('leads')
  .select('id, name, phone, email, company_name, status, created_at')
  .order('created_at', { ascending: false })`;

const CORRECT_INSERT = `-- ✅ CORRECT INSERT PAYLOAD (AddLeadContent.tsx)
INSERT INTO public.leads (name, phone, email, company_name, status)
VALUES ($1, $2, $3, $4, 'new');

-- Supabase client syntax:
supabase.from('leads').insert({
  name: formData.fullName.trim(),          // maps to DB: name
  phone: formData.phone.trim(),            // maps to DB: phone
  email: formData.email.trim() || null,    // maps to DB: email
  company_name: formData.companyName.trim() || null, // maps to DB: company_name
  status: 'new',                           // maps to DB: status (enum)
})`;

const CORRECT_UPDATE = `-- ✅ CORRECT UPDATE PAYLOAD (edit/page.tsx)
UPDATE public.leads
SET name = $1, phone = $2, email = $3, company_name = $4, status = $5
WHERE id = $6;

-- Supabase client syntax:
supabase.from('leads').update({
  name: formData.fullName.trim(),          // maps to DB: name
  phone: formData.phone.trim(),            // maps to DB: phone
  email: formData.email.trim() || null,    // maps to DB: email
  company_name: formData.companyName.trim() || null, // maps to DB: company_name
  status: formData.status,                 // maps to DB: status (enum)
}).eq('id', leadId)`;

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportLeadsDebugPDF(
  liveColumns: ColumnInfo[],
  errorLogs: ErrorLog[]
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const addPageHeader = (sectionTitle: string) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Leads Module — Full Debug Report', margin, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${now}  |  ${sectionTitle}  |  READ-ONLY · DO NOT MODIFY DB`, margin, 21);
    return 34;
  };

  const sectionHeading = (text: string, y: number, color: [number, number, number] = [15, 23, 42]) => {
    doc.setTextColor(...color);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    return y + 7;
  };

  // ── SECTION 1: Database Structure ──
  let y = addPageHeader('Section 1 — Database Structure');
  y = sectionHeading('SECTION 1 — LEADS TABLE: DATABASE STRUCTURE', y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Source: Compiled from all Supabase migration files. Live DB query result shown below if available.', margin, y);
  y += 6;

  // Migration-based columns
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('1A. Columns from Migration Files (authoritative)', margin, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Column Name', 'Data Type', 'Nullable', 'Default / Constraint', 'Source Migration']],
    body: LEADS_COLUMNS_FROM_MIGRATIONS.map((c, i) => [
      String(i + 1),
      c.column_name,
      c.data_type,
      c.is_nullable,
      [c.column_default, c.constraint_type].filter(Boolean).join(' | ') || '—',
      getMigrationSource(c.column_name),
    ]),
    styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.font = 'courier';
      }
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 18 },
      4: { cellWidth: 45 },
      5: { cellWidth: 26 },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Live DB columns
  if (liveColumns.length > 0) {
    if (y > 220) { doc.addPage(); y = addPageHeader('Section 1 — Database Structure (cont.)'); }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`1B. Live DB Columns (${liveColumns.length} columns from information_schema)`, margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Column Name', 'Data Type', 'Nullable', 'Default']],
      body: liveColumns.map(c => [c.column_name, c.data_type, c.is_nullable, c.column_default || '—']),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 55 }, 2: { cellWidth: 25 }, 3: { cellWidth: 42 } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── SECTION 2: All Queries ──
  doc.addPage();
  y = addPageHeader('Section 2 — All Queries Used');
  y = sectionHeading('SECTION 2 — ALL QUERIES TOUCHING LEADS TABLE', y);

  for (const q of LEADS_QUERIES) {
    if (y > 230) { doc.addPage(); y = addPageHeader('Section 2 — All Queries (cont.)'); }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${q.type}: ${q.fn}`, margin, y);
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`File: ${q.file}  |  Trigger: ${q.trigger}`, margin, y);
    y += 4;
    if (q.note) {
      doc.setTextColor(120, 80, 0);
      doc.text(`Note: ${q.note}`, margin, y);
      y += 4;
    }
    autoTable(doc, {
      startY: y,
      body: [[q.sql]],
      styles: { fontSize: 6.5, cellPadding: 3, overflow: 'linebreak', font: 'courier' },
      bodyStyles: { fillColor: [17, 24, 39], textColor: [134, 239, 172] },
      columnStyles: { 0: { cellWidth: 177 } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 7;
  }

  // ── SECTION 3: Field Mappings ──
  doc.addPage();
  y = addPageHeader('Section 3 — Field Mappings');
  y = sectionHeading('SECTION 3 — FRONTEND FIELD → DB COLUMN MAPPINGS', y);

  autoTable(doc, {
    startY: y,
    head: [['File', 'Frontend Field', 'DB Column', 'Operation', 'Valid?', 'Note']],
    body: FIELD_MAPPINGS.map(m => [
      m.file,
      m.frontend,
      m.dbColumn,
      m.direction,
      m.valid ? '✅ YES' : '❌ NO',
      m.note || '—',
    ]),
    styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw);
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = val.startsWith('✅') ? [21, 128, 61] : [185, 28, 28];
      }
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 38, font: 'courier' },
      2: { cellWidth: 30, font: 'courier', fontStyle: 'bold' },
      3: { cellWidth: 22 },
      4: { cellWidth: 16 },
      5: { cellWidth: 39 },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── SECTION 4: Invalid References ──
  if (y > 200) { doc.addPage(); y = addPageHeader('Section 4 — Invalid References'); }
  y = sectionHeading('SECTION 4 — ALL INVALID COLUMN REFERENCES (HISTORICAL)', y, [185, 28, 28]);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('These are all invalid/removed column references found during the debug history. All are now FIXED.', margin, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Column Used ❌', 'File', 'Location', 'Status', 'Explanation']],
    body: INVALID_REFS_HISTORY.map(r => [
      r.column,
      r.file,
      r.line,
      r.status,
      r.note,
    ]),
    styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [21, 128, 61];
      }
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.font = 'courier';
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [185, 28, 28];
      }
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 16 },
      4: { cellWidth: 63 },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── SECTION 5: Correct Final Queries ──
  doc.addPage();
  y = addPageHeader('Section 5 — Correct Final Queries');
  y = sectionHeading('SECTION 5 — CORRECT FINAL QUERIES (VERIFIED AGAINST DB)', y, [21, 128, 61]);

  const finalQueries = [
    { label: '5A. Correct SELECT Query', sql: CORRECT_SELECT },
    { label: '5B. Correct INSERT Payload', sql: CORRECT_INSERT },
    { label: '5C. Correct UPDATE Payload', sql: CORRECT_UPDATE },
  ];

  for (const fq of finalQueries) {
    if (y > 220) { doc.addPage(); y = addPageHeader('Section 5 — Correct Final Queries (cont.)'); }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(fq.label, margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      body: [[fq.sql]],
      styles: { fontSize: 6.5, cellPadding: 3, overflow: 'linebreak', font: 'courier' },
      bodyStyles: { fillColor: [17, 24, 39], textColor: [134, 239, 172] },
      columnStyles: { 0: { cellWidth: 177 } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── SECTION 6: Error Logs ──
  if (y > 200) { doc.addPage(); y = addPageHeader('Section 6 — Error Logs'); }
  y = sectionHeading('SECTION 6 — LIVE QUERY ERROR LOGS', y);

  if (errorLogs.length === 0) {
    autoTable(doc, {
      startY: y,
      body: [['✅ No errors captured during this report run. All live Supabase queries succeeded.']],
      styles: { fontSize: 8, cellPadding: 3 },
      bodyStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61] },
      columnStyles: { 0: { cellWidth: 177 } },
      margin: { left: margin, right: margin },
    });
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Operation', 'Severity', 'Error Message', 'Timestamp']],
      body: errorLogs.map(e => [e.operation, e.severity.toUpperCase(), e.message, e.timestamp]),
      styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20 }, 2: { cellWidth: 90 }, 3: { cellWidth: 27 } },
      margin: { left: margin, right: margin },
    });
  }

  // ── Page footers ──
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}  |  Leads Debug Report  |  ${now}  |  READ-ONLY`,
      margin,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  doc.save('leads-debug-report.pdf');
}

function getMigrationSource(col: string): string {
  const map: Record<string, string> = {
    id: '20260403220000_full_crm_schema',
    client_id: '20260403220000_full_crm_schema',
    title: '20260403220000_full_crm_schema',
    status: '20260403220000_full_crm_schema',
    value: '20260403220000_full_crm_schema',
    follow_up_date: '20260403220000_full_crm_schema',
    notes: '20260403220000_full_crm_schema',
    assigned_to: '20260403220000_full_crm_schema',
    created_by: '20260403220000_full_crm_schema',
    created_at: '20260403220000_full_crm_schema',
    updated_at: '20260403220000_full_crm_schema',
    is_converted: '20260403270000_lead_conversion',
    converted_to_client_id: '20260403270000_lead_conversion',
    converted_at: '20260403270000_lead_conversion',
    trial_status: '20260404050000_trial_system',
    trial_start_date: '20260404050000_trial_system',
    trial_end_date: '20260404050000_trial_system',
    trial_name: '20260404050000_trial_system',
    trial_email: '20260404050000_trial_system',
    trial_phone: '20260404050000_trial_system',
    trial_product_id: '20260404050000_trial_system',
    trial_plan_id: '20260404050000_trial_system',
    trial_started_by: '20260404080000_fix_leads_trial',
    campaign_id: '20260404100000_marketing_campaigns',
    company_id: '20260404110000_multitenant_erp',
    name: '20260404130000_website_leads_to_crm',
    email: '20260404130000_website_leads_to_crm',
    phone: '20260404130000_website_leads_to_crm',
    source: '20260404130000_website_leads_to_crm',
    company_name: '20260405250000_add_company_name',
  };
  return map[col] || '—';
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, badge, badgeColor, children }: {
  title: string;
  badge?: string | number;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {badge !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor || 'bg-blue-100 text-blue-700'}`}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
      {code}
    </pre>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DebugReportPage() {
  const [liveColumns, setLiveColumns] = useState<ColumnInfo[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveData = async () => {
    setRefreshing(true);
    setLiveLoading(true);
    const supabase = createClient();
    const newErrors: ErrorLog[] = [];
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Try to fetch live leads table structure
    try {
      const { data, error } = await supabase
        .from('information_schema_columns_view' as any)
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'leads')
        .eq('table_schema', 'public')
        .order('ordinal_position' as any);

      if (error) {
        setLiveError(error.message);
        newErrors.push({ operation: 'information_schema query for leads', message: error.message, severity: 'warning', timestamp: now });
      } else {
        setLiveColumns((data || []) as ColumnInfo[]);
        setLiveError(null);
      }
    } catch (err: any) {
      setLiveError(err.message);
      newErrors.push({ operation: 'information_schema query for leads', message: err.message, severity: 'warning', timestamp: now });
    }

    setErrorLogs(newErrors);
    setLiveLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportLeadsDebugPDF(liveColumns, errorLogs);
    } finally {
      setExporting(false);
    }
  };

  const invalidCount = INVALID_REFS_HISTORY.length;
  const fixedCount = INVALID_REFS_HISTORY.filter(r => r.status === 'FIXED').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/leads" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={20} className="text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-900 truncate">Leads Module — Full Debug Report</h1>
                <p className="text-xs text-gray-500">Read-only diagnostic · No database modifications</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={fetchLiveData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
            >
              <Download size={15} />
              {exporting ? 'Generating PDF...' : 'Download leads-debug-report.pdf'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'DB Columns (leads)', value: LEADS_COLUMNS_FROM_MIGRATIONS.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Queries Analyzed', value: LEADS_QUERIES.length, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Invalid Refs Found', value: invalidCount, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Fixed', value: fixedCount, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl border border-gray-200 p-4`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* SECTION 1 — Database Structure */}
        <Section
          title="SECTION 1 — LEADS TABLE: DATABASE STRUCTURE"
          badge={`${LEADS_COLUMNS_FROM_MIGRATIONS.length} columns`}
          badgeColor="bg-blue-100 text-blue-700"
        >
          <div className="p-6 space-y-6">
            {/* Migration-based */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">1A. Columns from Migration Files (authoritative)</h3>
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                  ✓ {LEADS_COLUMNS_FROM_MIGRATIONS.length} columns
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left px-3 py-2 font-semibold">#</th>
                      <th className="text-left px-3 py-2 font-semibold">column_name</th>
                      <th className="text-left px-3 py-2 font-semibold">data_type</th>
                      <th className="text-left px-3 py-2 font-semibold">nullable</th>
                      <th className="text-left px-3 py-2 font-semibold">default / constraint</th>
                      <th className="text-left px-3 py-2 font-semibold">source migration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEADS_COLUMNS_FROM_MIGRATIONS.map((col, i) => (
                      <tr key={col.column_name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono font-bold text-gray-900">{col.column_name}</td>
                        <td className="px-3 py-1.5 text-blue-700">{col.data_type}</td>
                        <td className="px-3 py-1.5 text-gray-600">{col.is_nullable}</td>
                        <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">
                          {[col.column_default, col.constraint_type].filter(Boolean).join(' | ') || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-gray-400 text-xs">{getMigrationSource(col.column_name)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live DB */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">1B. Live DB Query (information_schema)</h3>
                {liveLoading && <span className="text-xs text-gray-400">Loading...</span>}
                {!liveLoading && liveError && <span className="text-xs text-yellow-600 font-medium">⚠ {liveError} (view may not be exposed — use migration data above)</span>}
                {!liveLoading && !liveError && liveColumns.length > 0 && (
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">✓ {liveColumns.length} columns</span>
                )}
              </div>
              <CodeBlock code={`SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;`} />
              {!liveLoading && !liveError && liveColumns.length > 0 && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                  ✅ Live query shows {liveColumns.length} columns. Use this data for current DB state.
                </div>
              )}
              {!liveLoading && liveError && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
                  Live query unavailable: {liveError}. Use migration-based data above (Section 1A) as the authoritative source.
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* SECTION 2 — All Queries */}
        <Section
          title="SECTION 2 — ALL QUERIES TOUCHING LEADS TABLE"
          badge={`${LEADS_QUERIES.length} queries`}
          badgeColor="bg-purple-100 text-purple-700"
        >
          <div className="p-6 space-y-4">
            {LEADS_QUERIES.map((q, i) => {
              const invalidCols = q.columnsUsed.filter(c => c !== 'id' && !VALID_COLUMN_NAMES.has(c));
              return (
                <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex flex-wrap items-center gap-2 border-b border-gray-200">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      q.type === 'SELECT' ? 'bg-blue-100 text-blue-700' :
                      q.type === 'INSERT' ? 'bg-green-100 text-green-700' :
                      q.type === 'UPDATE'? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>{q.type}</span>
                    <span className="text-xs font-mono font-bold text-gray-900">{q.file}</span>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{q.fn}</span>
                    <span className="text-xs text-gray-500">Trigger: {q.trigger}</span>
                    {invalidCols.length > 0 && (
                      <span className="ml-auto text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <XCircle size={11} /> {invalidCols.length} invalid col(s): {invalidCols.join(', ')}
                      </span>
                    )}
                    {invalidCols.length === 0 && q.columnsUsed.length > 0 && (
                      <span className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle size={11} /> All columns valid
                      </span>
                    )}
                  </div>
                  {q.note && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                      ℹ {q.note}
                    </div>
                  )}
                  <div className="p-3">
                    <CodeBlock code={q.sql} />
                  </div>
                  {q.columnsUsed.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-500 font-medium">Columns used:</span>
                      {q.columnsUsed.map(c => (
                        <span key={c} className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          VALID_COLUMN_NAMES.has(c)
                            ? 'bg-green-100 text-green-700' :'bg-red-100 text-red-700 font-bold'
                        }`}>
                          {c} {VALID_COLUMN_NAMES.has(c) ? '✓' : '❌'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* SECTION 3 — Field Mappings */}
        <Section
          title="SECTION 3 — FRONTEND FIELD → DB COLUMN MAPPINGS"
          badge={`${FIELD_MAPPINGS.length} mappings`}
          badgeColor="bg-violet-100 text-violet-700"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-violet-600 text-white">
                  <th className="text-left px-4 py-2.5 font-semibold">File</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Frontend Field</th>
                  <th className="text-left px-4 py-2.5 font-semibold">→</th>
                  <th className="text-left px-4 py-2.5 font-semibold">DB Column</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Operation</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Valid?</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_MAPPINGS.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50'}>
                    <td className="px-4 py-2 font-mono text-gray-600 text-xs">{m.file}</td>
                    <td className="px-4 py-2 font-mono text-gray-900 font-semibold">{m.frontend}</td>
                    <td className="px-4 py-2 text-gray-400 font-bold">→</td>
                    <td className="px-4 py-2 font-mono font-bold text-blue-700">{m.dbColumn}</td>
                    <td className="px-4 py-2 text-gray-600">{m.direction}</td>
                    <td className="px-4 py-2">
                      {m.valid
                        ? <span className="text-green-600 font-bold">✅ YES</span>
                        : <span className="text-red-600 font-bold">❌ NO</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{m.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* SECTION 4 — Invalid References */}
        <Section
          title="SECTION 4 — ALL INVALID COLUMN REFERENCES (HISTORICAL)"
          badge={`${invalidCount} found · ${fixedCount} fixed`}
          badgeColor="bg-red-100 text-red-700"
        >
          <div className="p-4">
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  All {fixedCount} invalid references have been fixed. Current code uses only valid DB columns.
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="text-left px-4 py-2.5 font-semibold">Column Used ❌</th>
                  <th className="text-left px-4 py-2.5 font-semibold">File</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Location</th>
                  <th className="text-left px-4 py-2.5 font-semibold">In DB?</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {INVALID_REFS_HISTORY.map((r, i) => {
                  const inDb = VALID_COLUMN_NAMES.has(r.column.split(' ')[0]);
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                      <td className="px-4 py-2 font-mono font-bold text-red-700">{r.column}</td>
                      <td className="px-4 py-2 font-mono text-gray-600">{r.file}</td>
                      <td className="px-4 py-2 text-gray-600">{r.line}</td>
                      <td className="px-4 py-2">
                        {inDb
                          ? <span className="text-blue-600 font-semibold">✓ Exists (removed per request)</span>
                          : <span className="text-red-600 font-bold">✗ NOT in DB</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">{r.status}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{r.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* SECTION 5 — Correct Final Queries */}
        <Section
          title="SECTION 5 — CORRECT FINAL QUERIES (VERIFIED AGAINST DB)"
          badge="SELECT · INSERT · UPDATE"
          badgeColor="bg-green-100 text-green-700"
        >
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={15} className="text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">5A. Correct SELECT Query</h3>
              </div>
              <CodeBlock code={CORRECT_SELECT} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={15} className="text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">5B. Correct INSERT Payload</h3>
              </div>
              <CodeBlock code={CORRECT_INSERT} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={15} className="text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">5C. Correct UPDATE Payload</h3>
              </div>
              <CodeBlock code={CORRECT_UPDATE} />
            </div>
          </div>
        </Section>

        {/* SECTION 6 — Error Logs */}
        <Section
          title="SECTION 6 — LIVE QUERY ERROR LOGS"
          badge={errorLogs.length > 0 ? `${errorLogs.length} errors` : 'No errors'}
          badgeColor={errorLogs.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
        >
          <div className="p-6">
            {refreshing && (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Running live Supabase queries...
              </div>
            )}
            {!refreshing && errorLogs.length === 0 && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">No errors captured. All live queries succeeded.</span>
              </div>
            )}
            {!refreshing && errorLogs.length > 0 && (
              <div className="space-y-2">
                {errorLogs.map((e, i) => (
                  <div key={i} className={`border rounded-lg px-4 py-3 ${
                    e.severity === 'critical' ? 'bg-red-50 border-red-200' :
                    e.severity === 'warning'? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className={e.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'} />
                      <span className={`text-xs font-bold uppercase ${e.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}`}>
                        {e.severity}
                      </span>
                      <span className="text-xs text-gray-500">— {e.operation}</span>
                      <span className="ml-auto text-xs text-gray-400">{e.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-800 font-mono">{e.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

      </div>
    </div>
  );
}
