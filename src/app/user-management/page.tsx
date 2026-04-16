'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  Search,
  ChevronRight,
  Loader2,
  Check,
  X,
  Save,
  UserCog,
  Crown,
  Briefcase,
  User,
  AlertTriangle,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  role_id: string | null;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface Module {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}

interface Permission {
  role_id: string;
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

type PermKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

const PERM_KEYS: { key: PermKey; label: string; short: string }[] = [
  { key: 'can_view', label: 'View', short: 'V' },
  { key: 'can_create', label: 'Create', short: 'C' },
  { key: 'can_edit', label: 'Edit', short: 'E' },
  { key: 'can_delete', label: 'Delete', short: 'D' },
];

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Crown,
  manager: Briefcase,
  'sales rep': User,
  staff: UserCog,
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  manager: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  'sales rep': { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  staff: { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
};

type ActiveView = 'users' | 'roles' | 'permissions';

export default function UserManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeView, setActiveView] = useState<ActiveView>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
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

      // Fetch all data in parallel
      const [userProfilesRes, rolesRes, modulesRes, permsRes] = await Promise.all([
        fetch('/api/mysql/profiles', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/mysql/roles', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/mysql/modules', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/mysql/role-permissions', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
      ]);

      const [userProfiles, rls, mods, perms] = await Promise.all([
        userProfilesRes.json(),
        rolesRes.json(),
        modulesRes.json(),
        permsRes.json(),
      ]);

      if (!userProfilesRes.ok) throw new Error(userProfiles?.error || 'Failed to load profiles');
      if (!rolesRes.ok) throw new Error(rls?.error || 'Failed to load roles');
      if (!modulesRes.ok) throw new Error(mods?.error || 'Failed to load modules');
      if (!permsRes.ok) throw new Error(perms?.error || 'Failed to load permissions');

      setUsers(userProfiles || []);
      setRoles(rls || []);
      setModules(mods || []);

      const permMap: Record<string, Permission> = {};
      (perms || []).forEach((p: Permission) => {
        permMap[permKey(p.role_id, p.module_id)] = p;
      });
      setPermissions(permMap);

      if (rls && rls.length > 0 && !selectedRole) {
        setSelectedRole(rls[0]?.id || null);
      }
    } catch (err) {
      console.error('Error fetching user management data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const assignRoleToUser = async (userId: string, roleId: string | null, roleName: string | null) => {
    setAssigningRole(userId);
    try {
      const response = await fetch(`/api/mysql/profiles/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ roleId, roleName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to assign role');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role_id: roleId, role: roleName } : u))
      );
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, role_id: roleId, role: roleName } : prev);
      }
    } catch (err: any) {
      alert('Error assigning role: ' + (err.message || 'Unknown error'));
    } finally {
      setAssigningRole(null);
    }
  };

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
    if ((key === 'can_create' || key === 'can_edit' || key === 'can_delete') && updated[key]) {
      updated.can_view = true;
    }
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
      [k]: { ...existing, can_view: value, can_create: value, can_edit: value, can_delete: value },
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
    if (!confirm('Delete this role? This will remove all associated permissions and unassign users.')) return;
    await fetch(`/api/mysql/roles/${encodeURIComponent(roleId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    if (selectedRole === roleId) setSelectedRole(roles[0]?.id || null);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  const getRoleColor = (roleName: string | null) => {
    if (!roleName) return ROLE_COLORS['staff'];
    const key = roleName.toLowerCase();
    return ROLE_COLORS[key] || ROLE_COLORS['staff'];
  };

  const getRoleIcon = (roleName: string | null): React.ElementType => {
    if (!roleName) return User;
    const key = roleName.toLowerCase();
    return ROLE_ICONS[key] || User;
  };

  const activeRole = roles.find((r) => r?.id === selectedRole) || null;

  const userCountByRole = (roleId: string) =>
    users.filter((u) => u.role_id === roleId).length;

  const tabs: { id: ActiveView; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Role Definitions', icon: Shield },
    { id: 'permissions', label: 'Permission Controls', icon: Lock },
  ];

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
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage users, roles, and module-level permissions
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Users</p>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Roles Defined</p>
            <p className="text-2xl font-bold text-foreground">{roles.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Modules</p>
            <p className="text-2xl font-bold text-foreground">{modules.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Unassigned</p>
            <p className="text-2xl font-bold text-amber-500">
              {users.filter((u) => !u.role_id && u.role !== 'admin').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeView === tab.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── USERS TAB ── */}
        {activeView === 'users' && (
          <div>
            {/* Search */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <span className="text-sm text-muted-foreground">{filteredUsers.length} users</span>
            </div>

            {/* User Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-foreground">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Current Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Assign Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Joined</th>
                      <th className="px-4 py-3 font-semibold text-foreground text-center">Permissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, idx) => {
                        const roleColor = getRoleColor(u.role);
                        const RoleIcon = getRoleIcon(u.role);
                        const isCurrentUser = u.id === user?.id;
                        return (
                          <tr
                            key={u.id}
                            className={`border-b border-border last:border-0 transition-colors ${
                              idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                            } hover:bg-primary/5`}
                          >
                            {/* User */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                                >
                                  {(u.full_name || u.email || 'U').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {u.full_name || '—'}
                                    {isCurrentUser && (
                                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                        You
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {/* Email */}
                            <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                            {/* Current Role */}
                            <td className="px-4 py-3">
                              {u.role ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{
                                    background: roleColor.bg,
                                    color: roleColor.text,
                                    border: `1px solid ${roleColor.border}`,
                                  }}
                                >
                                  <RoleIcon size={11} />
                                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Unassigned</span>
                              )}
                            </td>
                            {/* Assign Role */}
                            <td className="px-4 py-3">
                              {u.role === 'admin' ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Lock size={11} /> Admin (protected)
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={u.role_id || ''}
                                    onChange={(e) => {
                                      const rid = e.target.value;
                                      const role = roles.find((r) => r.id === rid);
                                      assignRoleToUser(u.id, rid || null, role?.name.toLowerCase() || null);
                                    }}
                                    disabled={assigningRole === u.id}
                                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                                  >
                                    <option value="">— No Role —</option>
                                    {roles.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                  {assigningRole === u.id && (
                                    <Loader2 size={13} className="animate-spin text-primary" />
                                  )}
                                </div>
                              )}
                            </td>
                            {/* Joined */}
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {u.created_at
                                ? new Date(u.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            {/* View Permissions */}
                            <td className="px-4 py-3 text-center">
                              {u.role_id && (
                                <button
                                  onClick={() => {
                                    setSelectedRole(u.role_id!);
                                    setActiveView('permissions');
                                  }}
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Eye size={12} />
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ROLES TAB ── */}
        {activeView === 'roles' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Define roles and their descriptions. Assign permissions in the Permission Controls tab.
              </p>
              <button
                onClick={() => setShowAddRole(!showAddRole)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />
                Add Role
              </button>
            </div>

            {/* Add Role Form */}
            {showAddRole && (
              <div className="mb-5 p-4 border border-border rounded-xl bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground mb-3">New Role</h3>
                <div className="flex gap-3 flex-wrap">
                  <input
                    type="text"
                    placeholder="Role name (e.g. Sales Rep)"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="flex-1 min-w-[220px] px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={addRole}
                    disabled={addingRole || !newRoleName.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
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

            {/* Role Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => {
                const roleColor = getRoleColor(role.name);
                const RoleIcon = getRoleIcon(role.name);
                const count = userCountByRole(role.id);
                return (
                  <div
                    key={role.id}
                    className="border border-border rounded-xl p-5 bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: roleColor.bg, border: `1px solid ${roleColor.border}` }}
                        >
                          <RoleIcon size={18} style={{ color: roleColor.text }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{role.name}</h3>
                          {role.is_system && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              System
                            </span>
                          )}
                        </div>
                      </div>
                      {!role.is_system && (
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete role"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 min-h-[36px]">
                      {role.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{count}</span> user{count !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedRole(role.id);
                          setActiveView('permissions');
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Edit Permissions
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Default Role Definitions Info */}
            <div className="mt-6 p-4 border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    Default Role Hierarchy
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <li>
                      <strong>Admin</strong> — Full access to all modules. Cannot be restricted via permissions.
                    </li>
                    <li>
                      <strong>Manager</strong> — Typically has view, create, and edit access. Delete may be restricted.
                    </li>
                    <li>
                      <strong>Sales Rep</strong> — Limited to leads, clients, and tasks. No access to billing or admin modules.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PERMISSIONS TAB ── */}
        {activeView === 'permissions' && (
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Role Selector */}
            <div className="lg:w-52 flex-shrink-0">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Role
                  </p>
                </div>
                <ul>
                  {roles.map((role) => {
                    const RoleIcon = getRoleIcon(role.name);
                    const roleColor = getRoleColor(role.name);
                    const count = userCountByRole(role.id);
                    return (
                      <li key={role.id}>
                        <button
                          onClick={() => setSelectedRole(role.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-border last:border-0 ${
                            selectedRole === role.id
                              ? 'bg-primary/10 text-primary' :'text-foreground hover:bg-muted'
                          }`}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: selectedRole === role.id ? 'rgba(59,130,246,0.15)' : roleColor.bg,
                            }}
                          >
                            <RoleIcon
                              size={13}
                              style={{ color: selectedRole === role.id ? '#3b82f6' : roleColor.text }}
                            />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="font-medium truncate">{role.name}</p>
                            <p className="text-[10px] text-muted-foreground">{count} user{count !== 1 ? 's' : ''}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="flex-1 min-w-0">
              {activeRole ? (
                <>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        {activeRole.name}
                        {activeRole.is_system && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-normal">
                            System
                          </span>
                        )}
                      </h2>
                      {activeRole.description && (
                        <p className="text-sm text-muted-foreground">{activeRole.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {saveMsg && (
                        <span
                          className={`text-sm font-medium ${
                            saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
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
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Matrix */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-4 py-3 font-semibold text-foreground w-48">Module</th>
                            <th className="px-3 py-3 font-semibold text-center text-muted-foreground text-xs uppercase tracking-wider">
                              All
                            </th>
                            {PERM_KEYS.map((pk) => (
                              <th
                                key={pk.key}
                                className="px-3 py-3 font-semibold text-center text-muted-foreground text-xs uppercase tracking-wider"
                              >
                                {pk.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modules.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                No modules found. Modules are configured in the database.
                              </td>
                            </tr>
                          ) : (
                            modules.map((mod, idx) => {
                              const k = permKey(activeRole.id, mod.id);
                              const perm = permissions[k] || {
                                role_id: activeRole.id,
                                module_id: mod.id,
                                can_view: false,
                                can_create: false,
                                can_edit: false,
                                can_delete: false,
                              };
                              const allGranted =
                                perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
                              const anyGranted =
                                perm.can_view || perm.can_create || perm.can_edit || perm.can_delete;

                              return (
                                <tr
                                  key={mod.id}
                                  className={`border-b border-border last:border-0 transition-colors ${
                                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                                  } hover:bg-primary/5`}
                                >
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-medium text-foreground">{mod.name}</p>
                                      {mod.description && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                          {mod.description}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  {/* All toggle */}
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      onClick={() =>
                                        toggleAllForModule(activeRole.id, mod.id, !allGranted)
                                      }
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                        allGranted
                                          ? 'bg-primary text-white'
                                          : anyGranted
                                          ? 'bg-primary/20 text-primary' :'bg-muted text-muted-foreground hover:bg-muted/80'
                                      }`}
                                      title={allGranted ? 'Revoke all' : 'Grant all'}
                                    >
                                      {allGranted ? (
                                        <Check size={14} />
                                      ) : anyGranted ? (
                                        <span className="text-[10px] font-bold">~</span>
                                      ) : (
                                        <X size={12} />
                                      )}
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
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' :'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500'
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
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check size={11} className="text-green-700 dark:text-green-400" />
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
                      <span>Full Access</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">~</span>
                      </div>
                      <span>Partial Access</span>
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
        )}
      </div>
    </>
  );
}
