'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Puzzle, Globe, Server, Edit2, Trash2, X, Save, AlertCircle, ChevronRight, Link2, ToggleLeft, ToggleRight, Search, RefreshCw, CreditCard, ChevronDown, Check } from 'lucide-react';

interface SaasPlatform {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  serverType: 'same_server' | 'external';
  apiBaseUrl: string | null;
  isActive: boolean;
  createdAt: string;
  moduleCount?: number;
}

interface SaasModule {
  id: string;
  platformId: string;
  name: string;
  apiEndpoint: string | null;
  description: string | null;
  isActive: boolean;
  externalId: number | null;
  createdAt: string;
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
  moduleIds?: string[];
}

const emptyPlatformForm = {
  name: '',
  logoUrl: '',
  description: '',
  serverType: 'same_server' as 'same_server' | 'external',
  apiBaseUrl: '',
};

const emptyModuleForm = {
  name: '',
  apiEndpoint: '',
  description: '',
};

const emptyPlanForm = {
  name: '',
  price: '',
  billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  trialDays: '',
  description: '',
  moduleIds: [] as string[],
};

export default function CompaniesPage() {
  const [platforms, setPlatforms] = useState<SaasPlatform[]>([]);
  const [modules, setModules] = useState<SaasModule[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatformId, setActivePlatformId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [showEditPlatform, setShowEditPlatform] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [deletingPlatformId, setDeletingPlatformId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // Forms
  const [platformForm, setPlatformForm] = useState(emptyPlatformForm);
  const [editingPlatform, setEditingPlatform] = useState<SaasPlatform | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
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
      const [platformsRes, modulesRes, plansRes] = await Promise.all([
        fetchJson<SaasPlatform[]>('/api/mysql/saas-platforms'),
        fetchJson<SaasModule[]>('/api/mysql/saas-modules'),
        fetchJson<SaasPlan[]>('/api/mysql/saas-plans'),
      ]);

      setPlatforms(platformsRes);
      setModules(modulesRes);
      setPlans(plansRes);

      if (!activePlatformId && platformsRes.length > 0) {
        setActivePlatformId(platformsRes[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    }
    setLoading(false);
  }, [activePlatformId]);

  useEffect(() => { fetchData(); }, []);

  // ── Platform CRUD ──────────────────────────────────────────────────────────

  const handleAddPlatform = async () => {
    if (!platformForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson('/api/mysql/saas-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: platformForm.name.trim(),
          logoUrl: platformForm.logoUrl.trim() || null,
          description: platformForm.description.trim() || null,
          serverType: platformForm.serverType,
          apiBaseUrl: platformForm.apiBaseUrl.trim() || null,
        }),
      });
      setShowAddPlatform(false);
      setPlatformForm(emptyPlatformForm);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPlatform = async () => {
    if (!editingPlatform || !platformForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/mysql/saas-platforms/${encodeURIComponent(editingPlatform.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: platformForm.name.trim(),
          logoUrl: platformForm.logoUrl.trim() || null,
          description: platformForm.description.trim() || null,
          serverType: platformForm.serverType,
          apiBaseUrl: platformForm.apiBaseUrl.trim() || null,
        }),
      });
      setShowEditPlatform(false);
      setEditingPlatform(null);
      setPlatformForm(emptyPlatformForm);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePlatform = async (platform: SaasPlatform) => {
    try {
      await fetchJson(`/api/mysql/saas-platforms/${encodeURIComponent(platform.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !platform.isActive }),
      });
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    }
  };

  const handleDeletePlatform = async (id: string) => {
    try {
      await fetchJson(`/api/mysql/saas-platforms/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (activePlatformId === id) setActivePlatformId(null);
      setDeletingPlatformId(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    }
  };

  // ── Plan CRUD ──────────────────────────────────────────────────────────────

  const handleAddPlan = async (externalModules: { id: number; name: string }[]) => {
    if (!planForm.name.trim() || !activePlatformId) return;
    setSaving(true);
    setError(null);
    try {
      // Sync external modules if any
      let finalModuleIds = planForm.moduleIds;
      if (externalModules.length > 0) {
        const syncRes = await fetchJson<string[]>('/api/mysql/saas-modules/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platformId: activePlatformId, modules: externalModules }),
        });
        finalModuleIds = [...new Set([...finalModuleIds, ...syncRes])];
      }

      await fetchJson('/api/mysql/saas-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: activePlatformId,
          name: planForm.name.trim(),
          price: Number(planForm.price),
          billingCycle: planForm.billingCycle,
          trialDays: planForm.trialDays || null,
          description: planForm.description.trim() || null,
          moduleIds: finalModuleIds,
        }),
      });
      setShowAddPlan(false);
      setPlanForm(emptyPlanForm);
      await fetchData();
      
      // Notify user about background registration
      alert(`Plan "${planForm.name}" created successfully. External company registration for "${activePlatform?.name}" has been initiated in the background (this may take 10-12 minutes).`);
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditPlan = async (externalModules: { id: number; name: string }[]) => {
    if (!editingPlan || !planForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalModuleIds = planForm.moduleIds;
      if (externalModules.length > 0) {
        const syncRes = await fetchJson<string[]>('/api/mysql/saas-modules/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platformId: activePlatformId, modules: externalModules }),
        });
        finalModuleIds = [...new Set([...finalModuleIds, ...syncRes])];
      }

      await fetchJson(`/api/mysql/saas-plans/${encodeURIComponent(editingPlan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planForm.name.trim(),
          price: Number(planForm.price),
          billingCycle: planForm.billingCycle,
          trialDays: planForm.trialDays || null,
          description: planForm.description.trim() || null,
          moduleIds: finalModuleIds,
        }),
      });
      setShowEditPlan(false);
      setEditingPlan(null);
      setPlanForm(emptyPlanForm);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePlan = async (plan: SaasPlan) => {
    try {
      await fetchJson(`/api/mysql/saas-plans/${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await fetchJson(`/api/mysql/saas-plans/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setDeletingPlanId(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredPlatforms = platforms.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const activePlatform = platforms.find(p => p.id === activePlatformId) || null;
  const platformModules = modules.filter(m => m.platformId === activePlatformId);
  const platformPlans = plans.filter(p => p.platformId === activePlatformId);

  const openEditPlatform = (p: SaasPlatform) => {
    setEditingPlatform(p);
    setPlatformForm({
      name: p.name,
      logoUrl: p.logoUrl || '',
      description: p.description || '',
      serverType: p.serverType,
      apiBaseUrl: p.apiBaseUrl || '',
    });
    setShowEditPlatform(true);
  };

  const openEditPlan = async (plan: SaasPlan) => {
    setLoading(true);
    try {
      // Fetch full plan with moduleIds
      const fullPlan = await fetchJson<SaasPlan>(`/api/mysql/saas-plans/${encodeURIComponent(plan.id)}`);
      setEditingPlan(fullPlan);
      setPlanForm({
        name: fullPlan.name,
        price: String(fullPlan.price),
        billingCycle: fullPlan.billingCycle,
        trialDays: fullPlan.trialDays ? String(fullPlan.trialDays) : '',
        description: fullPlan.description || '',
        moduleIds: fullPlan.moduleIds || [],
      });
      setShowEditPlan(true);
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">SaaS Platform Registry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your SaaS platforms and their API modules — foundation for Plans &amp; Subscriptions
          </p>
        </div>
        <button
          onClick={() => { setPlatformForm(emptyPlatformForm); setShowAddPlatform(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} /> Add Platform
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Platform List ── */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search platforms..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary bg-muted/30"
                />
              </div>
              <button onClick={fetchData} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground" title="Refresh">
                <RefreshCw size={13} />
              </button>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filteredPlatforms.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Building2 size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No platforms yet</p>
                <button
                  onClick={() => { setPlatformForm(emptyPlatformForm); setShowAddPlatform(true); }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Add your first platform
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredPlatforms.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => setActivePlatformId(platform.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors group ${
                      activePlatformId === platform.id
                        ? 'bg-primary/5 border-l-2 border-primary' :'hover:bg-muted/30 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        platform.isActive ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {platform.logoUrl ? (
                          <img src={platform.logoUrl} alt={platform.name} className="w-6 h-6 object-contain rounded" />
                        ) : (
                          <Building2 size={15} className={platform.isActive ? 'text-primary' : 'text-muted-foreground'} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-medium text-foreground truncate">{platform.name}</h2>
                          {!platform.isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border flex-shrink-0">Off</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                            platform.serverType === 'same_server' ?'text-blue-600' :'text-purple-600'
                          }`}>
                            {platform.serverType === 'same_server'
                              ? <><Server size={9} /> Same Server</>
                              : <><Globe size={9} /> External Server</>
                            }
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {platform.moduleCount} module{platform.moduleCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={13} className={`flex-shrink-0 mt-1 transition-colors ${
                        activePlatformId === platform.id
                          ? 'text-primary' :'text-muted-foreground/40 group-hover:text-muted-foreground'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Platform Detail + Modules ── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {activePlatform ? (
            <>
              {/* Platform Info Card */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activePlatform.logoUrl ? (
                      <img src={activePlatform.logoUrl} alt={activePlatform.name} className="w-10 h-10 object-contain rounded-lg" />
                    ) : (
                      <Building2 size={22} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-foreground">{activePlatform.name}</h2>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        activePlatform.isActive
                          ? 'bg-green-50 text-green-700 border-green-200' :'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {activePlatform.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        activePlatform.serverType === 'same_server' ?'bg-blue-50 text-blue-700 border-blue-200' :'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {activePlatform.serverType === 'same_server'
                          ? <><Server size={10} /> Same Server</>
                          : <><Globe size={10} /> External Server</>
                        }
                      </span>
                    </div>
                    {activePlatform.description && (
                      <p className="text-sm text-muted-foreground mt-1">{activePlatform.description}</p>
                    )}
                    {activePlatform.apiBaseUrl && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Link2 size={12} className="text-muted-foreground flex-shrink-0" />
                        <code className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded font-mono">
                          {activePlatform.apiBaseUrl}
                        </code>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePlatform(activePlatform)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title={activePlatform.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {activePlatform.isActive
                        ? <ToggleRight size={18} className="text-green-600" />
                        : <ToggleLeft size={18} />
                      }
                    </button>
                    <button
                      onClick={() => openEditPlatform(activePlatform)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit platform"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingPlatformId(activePlatform.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                      title="Delete platform"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Plans Section */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Plans</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subscription plans for {activePlatform.name}
                    </p>
                  </div>
                  <button
                    onClick={() => { setPlanForm(emptyPlanForm); setShowAddPlan(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={13} /> Add Plan
                  </button>
                </div>

                {platformPlans.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CreditCard size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No plans yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create subscription plans to offer modules to your clients</p>
                    <button
                      onClick={() => { setPlanForm(emptyPlanForm); setShowAddPlan(true); }}
                      className="mt-3 text-xs text-primary hover:underline"
                    >
                      Add first plan
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {platformPlans.map(plan => (
                      <div key={plan.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.isActive ? 'bg-amber-50' : 'bg-muted'
                        }`}>
                          <CreditCard size={14} className={plan.isActive ? 'text-amber-600' : 'text-muted-foreground'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{plan.name}</span>
                            {!plan.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Inactive</span>
                            )}
                            <span className="text-xs font-semibold text-primary ml-auto">
                              ₹{plan.price.toLocaleString('en-IN')} / {plan.billingCycle}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Puzzle size={10} /> {plan.moduleCount} module{plan.moduleCount !== 1 ? 's' : ''}
                            </span>
                            {plan.trialDays ? (
                              <span className="text-xs text-muted-foreground border-l border-border pl-3">
                                {plan.trialDays}-day trial
                              </span>
                            ) : null}
                          </div>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{plan.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => handleTogglePlan(plan)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                            title={plan.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {plan.isActive
                              ? <ToggleRight size={15} className="text-green-600" />
                              : <ToggleLeft size={15} />
                            }
                          </button>
                          <button
                            onClick={() => openEditPlan(plan)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingPlanId(plan.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : !loading ? (
            <div className="bg-white rounded-xl border border-border px-5 py-16 text-center">
              <Building2 size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">Select a platform</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a SaaS platform from the left to view and manage its modules</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Add Platform Modal ── */}
      {showAddPlatform && (
        <PlatformModal
          title="Add SaaS Platform"
          form={platformForm}
          setForm={setPlatformForm}
          onSave={handleAddPlatform}
          onClose={() => setShowAddPlatform(false)}
          saving={saving}
        />
      )}

      {/* ── Edit Platform Modal ── */}
      {showEditPlatform && editingPlatform && (
        <PlatformModal
          title="Edit Platform"
          form={platformForm}
          setForm={setPlatformForm}
          onSave={handleEditPlatform}
          onClose={() => { setShowEditPlatform(false); setEditingPlatform(null); }}
          saving={saving}
        />
      )}

      {/* ── Add Plan Modal ── */}
      {showAddPlan && activePlatform && (
        <PlanModal
          title={`Add Plan — ${activePlatform.name}`}
          form={planForm}
          setForm={setPlanForm}
          onSave={handleAddPlan}
          onClose={() => setShowAddPlan(false)}
          saving={saving}
          availableModules={platformModules}
        />
      )}

      {/* ── Edit Plan Modal ── */}
      {showEditPlan && editingPlan && activePlatform && (
        <PlanModal
          title="Edit Plan"
          form={planForm}
          setForm={setPlanForm}
          onSave={handleEditPlan}
          onClose={() => { setShowEditPlan(false); setEditingPlan(null); }}
          saving={saving}
          availableModules={platformModules}
        />
      )}

      {/* ── Delete Platform Confirm ── */}
      {deletingPlatformId && (
        <ConfirmModal
          message="Delete this platform? All its plans will also be deleted."
          onConfirm={() => handleDeletePlatform(deletingPlatformId)}
          onCancel={() => setDeletingPlatformId(null)}
        />
      )}

      {/* ── Delete Plan Confirm ── */}
      {deletingPlanId && (
        <ConfirmModal
          message="Delete this plan? This will not affect existing subscriptions until they expire."
          onConfirm={() => handleDeletePlan(deletingPlanId)}
          onCancel={() => setDeletingPlanId(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface PlatformFormState {
  name: string;
  logoUrl: string;
  description: string;
  serverType: 'same_server' | 'external';
  apiBaseUrl: string;
}

function PlatformModal({
  title, form, setForm, onSave, onClose, saving,
}: {
  title: string;
  form: PlatformFormState;
  setForm: React.Dispatch<React.SetStateAction<PlatformFormState>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. Shaarvik ERP"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Brief description of this SaaS platform"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Server Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['same_server', 'external'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, serverType: type }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.serverType === type
                      ? 'border-primary bg-primary/5 text-primary' :'border-border text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  {type === 'same_server' ? <Server size={14} /> : <Globe size={14} />}
                  {type === 'same_server' ? 'Same Server' : 'External Server'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">API Base URL</label>
            <input
              value={form.apiBaseUrl}
              onChange={e => setForm(f => ({ ...f, apiBaseUrl: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Logo URL</label>
            <input
              value={form.logoUrl}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Save size={13} /> {saving ? 'Saving...' : 'Save Platform'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Confirm Delete</p>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Modal ───────────────────────────────────────────────────────────────

interface PlanFormState {
  name: string;
  price: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  trialDays: string;
  description: string;
  moduleIds: string[];
}

interface ExternalModule {
  id: number;
  name: string;
}

function PlanModal({
  title, form, setForm, onSave, onClose, saving, availableModules
}: {
  title: string;
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  onSave: (externalModules: ExternalModule[]) => void;
  onClose: () => void;
  saving: boolean;
  availableModules: SaasModule[];
}) {
  const [externalModules, setExternalModules] = useState<ExternalModule[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchExternal() {
      setLoadingExternal(true);
      try {
        const res = await fetch('https://buildarya.com/api/get_all_modules');
        const data = await res.json();
        setExternalModules(Array.isArray(data) ? data : []);
      } catch {
        setExternalModules([]);
      } finally {
        setLoadingExternal(false);
      }
    }
    fetchExternal();
  }, []);

  const [selectedExternal, setSelectedExternal] = useState<ExternalModule[]>([]);

  // When form.moduleIds contains IDs that correspond to externalId in availableModules, 
  // we count them as "Local Selected".
  // But for the NEW modules from API, they aren't in availableModules yet.
  
  const toggleLocalModule = (id: string) => {
    setForm(f => ({
      ...f,
      moduleIds: f.moduleIds.includes(id) 
        ? f.moduleIds.filter(x => x !== id) 
        : [...f.moduleIds, id]
    }));
  };

  const toggleExternalModule = (mod: ExternalModule) => {
    setSelectedExternal(prev => 
      prev.find(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    );
  };

  const allFilteredExternal = externalModules.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Plan Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Professional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Price (₹) *</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="999"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Billing Cycle *</label>
              <select
                value={form.billingCycle}
                onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Trial Days</label>
              <input
                type="number"
                value={form.trialDays}
                onChange={e => setForm(f => ({ ...f, trialDays: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Modules * (BuildArya API)</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border text-sm bg-white hover:bg-muted/30 transition-colors"
              >
                <span className="truncate">
                  {loadingExternal ? 'Loading modules...' : 
                   (form.moduleIds.length + selectedExternal.length === 0) ? 'Select modules' : 
                   `${form.moduleIds.length + selectedExternal.length} selected`}
                </span>
                <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-xl border border-border p-2 space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search modules..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 py-1">
                    {allFilteredExternal.map(mod => {
                      // Check if mod.id is already represented in form.moduleIds (by checking externalId of local availableModules)
                      const alreadySynced = availableModules.find(x => x.externalId === mod.id);
                      const isSelected = alreadySynced 
                        ? form.moduleIds.includes(alreadySynced.id) 
                        : selectedExternal.some(m => m.id === mod.id);

                      return (
                        <button
                          key={mod.id}
                          onClick={() => alreadySynced ? toggleLocalModule(alreadySynced.id) : toggleExternalModule(mod)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-primary border-primary' : 'border-border'
                          }`}>
                            {isSelected && <Check size={10} className="text-white" />}
                          </div>
                          {mod.name}
                        </button>
                      );
                    })}
                    {allFilteredExternal.length === 0 && (
                      <p className="text-center py-4 text-xs text-muted-foreground">No modules found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Selected Pills */}
            <div className="mt-2 flex flex-wrap gap-1.5">
               {availableModules.filter(m => form.moduleIds.includes(m.id)).map(m => (
                 <span key={m.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-medium border border-primary/20">
                   {m.name}
                 </span>
               ))}
               {selectedExternal.map(m => (
                 <span key={m.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100 italic">
                   {m.name} (New)
                 </span>
               ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="What's included in this plan?"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedExternal)}
            disabled={saving || !form.name.trim() || !form.price || (form.moduleIds.length + selectedExternal.length === 0)}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Save size={13} /> {saving ? 'Creating Plan & Registering...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
