'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { createClient } from '@/lib/supabase/client';
import { UserCog, Plus, Search, Edit2, CheckCircle, XCircle, Loader2, X, Save } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  status: string;
}

interface Role {
  id: string;
  name: string;
  department_id: string | null;
  department_name: string | null;
  status: string;
}

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: string | null;
  roleName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  status: string;
  createdAt: string;
}

interface StaffForm {
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  status: string;
}

const emptyForm: StaffForm = { fullName: '', email: '', phone: '', roleId: '', status: 'active' };

export default function StaffPage() {
  const supabase = createClient();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, company_id, created_at')
          .order('email'),
        supabase
          .from('staff_roles')
          .select('id, name, department_id, status, staff_departments(id, name)')
          .eq('status', 'active')
          .order('name'),
      ]);

      const mappedStaff: StaffMember[] = (staffRes.data || []).map((s: any) => ({
        id: s.id,
        fullName: s.email || '',
        email: s.email || '',
        phone: null,
        roleId: null,
        roleName: null,
        departmentId: null,
        departmentName: null,
        status: 'active',
        createdAt: s.created_at,
      }));

      const mappedRoles: Role[] = (rolesRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        department_id: r.department_id,
        department_name: r.staff_departments?.name || null,
        status: r.status,
      }));

      setStaff(mappedStaff);
      setRoles(mappedRoles);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone || '',
      roleId: member.roleId || '',
      status: member.status,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.fullName.trim()) { setFormError('Name is required.'); return; }
    if (!form.email.trim()) { setFormError('Email is required.'); return; }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            company_id: form.roleId || null,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        // Create staff via API route (creates auth user + profile atomically)
        const res = await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            staffRoleId: form.roleId || null,
            status: form.status,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to create staff member.');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus } : s));
  };

  const filtered = staff.filter((s) => {
    const matchSearch = !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedRole = roles.find((r) => r.id === form.roleId);

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCog size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-600 text-foreground">Staff Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{staff.length} total staff members</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={15} /> Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <UserCog size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No staff members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider hidden md:table-cell">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                        >
                          {member.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-500 text-foreground">{member.fullName}</p>
                          {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {member.roleName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-500 bg-blue-50 text-blue-700">{member.roleName}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {member.departmentName || <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-500 ${
                        member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {member.status === 'active' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {member.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(member)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => toggleStatus(member.id, member.status)}
                          className={`p-1.5 rounded-md transition-colors ${
                            member.status === 'active' ?'text-muted-foreground hover:text-red-600 hover:bg-red-50' :'text-muted-foreground hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={member.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {member.status === 'active' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-600 text-foreground">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{formError}</div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="rahul@shaarvik.com"
                  disabled={!!editingId}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:text-muted-foreground"
                />
                {editingId && <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Role</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Select Role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.department_name ? ` (${r.department_name})` : ''}</option>
                  ))}
                </select>
                {selectedRole?.department_name && (
                  <p className="text-xs text-muted-foreground">Department: <strong>{selectedRole.department_name}</strong></p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border bg-white text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-600 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingId ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
