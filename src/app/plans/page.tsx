'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutList, Plus, Edit2, Trash2, X, Save, AlertCircle, Search, RefreshCw, CheckSquare, Square, DollarSign, Calendar, Clock, Building2, Puzzle, ToggleLeft, ToggleRight } from 'lucide-react';

interface SaasPlatform {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
}

interface SaasModule {
  id: string;
  platformId: string;
  name: string;
  apiEndpoint: string | null;
  description: string | null;
  isActive: boolean;
}

interface SaasPlan {
  id: string;
  platformId: string;
  platformName: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  trialDays: number | null;
  description: string | null;
  isActive: boolean;
  moduleCount: number;
  createdAt: string;
}

interface PlanModule {
  planId: string;
  moduleId: string;
}

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const emptyForm = {
  platformId: '',
  name: '',
  price: '',
  billingCycle: 'monthly\' as \'monthly\' | \'quarterly\' | \'yearly',
  trialDays: '',
  description: '',
  selectedModuleIds: [] as string[],
};

export default function PlansPage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [platforms, setPlatforms] = useState<SaasPlatform[]>([]);
  const [allModules, setAllModules] = useState<SaasModule[]>([]);
  const [planModules, setPlanModules] = useState<PlanModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Active plan for module view
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Modals
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState(emptyForm);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);

  async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init?.headers || {}) },
      ...init,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed with status ${response.status}`);
    }

    return payload as T;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [platformsRes, modulesRes, plansRes, planModulesRes] = await Promise.all([
        fetchJson<SaasPlatform[]>('/api/mysql/saas-platforms'),
        fetchJson<SaasModule[]>('/api/mysql/saas-modules'),
        fetchJson<any[]>('/api/mysql/saas-plans'),
        fetchJson<PlanModule[]>('/api/mysql/saas-plan-modules'),
      ]);
      const mappedPlatforms: SaasPlatform[] = (platformsRes || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        logoUrl: p.logoUrl ?? p.logo_url ?? null,
        isActive: Boolean(p.isActive ?? p.is_active),
      }));

      const mappedModules: SaasModule[] = (modulesRes || []).map((m: any) => ({
        id: String(m.id),
        platformId: String(m.platformId ?? m.platform_id),
        name: m.name,
        apiEndpoint: m.apiEndpoint ?? m.api_endpoint ?? null,
        description: m.description ?? null,
        isActive: Boolean(m.isActive ?? m.is_active),
      }));

      const mappedPlanModules: PlanModule[] = (planModulesRes || []).map((pm: any) => ({
        planId: String(pm.planId ?? pm.plan_id),
        moduleId: String(pm.moduleId ?? pm.module_id),
      }));

      const mappedPlans: SaasPlan[] = (plansRes || []).map((p: any) => ({
        id: String(p.id),
        platformId: String(p.platformId ?? p.platform_id ?? ''),
        platformName: mappedPlatforms.find(platform => platform.id === String(p.platformId ?? p.platform_id))?.name || p.platformName || p.platform_name || 'Unknown',
        name: p.name,
        price: Number(p.price),
        billingCycle: (p.billingCycle ?? p.billing_cycle ?? 'monthly') as 'monthly' | 'quarterly' | 'yearly',
        trialDays: p.trialDays ?? p.trial_days ?? null,
        description: p.description ?? null,
        isActive: Boolean(p.isActive ?? p.is_active),
        moduleCount: Number(p.moduleCount ?? p.module_count ?? mappedPlanModules.filter(pm => pm.planId === String(p.id)).length),
        createdAt: p.createdAt ?? p.created_at,
      }));

      setPlatforms(mappedPlatforms.filter((platform) => platform.isActive));
      setAllModules(mappedModules);
      setPlanModules(mappedPlanModules);
      setPlans(mappedPlans);

      setActivePlanId(prev => {
        if (prev) return prev;
        return mappedPlans.length > 0 ? mappedPlans[0].id : null;
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Modules available for the selected platform in the form
  const formPlatformModules = allModules.filter(
    m => m.platformId === form.platformId && m.isActive
  );

  const toggleModuleSelection = (moduleId: string) => {
    setForm(prev => ({
      ...prev,
      selectedModuleIds: prev.selectedModuleIds.includes(moduleId)
        ? prev.selectedModuleIds.filter(id => id !== moduleId)
        : [...prev.selectedModuleIds, moduleId],
    }));
  };

  const handlePlatformChange = (platformId: string) => {
    setForm(prev => ({ ...prev, platformId, selectedModuleIds: [] }));
  };

  // ── Create Plan ────────────────────────────────────────────────────────────
  const handleAddPlan = async () => {
    if (!form.name.trim() || !form.platformId || !form.price) return;
    setSaving(true);
    setError(null);
    try {
      const newPlan = await fetchJson<SaasPlan>('/api/mysql/saas-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: form.platformId,
          name: form.name.trim(),
          price: parseFloat(form.price),
          billingCycle: form.billingCycle,
          trialDays: form.trialDays ? parseInt(form.trialDays) : null,
          description: form.description.trim() || null,
          isActive: true,
          moduleIds: form.selectedModuleIds,
        }),
      });

      setShowAddPlan(false);
      setForm(emptyForm);
      setActivePlanId(newPlan?.id || null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Plan ──────────────────────────────────────────────────────────────
  const openEditPlan = (plan: SaasPlan) => {
    const currentModuleIds = planModules
      .filter(pm => pm.planId === plan.id)
      .map(pm => pm.moduleId);
    setEditingPlan(plan);
    setForm({
      platformId: plan.platformId,
      name: plan.name,
      price: String(plan.price),
      billingCycle: plan.billingCycle,
      trialDays: plan.trialDays ? String(plan.trialDays) : '',
      description: plan.description || '',
      selectedModuleIds: currentModuleIds,
    });
    setShowEditPlan(true);
  };

  const handleEditPlan = async () => {
    if (!editingPlan || !form.name.trim() || !form.price) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/mysql/saas-plans/${encodeURIComponent(editingPlan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: editingPlan.platformId,
          name: form.name.trim(),
          price: parseFloat(form.price),
          billingCycle: form.billingCycle,
          trialDays: form.trialDays ? parseInt(form.trialDays) : null,
          description: form.description.trim() || null,
          moduleIds: form.selectedModuleIds,
        }),
      });

      setShowEditPlan(false);
      setEditingPlan(null);
      setForm(emptyForm);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Active ──────────────────────────────────────────────────────────
  const handleTogglePlan = async (plan: SaasPlan) => {
    await fetchJson(`/api/mysql/saas-plans/${encodeURIComponent(plan.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    await fetchData();
  };

  // ── Delete Plan ────────────────────────────────────────────────────────────
  const handleDeletePlan = async (id: string) => {
    await fetchJson(`/api/mysql/saas-plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (activePlanId === id) setActivePlanId(null);
    setDeletingPlanId(null);
    await fetchData();
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.platformName.toLowerCase().includes(search.toLowerCase())
  );

  const activePlan = plans.find(p => p.id === activePlanId) || null;
  const activePlanModuleIds = planModules
    .filter(pm => pm.planId === activePlanId)
    .map(pm => pm.moduleId);
  const activePlanModules = allModules.filter(m => activePlanModuleIds.includes(m.id));

  const formatPrice = (price: number, cycle: string) => {
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
    return `${formatted}/${cycle === 'monthly' ? 'mo' : cycle === 'quarterly' ? 'qtr' : 'yr'}`;
  };

  const cycleColor = (cycle: string) => {
    if (cycle === 'monthly') return { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd' };
    if (cycle === 'quarterly') return { bg: 'rgba(168,85,247,0.12)', color: '#c4b5fd' };
    return { bg: 'rgba(16,185,129,0.12)', color: '#6ee7b7' };
  };

  // ── Modal Form ─────────────────────────────────────────────────────────────
  const PlanFormModal = ({ isEdit }: { isEdit: boolean }) => {
    const title = isEdit ? 'Edit Plan' : 'Create New Plan';
    const onClose = () => {
      if (isEdit) { setShowEditPlan(false); setEditingPlan(null); }
      else setShowAddPlan(false);
      setForm(emptyForm);
      setError(null);
    };
    const onSave = isEdit ? handleEditPlan : handleAddPlan;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]"
          style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <LayoutList size={16} style={{ color: '#93c5fd' }} />
              </div>
              <h2 className="text-white font-semibold text-[15px]">{title}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Platform (disabled in edit) */}
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                SaaS Platform <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                value={form.platformId}
                onChange={(e) => handlePlatformChange(e.target.value)}
                disabled={isEdit}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white outline-none transition-all"
                style={{ background: isEdit ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: isEdit ? 0.6 : 1 }}
              >
                <option value="" style={{ background: '#0f1f3d' }}>Select platform…</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#0f1f3d' }}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Plan Name */}
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Plan Name <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Starter, Growth, Enterprise"
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Price + Billing Cycle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  Price (₹) <span style={{ color: '#f87171' }}>*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg pl-7 pr-3 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  Billing Cycle <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm(prev => ({ ...prev, billingCycle: e.target.value as any }))}
                  className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {BILLING_CYCLES.map(c => (
                    <option key={c.value} value={c.value} style={{ background: '#0f1f3d' }}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trial Period */}
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Trial Period (days) <span className="text-slate-500 font-normal">— optional</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.trialDays}
                onChange={(e) => setForm(prev => ({ ...prev, trialDays: e.target.value }))}
                placeholder="e.g. 14"
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Description <span className="text-slate-500 font-normal">— optional</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this plan…"
                rows={2}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Module Selection */}
            <div>
              <label className="block text-[12px] font-medium mb-2" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Included Modules
                {form.platformId && (
                  <span className="ml-2 font-normal" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    ({form.selectedModuleIds.length} of {formPlatformModules.length} selected)
                  </span>
                )}
              </label>

              {!form.platformId ? (
                <div className="rounded-lg px-4 py-6 text-center text-[13px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.5)' }}>
                  Select a platform first to see available modules
                </div>
              ) : formPlatformModules.length === 0 ? (
                <div className="rounded-lg px-4 py-6 text-center text-[13px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.5)' }}>
                  No active modules found for this platform
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {formPlatformModules.map((mod, idx) => {
                    const selected = form.selectedModuleIds.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModuleSelection(mod.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100"
                        style={{
                          background: selected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                          borderBottom: idx < formPlatformModules.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}
                        onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      >
                        <div style={{ color: selected ? '#93c5fd' : 'rgba(148,163,184,0.4)', flexShrink: 0 }}>
                          {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: selected ? '#e2e8f0' : 'rgba(148,163,184,0.8)' }}>
                            {mod.name}
                          </p>
                          {mod.description && (
                            <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
                              {mod.description}
                            </p>
                          )}
                        </div>
                        {mod.apiEndpoint && (
                          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }}>
                            {mod.apiEndpoint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || !form.name.trim() || !form.platformId || !form.price}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: (saving || !form.name.trim() || !form.platformId || !form.price)
                  ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.9)',
                color: '#fff',
              }}
            >
              {saving ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <Save size={14} />
              )}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="flex flex-col h-full min-h-0" style={{ background: '#060e1e' }}>
        {/* Page Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,31,61,0.6)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <LayoutList size={18} style={{ color: '#93c5fd' }} />
            </div>
            <div>
              <h1 className="text-white font-semibold text-[16px] leading-tight">Plans</h1>
              <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
                {plans.length} plan{plans.length !== 1 ? 's' : ''} across {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'rgba(148,163,184,0.6)' }}
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => { setForm(emptyForm); setError(null); setShowAddPlan(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: 'rgba(59,130,246,0.85)', color: '#fff' }}
            >
              <Plus size={15} />
              New Plan
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && !showAddPlan && !showEditPlan && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-[13px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Plans List */}
          <div className="w-[340px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {/* Search */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.4)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search plans…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] text-white placeholder-slate-500 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            {/* Plans List */}
            <div className="flex-1 overflow-y-auto py-2">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <LayoutList size={32} style={{ color: 'rgba(148,163,184,0.2)' }} className="mb-3" />
                  <p className="text-[13px] font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {search ? 'No plans match your search' : 'No plans yet'}
                  </p>
                  {!search && (
                    <p className="text-[12px] mt-1" style={{ color: 'rgba(148,163,184,0.3)' }}>
                      Click "New Plan" to create one
                    </p>
                  )}
                </div>
              ) : (
                filteredPlans.map(plan => {
                  const isActive = plan.id === activePlanId;
                  const cc = cycleColor(plan.billingCycle);
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setActivePlanId(plan.id)}
                      className="w-full text-left px-4 py-3.5 transition-all duration-100 relative"
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[13px] font-semibold truncate" style={{ color: isActive ? '#e2e8f0' : 'rgba(226,232,240,0.85)' }}>
                              {plan.name}
                            </p>
                            {!plan.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(148,163,184,0.55)' }}>
                              <Building2 size={10} />
                              {plan.platformName}
                            </span>
                            <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: 10 }}>·</span>
                            <span className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(148,163,184,0.55)' }}>
                              <Puzzle size={10} />
                              {plan.moduleCount} module{plan.moduleCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[13px] font-semibold" style={{ color: '#93c5fd' }}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(plan.price)}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cc.bg, color: cc.color }}>
                            {plan.billingCycle}
                          </span>
                        </div>
                      </div>
                      {plan.trialDays && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: 'rgba(251,191,36,0.7)' }}>
                          <Clock size={10} />
                          {plan.trialDays}-day trial
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Plan Detail */}
          <div className="flex-1 overflow-y-auto">
            {!activePlan ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <LayoutList size={48} style={{ color: 'rgba(148,163,184,0.15)' }} className="mb-4" />
                <p className="text-[14px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  Select a plan to view details
                </p>
              </div>
            ) : (
              <div className="p-6">
                {/* Plan Header */}
                <div
                  className="rounded-2xl p-5 mb-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-white font-bold text-[18px]">{activePlan.name}</h2>
                        {!activePlan.isActive && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
                        <Building2 size={12} />
                        <span>{activePlan.platformName}</span>
                      </div>
                      {activePlan.description && (
                        <p className="mt-2 text-[13px]" style={{ color: 'rgba(148,163,184,0.7)' }}>
                          {activePlan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <button
                        onClick={() => handleTogglePlan(activePlan)}
                        className="p-2 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', color: activePlan.isActive ? '#6ee7b7' : 'rgba(148,163,184,0.5)' }}
                        title={activePlan.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {activePlan.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => openEditPlan(activePlan)}
                        className="p-2 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.7)' }}
                        title="Edit plan"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingPlanId(activePlan.id)}
                        className="p-2 rounded-lg transition-all"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
                        title="Delete plan"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      {
                        icon: <DollarSign size={14} />,
                        label: 'Price',
                        value: formatPrice(activePlan.price, activePlan.billingCycle),
                        color: '#93c5fd',
                      },
                      {
                        icon: <Calendar size={14} />,
                        label: 'Billing',
                        value: activePlan.billingCycle.charAt(0).toUpperCase() + activePlan.billingCycle.slice(1),
                        color: cycleColor(activePlan.billingCycle).color,
                      },
                      {
                        icon: <Clock size={14} />,
                        label: 'Trial',
                        value: activePlan.trialDays ? `${activePlan.trialDays} days` : 'None',
                        color: activePlan.trialDays ? '#fbbf24' : 'rgba(148,163,184,0.5)',
                      },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'rgba(148,163,184,0.5)' }}>
                          {stat.icon}
                          <span className="text-[11px]">{stat.label}</span>
                        </div>
                        <p className="text-[14px] font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modules Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Puzzle size={15} style={{ color: 'rgba(148,163,184,0.6)' }} />
                    <h3 className="text-[13px] font-semibold" style={{ color: 'rgba(148,163,184,0.8)' }}>
                      Included Modules
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>
                      {activePlanModules.length}
                    </span>
                  </div>

                  {activePlanModules.length === 0 ? (
                    <div className="rounded-xl px-5 py-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                      <Puzzle size={28} style={{ color: 'rgba(148,163,184,0.2)' }} className="mx-auto mb-2" />
                      <p className="text-[13px]" style={{ color: 'rgba(148,163,184,0.4)' }}>No modules included in this plan</p>
                      <button
                        onClick={() => openEditPlan(activePlan)}
                        className="mt-3 text-[12px] px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}
                      >
                        Add modules
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {activePlanModules.map(mod => (
                        <div
                          key={mod.id}
                          className="flex items-center gap-3 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                            <Puzzle size={13} style={{ color: '#93c5fd' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium" style={{ color: '#e2e8f0' }}>{mod.name}</p>
                            {mod.description && (
                              <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{mod.description}</p>
                            )}
                          </div>
                          {mod.apiEndpoint && (
                            <span className="text-[11px] font-mono flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.45)' }}>
                              {mod.apiEndpoint}
                            </span>
                          )}
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={mod.isActive
                              ? { background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }
                              : { background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                          >
                            {mod.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showAddPlan && <PlanFormModal isEdit={false} />}
        {showEditPlan && <PlanFormModal isEdit={true} />}

        {/* Delete Confirmation */}
        {deletingPlanId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingPlanId(null); }}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <AlertCircle size={20} style={{ color: '#f87171' }} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[15px]">Delete Plan</h3>
                  <p className="text-[12px]" style={{ color: 'rgba(148,163,184,0.6)' }}>This action cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] mb-5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Are you sure you want to delete <strong className="text-white">{plans.find(p => p.id === deletingPlanId)?.name}</strong>? All module associations will be removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingPlanId(null)}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePlan(deletingPlanId)}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-medium"
                  style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
