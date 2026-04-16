'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Check, X, Save, Loader2, Trash2 } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string;
  status: string;
  sort_order: number;
}

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface Permission {
  id?: string;
  role_id: string;
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

type PermKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

const PERM_KEYS: { key: PermKey; label: string }[] = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
];

export default function RolesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [modules, setModules] = useState<Module[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const permKey = (roleId: string, moduleId: string) => `${roleId}::${moduleId}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
      if (userRole !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setIsAdminUser(true);

      const [modsRes, rlsRes, permsRes] = await Promise.all([
        fetch('/api/mysql/modules', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/mysql/roles', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/mysql/role-permissions', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
      ]);
      const [mods, rls, perms] = await Promise.all([modsRes.json(), rlsRes.json(), permsRes.json()]);
      if (!modsRes.ok) throw new Error(mods?.error || 'Failed to load modules');
      if (!rlsRes.ok) throw new Error(rls?.error || 'Failed to load roles');
      if (!permsRes.ok) throw new Error(perms?.error || 'Failed to load permissions');

      setModules(mods || []);
      setRoles(rls || []);

      const permMap: Record<string, Permission> = {};
      (perms || []).forEach((p: Permission) => {
        permMap[permKey(p.role_id, p.module_id)] = p;
      });
      setPermissions(permMap);

      if (rls && rls.length > 0 && !selectedRole) {
        setSelectedRole(rls[0]?.id || null);
      }
    } catch (err) {
      console.error('Error fetching RBAC data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const togglePerm = (roleId: string, moduleId: string, key: PermKey) => {
    const k = permKey(roleId, moduleId);
    const existing = permissions[k] || {
      role_id: roleId,
      module_id: moduleId,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
    const updated = { ...existing, [key]: !existing[key] };
    // If enabling create/edit/delete, auto-enable view
    if ((key === 'can_create' || key === 'can_edit' || key === 'can_delete') && updated[key]) {
      updated.can_view = true;
    }
    // If disabling view, disable all
    if (key === 'can_view' && !updated.can_view) {
      updated.can_create = false;
      updated.can_edit = false;
      updated.can_delete = false;
    }
    setPermissions((prev) => ({ ...prev, [k]: updated }));
  };

  const toggleAllForModule = (roleId: string, moduleId: string, value: boolean) => {
    const k = permKey(roleId, moduleId);
    const existing = permissions[k] || { role_id: roleId, module_id: moduleId };
    setPermissions((prev) => ({
      ...prev,
      [k]: {
        ...existing,
        can_view: value,
        can_create: value,
        can_edit: value,
        can_delete: value,
      },
    }));
  };

  const toggleAllForRole = (roleId: string, value: boolean) => {
    const updates: Record<string, Permission> = { ...permissions };
    modules.forEach((mod) => {
      const k = permKey(roleId, mod.id);
      updates[k] = {
        ...(updates[k] || { role_id: roleId, module_id: mod.id }),
        can_view: value,
        can_create: value,
        can_edit: value,
        can_delete: value,
      };
    });
    setPermissions(updates);
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const rolePerms = modules.map((mod) => {
        const k = permKey(selectedRole, mod.id);
        const p = permissions[k] || {
          role_id: selectedRole,
          module_id: mod.id,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
        return {
          role_id: selectedRole,
          module_id: mod.id,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        };
      });

      const response = await fetch('/api/mysql/role-permissions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ permissions: rolePerms }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to save permissions');
      setSaveMsg('Permissions saved successfully');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg('Error: ' + (err.message || 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const addRole = async () => {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const response = await fetch('/api/mysql/roles', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDesc.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to add role');
      setRoles((prev) => [...prev, data]);
      setSelectedRole(data.id);
      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddRole(false);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Failed to add role'));
    } finally {
      setAddingRole(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.is_system) {
      alert('System roles cannot be deleted.');
      return;
    }
    if (!confirm('Delete this role? This will remove all associated permissions.')) return;
    await fetch(`/api/mysql/roles/${encodeURIComponent(roleId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    if (selectedRole === roleId) setSelectedRole(roles[0]?.id || null);
  };

  const activeRole = roles.find((r) => r?.id === selectedRole) || null;

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-6 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-700 text-foreground">Role Management</h1>
              <p className="text-sm text-muted-foreground">Configure module permissions per role</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddRole(!showAddRole)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Add Role
          </button>
        </div>

        {/* Add Role Form */}
        {showAddRole && (
          <div className="mb-6 p-4 border border-border rounded-xl bg-muted/30">
            <h3 className="text-sm font-600 text-foreground mb-3">New Role</h3>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="flex-1 min-w-[180px] px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="flex-1 min-w-[220px] px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={addRole}
                disabled={addingRole || !newRoleName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {addingRole ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
              <button
                onClick={() => setShowAddRole(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Role List */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground">Roles</p>
              </div>
              <ul>
                {roles.map((role) => (
                  <li key={role.id}>
                    <button
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-border last:border-0 ${
                        selectedRole === role.id
                          ? 'bg-primary/10 text-primary font-600' :'text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-500">{role.name}</p>
                        {role.is_system && (
                          <span className="text-[10px] text-muted-foreground">System</span>
                        )}
                      </div>
                      {!role.is_system && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }}
                          className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete role"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="flex-1 min-w-0">
            {activeRole ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-600 text-foreground">{activeRole.name}</h2>
                    {activeRole.description && (
                      <p className="text-sm text-muted-foreground">{activeRole.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {saveMsg && (
                      <span className={`text-sm font-500 ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {saveMsg}
                      </span>
                    )}
                    <button
                      onClick={() => toggleAllForRole(activeRole.id, true)}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Grant All
                    </button>
                    <button
                      onClick={() => toggleAllForRole(activeRole.id, false)}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Revoke All
                    </button>
                    <button
                      onClick={savePermissions}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-4 py-3 font-600 text-foreground w-48">Module</th>
                          <th className="px-3 py-3 font-600 text-center text-muted-foreground text-xs uppercase tracking-wider">All</th>
                          {PERM_KEYS.map((pk) => (
                            <th key={pk.key} className="px-3 py-3 font-600 text-center text-muted-foreground text-xs uppercase tracking-wider">
                              {pk.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((mod, idx) => {
                          const k = permKey(activeRole.id, mod.id);
                          const perm = permissions[k] || {
                            role_id: activeRole.id,
                            module_id: mod.id,
                            can_view: false,
                            can_create: false,
                            can_edit: false,
                            can_delete: false,
                          };
                          const allGranted = perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
                          const anyGranted = perm.can_view || perm.can_create || perm.can_edit || perm.can_delete;

                          return (
                            <tr
                              key={mod.id}
                              className={`border-b border-border last:border-0 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                              } hover:bg-primary/5`}
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-500 text-foreground">{mod.name}</p>
                                  {mod.description && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{mod.description}</p>
                                  )}
                                </div>
                              </td>
                              {/* All toggle */}
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => toggleAllForModule(activeRole.id, mod.id, !allGranted)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                    allGranted
                                      ? 'bg-primary text-white'
                                      : anyGranted
                                      ? 'bg-primary/20 text-primary' :'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                  title={allGranted ? 'Revoke all' : 'Grant all'}
                                >
                                  {allGranted ? <Check size={14} /> : anyGranted ? <span className="text-[10px] font-700">~</span> : <X size={12} />}
                                </button>
                              </td>
                              {PERM_KEYS.map((pk) => {
                                const val = perm[pk.key as keyof typeof perm] as boolean;
                                return (
                                  <td key={pk.key} className="px-3 py-3 text-center">
                                    <button
                                      onClick={() => togglePerm(activeRole.id, mod.id, pk.key)}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                        val
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200' :'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500'
                                      }`}
                                      title={val ? `Revoke ${pk.label}` : `Grant ${pk.label}`}
                                    >
                                      {val ? <Check size={14} /> : <X size={12} />}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
                      <Check size={11} className="text-green-700" />
                    </div>
                    <span>Allowed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                      <X size={10} className="text-muted-foreground" />
                    </div>
                    <span>Denied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </div>
                    <span>Full Access (All column)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Select a role to manage permissions
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
