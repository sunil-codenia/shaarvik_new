'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Settings, Building2, Plus, Edit2, CheckCircle, XCircle, Loader2, X, Save, Check, Trash2, Bot, Key, Eye, EyeOff, Copy, Bell } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isSystem: boolean;
  status: string;
}

interface Module {
  id: string;
  name: string;
  sort_order: number;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'departments' | 'roles' | 'api-keys'>('general');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
      setIsAdminUser(userRole === 'admin');
      setCheckingAdmin(false);
    };
    checkAdmin();
  }, [user]);

  if (checkingAdmin) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 max-w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-600 text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage system configuration</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {[
            { id: 'general', label: 'General' },
            { id: 'departments', label: 'Departments' },
            { id: 'roles', label: 'Roles & Permissions' },
            { id: 'api-keys', label: 'API Keys' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-500 border-b-2 transition-colors -mb-px ${activeTab === tab.id
                  ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
            </button>
          ))}
          <a
            href="/settings/ai"
            className="px-4 py-2.5 text-sm font-500 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors -mb-px flex items-center gap-1.5"
          >
            <Bot size={13} />
            AI Configuration
          </a>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'departments' && <DepartmentsTab isAdmin={isAdminUser} />}
        {activeTab === 'roles' && <RolesTab isAdmin={isAdminUser} userId={user?.id} />}
        {activeTab === 'api-keys' && <ApiKeysTab />}
      </div>
    </>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab() {
  return (
    <div className="max-w-lg">
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">System Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">System Name</span>
            <span className="font-500 text-foreground">Shaarvik Control Panel</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Organization</span>
            <span className="font-500 text-foreground">Shaarvik Technologies LLP</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Version</span>
            <span className="font-500 text-foreground">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Departments Tab ──────────────────────────────────────────────────────────

function DepartmentsTab({ isAdmin }: { isAdmin: boolean }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mysql/departments');
      const data = await res.json();
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', description: '', status: 'active' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditingId(dept.id);
    setForm({ name: dept.name, description: dept.description || '', status: dept.status });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/mysql/departments/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null, status: form.status }),
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch('/api/mysql/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null }),
        });
        if (!res.ok) throw new Error('Failed to create');
      }
      setShowModal(false);
      fetchDepts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await fetch(`/api/mysql/departments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setDepartments((prev) => prev.map((d) => d.id === id ? { ...d, status: newStatus } : d));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-600 text-foreground">Departments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage organizational departments</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all shadow-sm">
            <Plus size={14} /> Add Department
          </button>
        )}
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Building2 size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No departments yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Status</th>
                {isAdmin && <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-500 text-foreground">{dept.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{dept.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-500 ${dept.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {dept.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {dept.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(dept)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit"><Edit2 size={13} /></button>
                        <button onClick={() => toggleStatus(dept.id, dept.status)} className={`p-1.5 rounded-md transition-colors ${dept.status === 'active' ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50' : 'text-muted-foreground hover:text-green-600 hover:bg-green-50'}`} title={dept.status === 'active' ? 'Deactivate' : 'Activate'}>
                          {dept.status === 'active' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-600 text-foreground">{editingId ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{formError}</div>}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border bg-white text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-600 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

interface ApiService {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  category: string;
  docsUrl: string;
}

const ALL_SERVICES: ApiService[] = [
  {
    id: 'resend',
    label: 'Resend API Key',
    description: 'Used for sending renewal reminder emails to clients.',
    placeholder: 're_********************************',
    category: 'Email',
    docsUrl: 'https://resend.com/docs/api-reference/introduction',
  },
  {
    id: 'twilio_account_sid',
    label: 'Twilio Account SID',
    description: 'Your Twilio Account SID.',
    placeholder: 'AC********************************',
    category: 'SMS',
    docsUrl: 'https://www.twilio.com/docs/usage/api',
  },
  {
    id: 'twilio_auth_token',
    label: 'Twilio Auth Token',
    description: 'Your Twilio Auth Token.',
    placeholder: '********************************',
    category: 'SMS',
    docsUrl: 'https://www.twilio.com/docs/usage/api',
  },
  {
    id: 'twilio_from_number',
    label: 'Twilio From Number',
    description: 'Phone number (E.164 format).',
    placeholder: '+1234567890',
    category: 'SMS',
    docsUrl: 'https://www.twilio.com/docs/phone-numbers',
  },
  {
    id: 'stripe_secret',
    label: 'Stripe Secret Key',
    description: 'Used for payments.',
    placeholder: 'sk_live_********************************',
    category: 'Payments',
    docsUrl: 'https://stripe.com/docs/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI API Key',
    description: 'Used for AI features.',
    placeholder: 'sk-********************************',
    category: 'AI',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
  },
  {
    id: 'google_maps',
    label: 'Google Maps API Key',
    description: 'Used for maps.',
    placeholder: 'AIzaSy********************************',
    category: 'Maps',
    docsUrl: 'https://developers.google.com/maps/documentation/javascript/get-api-key',
  },
  {
    id: 'whatsapp_token',
    label: 'WhatsApp Business Token',
    description: 'Used for WhatsApp messaging.',
    placeholder: 'EAA********************************',
    category: 'Messaging',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(ALL_SERVICES.map(s => s.category)))];

function ApiKeysTab() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [customKeys, setCustomKeys] = useState<{ id: string; label: string; category: string; value: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customForm, setCustomForm] = useState({ label: '', category: '', value: '' });
  const [loadingKeys, setLoadingKeys] = useState(true);

  // Load saved keys from MySQL
  useEffect(() => {
    const loadKeys = async () => {
      setLoadingKeys(true);
      try {
        const res = await fetch('/api/mysql/api-keys');
        const data = await res.json();
        if (data) {
          const loaded: Record<string, string> = {};
          data.forEach((row: any) => { loaded[row.key_id] = row.value || ''; });
          setKeys(loaded);
        }
      } catch (err) {
        console.error('Error loading API keys:', err);
      } finally {
        setLoadingKeys(false);
      }
    };
    loadKeys();
  }, []);

  const handleSave = async (serviceId: string) => {
    const value = keys[serviceId] || '';
    if (!value.trim()) return;
    setSaving(prev => ({ ...prev, [serviceId]: true }));
    try {
      const res = await fetch('/api/mysql/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: serviceId, value: value.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(prev => ({ ...prev, [serviceId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [serviceId]: false })), 2000);
    } catch (err) {
      console.error('Error saving API key:', err);
    } finally {
      setSaving(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleCopy = (serviceId: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(prev => ({ ...prev, [serviceId]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [serviceId]: false })), 1500);
    });
  };

  const handleAddCustom = () => {
    if (!customForm.label.trim()) return;
    setCustomKeys(prev => [...prev, { id: `custom_${Date.now()}`, label: customForm.label, category: customForm.category || 'Custom', value: customForm.value }]);
    setCustomForm({ label: '', category: '', value: '' });
    setShowAddModal(false);
  };

  const removeCustomKey = (id: string) => {
    setCustomKeys(prev => prev.filter(k => k.id !== id));
  };

  const filteredServices = activeCategory === 'All'
    ? ALL_SERVICES
    : ALL_SERVICES.filter(s => s.category === activeCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-600 text-foreground">API Keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Store and manage third-party API credentials for integrations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus size={14} /> Add Custom Key
        </button>
      </div>

      {/* Renewal Reminders notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 mb-4">
        <Bell size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Renewal Reminders:</strong> Add your <strong>Resend API Key</strong> (Email) and <strong>Twilio credentials</strong> (SMS) below to activate automated renewal reminder delivery. Until keys are saved, reminders will be scheduled but channels will be skipped gracefully.
        </p>
      </div>

      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 mb-5">
        <Key size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          API keys are stored securely and used for service integrations. Never share your keys publicly. Keys marked as saved are ready to use once the integration is wired up.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-500 transition-colors ${activeCategory === cat
                ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredServices.map((service) => {
          const value = keys[service.id] || '';
          const isVisible = visible[service.id] || false;
          const isSaved = saved[service.id] || false;
          const isSaving = saving[service.id] || false;
          const isCopied = copied[service.id] || false;
          const hasValue = value.trim().length > 0;

          return (
            <div key={service.id} className="bg-white border border-border rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-600 text-foreground">{service.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-500 bg-muted text-muted-foreground">{service.category}</span>
                    {hasValue && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-500 bg-green-50 text-green-700 flex items-center gap-1">
                        <CheckCircle size={9} /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{service.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={value}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [service.id]: e.target.value }))}
                        placeholder={service.placeholder}
                        className="w-full px-3 py-2 pr-9 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono placeholder:font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setVisible((prev) => ({ ...prev, [service.id]: !isVisible }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleCopy(service.id, value)}
                      disabled={!hasValue}
                      title="Copy key"
                      className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCopied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    </button>
                    <button
                      onClick={() => handleSave(service.id)}
                      disabled={!hasValue || isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-600 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : isSaved ? (
                        <><Check size={11} /> Saved</>
                      ) : (
                        <><Save size={11} /> Save</>
                      )}
                    </button>
                  </div>
                </div>
                <a
                  href={service.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex-shrink-0 mt-1"
                >
                  Docs ↗
                </a>
              </div>
            </div>
          );
        })}

        {customKeys.filter((k) => activeCategory === 'All' || k.category === activeCategory).map((ck) => (
          <div key={ck.id} className="bg-white border border-border rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-600 text-foreground">{ck.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-500 bg-muted text-muted-foreground">{ck.category}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <input
                      type={visible[ck.id] ? 'text' : 'password'}
                      value={ck.value}
                      onChange={(e) => setCustomKeys((prev) => prev.map((k) => k.id === ck.id ? { ...k, value: e.target.value } : k))}
                      placeholder="Enter API key value"
                      className="w-full px-3 py-2 pr-9 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono placeholder:font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible((prev) => ({ ...prev, [ck.id]: !visible[ck.id] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {visible[ck.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button
                    onClick={() => removeCustomKey(ck.id)}
                    className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-600 text-foreground">Add Custom API Key</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Key Label <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={customForm.label}
                  onChange={(e) => setCustomForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. SendGrid API Key"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Category</label>
                <input
                  type="text"
                  value={customForm.category}
                  onChange={(e) => setCustomForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Email, SMS, Payments"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">API Key Value</label>
                <input
                  type="text"
                  value={customForm.value}
                  onChange={(e) => setCustomForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="Paste your API key here"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono placeholder:font-sans"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border bg-white text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button
                  onClick={handleAddCustom}
                  disabled={!customForm.label.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-600 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  <Plus size={13} /> Add Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', departmentId: '', status: 'active' });
  const [addingRole, setAddingRole] = useState(false);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);

  const permKey = (roleId: string, moduleId: string) => `${roleId}::${moduleId}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modsRes, rolesRes, permsRes, deptsRes] = await Promise.all([
        fetch('/api/mysql/modules').then(r => r.json()),
        fetch('/api/mysql/roles').then(r => r.json()),
        fetch('/api/mysql/role-permissions').then(r => r.json()),
        fetch('/api/mysql/departments').then(r => r.json()),
      ]);

      setModules(modsRes || []);
      setRoles(rolesRes || []);
      setDepartments((deptsRes || []).filter((d: any) => d.status === 'active'));

      const permMap: Record<string, Permission> = {};
      (permsRes || []).forEach((p: Permission) => {
        permMap[permKey(p.role_id, p.module_id)] = p;
      });
      setPermissions(permMap);

      if (rolesRes && rolesRes.length > 0 && !selectedRole) {
        setSelectedRole(rolesRes[0].id);
      }
    } catch (err) {
      console.error('Error fetching roles data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePerm = (roleId: string, moduleId: string, key: PermKey) => {
    const k = permKey(roleId, moduleId);
    const existing = permissions[k] || { role_id: roleId, module_id: moduleId, can_view: false, can_create: false, can_edit: false, can_delete: false };
    const updated = { ...existing, [key]: !existing[key] };
    if ((key === 'can_create' || key === 'can_edit' || key === 'can_delete') && updated[key]) updated.can_view = true;
    if (key === 'can_view' && !updated.can_view) { updated.can_create = false; updated.can_edit = false; updated.can_delete = false; }
    setPermissions((prev) => ({ ...prev, [k]: updated }));
  };

  const toggleAllForRole = (roleId: string, value: boolean) => {
    const updates: Record<string, Permission> = { ...permissions };
    modules.forEach((mod) => {
      const k = permKey(roleId, mod.id);
      updates[k] = { ...(updates[k] || { role_id: roleId, module_id: mod.id }), can_view: value, can_create: value, can_edit: value, can_delete: value };
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
        const p = permissions[k] || { role_id: selectedRole, module_id: mod.id, can_view: false, can_create: false, can_edit: false, can_delete: false };
        return { role_id: selectedRole, module_id: mod.id, can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
      });
      const res = await fetch('/api/mysql/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePerms }),
      });
      if (!res.ok) throw new Error('Failed to save permissions');
      setSaveMsg('Permissions saved successfully');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg('Error: ' + (err.message || 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openAddRole = () => {
    setEditingRoleId(null);
    setRoleForm({ name: '', description: '', departmentId: '', status: 'active' });
    setRoleFormError(null);
    setShowRoleModal(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleForm({ name: role.name, description: role.description || '', departmentId: role.departmentId || '', status: role.status });
    setRoleFormError(null);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) { setRoleFormError('Name is required.'); return; }
    setAddingRole(true);
    try {
      if (editingRoleId) {
        const res = await fetch(`/api/mysql/roles/${editingRoleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roleForm.name.trim(), description: roleForm.description.trim() || null, departmentId: roleForm.departmentId || null, status: roleForm.status }),
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch('/api/mysql/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roleForm.name.trim(), description: roleForm.description.trim() || null, departmentId: roleForm.departmentId || null }),
        });
        if (!res.ok) throw new Error('Failed to create');
        const data = await res.json();
        setSelectedRole(data.id);
      }
      setShowRoleModal(false);
      fetchData();
    } catch (err: any) {
      setRoleFormError(err.message || 'Failed to save role.');
    } finally {
      setAddingRole(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isSystem) { alert('System roles cannot be deleted.'); return; }
    if (!confirm('Delete this role? This will remove all associated permissions.')) return;
    await fetch(`/api/mysql/roles/${roleId}`, { method: 'DELETE' });
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    if (selectedRole === roleId) setSelectedRole(roles[0]?.id || null);
  };

  const toggleRoleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    await fetch(`/api/mysql/roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setRoles((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
  };

  const activeRole = roles.find((r) => r.id === selectedRole);

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-600 text-foreground">Roles & Permissions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage roles and module-level access control</p>
        </div>
        {isAdmin && (
          <button onClick={openAddRole} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all shadow-sm">
            <Plus size={14} /> Add Role
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Role List */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground">Roles</p>
            </div>
            <ul className="divide-y divide-border">
              {roles.map((role) => (
                <li key={role.id}>
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${selectedRole === role.id ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-500 truncate ${selectedRole === role.id ? 'text-primary' : 'text-foreground'}`}>{role.name}</p>
                      {role.departmentName && <p className="text-xs text-muted-foreground truncate">{role.departmentName}</p>}
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${role.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {isAdmin && !role.isSystem && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEditRole(role)} className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"><Edit2 size={11} /></button>
                        <button onClick={() => deleteRole(role.id)} className="p-1 rounded text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="flex-1 min-w-0">
          {activeRole ? (
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div>
                  <p className="text-sm font-600 text-foreground">{activeRole.name}</p>
                  <p className="text-xs text-muted-foreground">{activeRole.departmentName || 'No department'}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {saveMsg && (
                      <span className={`text-xs font-500 ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>
                    )}
                    <button onClick={() => toggleAllForRole(activeRole.id, true)} className="px-2.5 py-1.5 text-xs rounded-md border border-border bg-white text-foreground hover:bg-muted transition-colors">Grant All</button>
                    <button onClick={() => toggleAllForRole(activeRole.id, false)} className="px-2.5 py-1.5 text-xs rounded-md border border-border bg-white text-foreground hover:bg-muted transition-colors">Revoke All</button>
                    <button onClick={savePermissions} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60">
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wider">Module</th>
                      {PERM_KEYS.map((pk) => (
                        <th key={pk.key} className="text-center px-3 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wider">{pk.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modules.map((mod) => {
                      const k = permKey(activeRole.id, mod.id);
                      const perm = permissions[k] || { role_id: activeRole.id, module_id: mod.id, can_view: false, can_create: false, can_edit: false, can_delete: false };
                      return (
                        <tr key={mod.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-500 text-foreground">{mod.name}</td>
                          {PERM_KEYS.map((pk) => (
                            <td key={pk.key} className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => isAdmin && togglePerm(activeRole.id, mod.id, pk.key)}
                                disabled={!isAdmin}
                                className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-colors ${perm[pk.key]
                                    ? 'bg-primary text-white' : 'bg-muted text-muted-foreground border border-border'
                                  } ${isAdmin ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                              >
                                {perm[pk.key] && <Check size={12} />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl shadow-sm flex items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">Select a role to manage permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRoleModal(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-600 text-foreground">{editingRoleId ? 'Edit Role' : 'Add Role'}</h2>
              <button onClick={() => setShowRoleModal(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveRole} className="p-5 space-y-4">
              {roleFormError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{roleFormError}</div>}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Role Name <span className="text-red-500">*</span></label>
                <input type="text" value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sales Executive" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Description</label>
                <input type="text" value={roleForm.description} onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Department</label>
                <select value={roleForm.departmentId} onChange={(e) => setRoleForm((f) => ({ ...f, departmentId: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">— No Department —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-foreground">Status</label>
                <select value={roleForm.status} onChange={(e) => setRoleForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border bg-white text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={addingRole} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-600 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {addingRole ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingRoleId ? 'Save' : 'Add Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
