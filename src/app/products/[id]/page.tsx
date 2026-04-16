'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, Pencil, Plus, Trash2, Globe, Tag, CheckCircle2, XCircle, X, Save, Zap, Users, HardDrive, Activity, ChevronDown, ChevronUp,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  productCode: string | null;
  description: string | null;
  domainUrl: string | null;
  productType: 'web_app' | 'mobile_app' | 'both';
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Feature {
  id: string;
  featureName: string;
  description: string | null;
  status: 'active' | 'inactive';
}

interface Plan {
  id: string;
  planName: string;
  price: number;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  billingCycle: 'monthly' | 'yearly';
  features: string | null;
  maxUsers: number | null;
  storageLimitGb: number | null;
  apiLimit: number | null;
  extraUserPrice: number | null;
  extraStoragePrice: number | null;
  extraApiPrice: number | null;
  status: 'active' | 'inactive';
  featureIds: string[];
}

interface PlanFormData {
  planName: string;
  price: string;
  monthlyPrice: string;
  yearlyPrice: string;
  billingCycle: 'monthly' | 'yearly';
  maxUsers: string;
  storageLimitGb: string;
  apiLimit: string;
  extraUserPrice: string;
  extraStoragePrice: string;
  extraApiPrice: string;
  status: 'active' | 'inactive';
  selectedFeatureIds: string[];
}

interface PlanFormErrors {
  planName?: string;
  price?: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  maxUsers?: string;
  storageLimitGb?: string;
}

interface FeatureFormData {
  featureName: string;
  description: string;
  status: 'active' | 'inactive';
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  web_app: 'Web App',
  mobile_app: 'Mobile App',
  both: 'Both',
};

const INITIAL_PLAN_FORM: PlanFormData = {
  planName: '',
  price: '',
  monthlyPrice: '',
  yearlyPrice: '',
  billingCycle: 'monthly',
  maxUsers: '',
  storageLimitGb: '',
  apiLimit: '',
  extraUserPrice: '',
  extraStoragePrice: '',
  extraApiPrice: '',
  status: 'active',
  selectedFeatureIds: [],
};

const INITIAL_FEATURE_FORM: FeatureFormData = {
  featureName: '',
  description: '',
  status: 'active',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}

function FieldInput({ label, value, onChange, placeholder, error, type = 'text', required = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  error?: string; type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-500 text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? 'any' : undefined}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${error ? 'border-red-400 bg-red-50' : 'border-border'}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plan modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormData>(INITIAL_PLAN_FORM);
  const [planErrors, setPlanErrors] = useState<PlanFormErrors>({});
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [showResourceLimits, setShowResourceLimits] = useState(false);

  // Feature modal
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [featureForm, setFeatureForm] = useState<FeatureFormData>(INITIAL_FEATURE_FORM);
  const [featureNameError, setFeatureNameError] = useState('');
  const [savingFeature, setSavingFeature] = useState(false);
  const [deletingFeatureId, setDeletingFeatureId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const [productRes, featuresRes, plansRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).single(),
        supabase.from('product_features').select('*').eq('product_id', id).order('created_at'),
        supabase.from('product_plans').select('*, plan_features(feature_id)').eq('product_id', id).order('price'),
      ]);

      if (productRes.error) throw productRes.error;
      if (!productRes.data) throw new Error('Product not found');

      const d = productRes.data;
      setProduct({
        id: d.id, name: d.name, productCode: d.product_code ?? null,
        description: d.description ?? null, domainUrl: d.domain_url ?? null,
        productType: d.product_type ?? 'web_app', status: d.status ?? 'active',
        createdAt: d.created_at,
      });

      setFeatures((featuresRes.data ?? []).map((f: any) => ({
        id: f.id, featureName: f.feature_name, description: f.description ?? null,
        status: f.status,
      })));

      setPlans((plansRes.data ?? []).map((p: any) => ({
        id: p.id, planName: p.plan_name, price: Number(p.price),
        monthlyPrice: p.monthly_price != null ? Number(p.monthly_price) : null,
        yearlyPrice: p.yearly_price != null ? Number(p.yearly_price) : null,
        billingCycle: p.billing_cycle, features: p.features ?? null,
        maxUsers: p.max_users ?? null, storageLimitGb: p.storage_limit_gb ?? null,
        apiLimit: p.api_limit ?? null, extraUserPrice: p.extra_user_price ?? null,
        extraStoragePrice: p.extra_storage_price ?? null, extraApiPrice: p.extra_api_price ?? null,
        status: p.status,
        featureIds: (p.plan_features ?? []).map((pf: any) => pf.feature_id),
      })));
    } catch (err: any) {
      setError(err.message ?? 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- PLAN HANDLERS ----
  const openAddPlan = () => {
    setEditingPlan(null);
    setPlanForm(INITIAL_PLAN_FORM);
    setPlanErrors({});
    setShowResourceLimits(false);
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      planName: plan.planName,
      price: String(plan.price),
      monthlyPrice: plan.monthlyPrice != null ? String(plan.monthlyPrice) : '',
      yearlyPrice: plan.yearlyPrice != null ? String(plan.yearlyPrice) : '',
      billingCycle: plan.billingCycle,
      maxUsers: plan.maxUsers != null ? String(plan.maxUsers) : '',
      storageLimitGb: plan.storageLimitGb != null ? String(plan.storageLimitGb) : '',
      apiLimit: plan.apiLimit != null ? String(plan.apiLimit) : '',
      extraUserPrice: plan.extraUserPrice != null ? String(plan.extraUserPrice) : '',
      extraStoragePrice: plan.extraStoragePrice != null ? String(plan.extraStoragePrice) : '',
      extraApiPrice: plan.extraApiPrice != null ? String(plan.extraApiPrice) : '',
      status: plan.status,
      selectedFeatureIds: [...plan.featureIds],
    });
    setPlanErrors({});
    setShowResourceLimits(true);
    setShowPlanModal(true);
  };

  const validatePlan = (): boolean => {
    const errs: PlanFormErrors = {};
    if (!planForm.planName.trim()) errs.planName = 'Plan name is required';
    if (planForm.monthlyPrice && (isNaN(Number(planForm.monthlyPrice)) || Number(planForm.monthlyPrice) < 0)) errs.monthlyPrice = 'Must be a valid non-negative number';
    if (planForm.yearlyPrice && (isNaN(Number(planForm.yearlyPrice)) || Number(planForm.yearlyPrice) < 0)) errs.yearlyPrice = 'Must be a valid non-negative number';
    if (planForm.maxUsers && (isNaN(Number(planForm.maxUsers)) || Number(planForm.maxUsers) < 0)) errs.maxUsers = 'Must be a valid number';
    if (planForm.storageLimitGb && (isNaN(Number(planForm.storageLimitGb)) || Number(planForm.storageLimitGb) < 0)) errs.storageLimitGb = 'Must be a valid number';
    setPlanErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlan()) return;
    setSavingPlan(true);
    try {
      const supabase = createClient();
      const monthlyPriceVal = planForm.monthlyPrice ? Number(planForm.monthlyPrice) : null;
      const yearlyPriceVal = planForm.yearlyPrice ? Number(planForm.yearlyPrice) : null;
      // Use monthly_price as the default price for backward compat
      const defaultPrice = monthlyPriceVal ?? yearlyPriceVal ?? 0;
      const payload = {
        product_id: id,
        plan_name: planForm.planName.trim(),
        price: defaultPrice,
        monthly_price: monthlyPriceVal,
        yearly_price: yearlyPriceVal,
        max_users: planForm.maxUsers ? Number(planForm.maxUsers) : null,
        storage_limit_gb: planForm.storageLimitGb ? Number(planForm.storageLimitGb) : null,
        api_limit: planForm.apiLimit ? Number(planForm.apiLimit) : null,
        extra_user_price: planForm.extraUserPrice ? Number(planForm.extraUserPrice) : null,
        extra_storage_price: planForm.extraStoragePrice ? Number(planForm.extraStoragePrice) : null,
        extra_api_price: planForm.extraApiPrice ? Number(planForm.extraApiPrice) : null,
        status: planForm.status,
      };

      let planId: string;
      if (editingPlan) {
        const { error } = await supabase.from('product_plans').update(payload).eq('id', editingPlan.id);
        if (error) throw error;
        planId = editingPlan.id;
      } else {
        const { data, error } = await supabase.from('product_plans').insert(payload).select('id').single();
        if (error) throw error;
        planId = data.id;
      }

      // Sync plan_features
      await supabase.from('plan_features').delete().eq('plan_id', planId);
      if (planForm.selectedFeatureIds.length > 0) {
        await supabase.from('plan_features').insert(
          planForm.selectedFeatureIds.map((fid) => ({ plan_id: planId, feature_id: fid }))
        );
      }

      setShowPlanModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Delete this plan? All feature mappings will also be removed.')) return;
    setDeletingPlanId(planId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('product_plans').delete().eq('id', planId);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err: any) {
      alert(err.message ?? 'Delete failed');
    } finally {
      setDeletingPlanId(null);
    }
  };

  const toggleFeatureInPlan = (fid: string) => {
    setPlanForm((prev) => ({
      ...prev,
      selectedFeatureIds: prev.selectedFeatureIds.includes(fid)
        ? prev.selectedFeatureIds.filter((x) => x !== fid)
        : [...prev.selectedFeatureIds, fid],
    }));
  };

  // ---- FEATURE HANDLERS ----
  const openAddFeature = () => {
    setEditingFeature(null);
    setFeatureForm(INITIAL_FEATURE_FORM);
    setFeatureNameError('');
    setShowFeatureModal(true);
  };

  const openEditFeature = (feat: Feature) => {
    setEditingFeature(feat);
    setFeatureForm({ featureName: feat.featureName, description: feat.description ?? '', status: feat.status });
    setFeatureNameError('');
    setShowFeatureModal(true);
  };

  const handleSaveFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureForm.featureName.trim()) { setFeatureNameError('Feature name is required'); return; }
    setSavingFeature(true);
    try {
      const supabase = createClient();
      const payload = {
        product_id: id,
        feature_name: featureForm.featureName.trim(),
        description: featureForm.description.trim() || null,
        status: featureForm.status,
      };
      if (editingFeature) {
        const { error } = await supabase.from('product_features').update(payload).eq('id', editingFeature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('product_features').insert(payload);
        if (error) throw error;
      }
      setShowFeatureModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to save feature');
    } finally {
      setSavingFeature(false);
    }
  };

  const handleDeleteFeature = async (featId: string) => {
    if (!confirm('Delete this feature? It will be removed from all plans.')) return;
    setDeletingFeatureId(featId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('product_features').delete().eq('id', featId);
      if (error) throw error;
      setFeatures((prev) => prev.filter((f) => f.id !== featId));
    } catch (err: any) {
      alert(err.message ?? 'Delete failed');
    } finally {
      setDeletingFeatureId(null);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-red-500">{error ?? 'Product not found'}</p>
          <button onClick={() => router.push('/products')} className="text-xs text-primary hover:underline">Back to Products</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/products')} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package size={16} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-600 text-foreground">{product.name}</h1>
                {product.productCode && <span className="text-xs font-mono text-muted-foreground">{product.productCode}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/products/${id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-500 text-foreground hover:bg-muted transition-colors"
          >
            <Pencil size={13} />
            Edit Product
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Product Details */}
          <div className="bg-white border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-600 text-foreground">Product Details</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Product Name</p>
                <p className="text-sm font-500 text-foreground">{product.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Product Code</p>
                {product.productCode ? (
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">{product.productCode}</span>
                ) : <span className="text-sm text-muted-foreground/40">—</span>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <span className={`inline-flex items-center gap-1 text-xs font-600 ${product.status === 'active' ? 'text-green-700' : 'text-gray-500'}`}>
                  {product.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {product.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Product Type</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 bg-blue-50 text-blue-700">
                  {PRODUCT_TYPE_LABELS[product.productType]}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Domain URL</p>
                {product.domainUrl ? (
                  <a href={product.domainUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Globe size={11} />{product.domainUrl.replace(/^https?:\/\//, '')}
                  </a>
                ) : <span className="text-sm text-muted-foreground/40">—</span>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Created Date</p>
                <p className="text-sm text-foreground">{formatDate(product.createdAt)}</p>
              </div>
              {product.description && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                  <p className="text-sm text-foreground">{product.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-white border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-amber-500" />
                <h2 className="text-sm font-600 text-foreground">Product Features</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{features.length}</span>
              </div>
              <button
                onClick={openAddFeature}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-500 hover:bg-primary/90 transition-colors"
              >
                <Plus size={13} />Add Feature
              </button>
            </div>
            {features.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Zap size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No features defined yet</p>
                <button onClick={openAddFeature} className="text-xs text-primary hover:underline">Add the first feature</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Feature Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {features.map((feat, idx) => (
                      <tr key={feat.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-500 text-foreground">{feat.featureName}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[240px] truncate">{feat.description ?? '—'}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={feat.status} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditFeature(feat)} className="p-1.5 rounded-md hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors" title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeleteFeature(feat.id)} disabled={deletingFeatureId === feat.id} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40" title="Delete">
                              <Trash2 size={13} />
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

          {/* Plans Section */}
          <div className="bg-white border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={15} className="text-primary" />
                <h2 className="text-sm font-600 text-foreground">Pricing Plans</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{plans.length}</span>
              </div>
              <button
                onClick={openAddPlan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-500 hover:bg-primary/90 transition-colors"
              >
                <Plus size={13} />Add Plan
              </button>
            </div>
            {plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Tag size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No pricing plans yet</p>
                <button onClick={openAddPlan} className="text-xs text-primary hover:underline">Add the first plan</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Plan Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Monthly Price</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Yearly Price</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1"><Users size={11} />Max Users</div>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1"><HardDrive size={11} />Storage</div>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1"><Activity size={11} />API Limit</div>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Features</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plans.map((plan) => {
                      const planFeatureNames = features.filter((f) => plan.featureIds.includes(f.id)).map((f) => f.featureName);
                      return (
                        <tr key={plan.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-500 text-foreground whitespace-nowrap">{plan.planName}</td>
                          <td className="px-4 py-3 font-600 text-foreground whitespace-nowrap">
                            {plan.monthlyPrice != null ? formatCurrency(plan.monthlyPrice) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-4 py-3 font-600 text-foreground whitespace-nowrap">
                            {plan.yearlyPrice != null ? formatCurrency(plan.yearlyPrice) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                            {plan.maxUsers != null ? (
                              <div>
                                <span>{plan.maxUsers}</span>
                                {plan.extraUserPrice != null && (
                                  <span className="text-xs text-muted-foreground ml-1">(+{formatCurrency(plan.extraUserPrice)}/extra)</span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                            {plan.storageLimitGb != null ? (
                              <div>
                                <span>{plan.storageLimitGb} GB</span>
                                {plan.extraStoragePrice != null && (
                                  <span className="text-xs text-muted-foreground ml-1">(+{formatCurrency(plan.extraStoragePrice)}/GB)</span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                            {plan.apiLimit != null ? (
                              <div>
                                <span>{plan.apiLimit.toLocaleString()}</span>
                                {plan.extraApiPrice != null && (
                                  <span className="text-xs text-muted-foreground ml-1">(+₹{plan.extraApiPrice}/call)</span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            {planFeatureNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {planFeatureNames.slice(0, 2).map((fn) => (
                                  <span key={fn} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{fn}</span>
                                ))}
                                {planFeatureNames.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{planFeatureNames.length - 2} more</span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={plan.status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditPlan(plan)} className="p-1.5 rounded-md hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors" title="Edit Plan">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleDeletePlan(plan.id)} disabled={deletingPlanId === plan.id} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40" title="Delete Plan">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="text-sm font-600 text-foreground">{editingPlan ? 'Edit Plan' : 'Add Pricing Plan'}</h3>
              <button onClick={() => setShowPlanModal(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="overflow-y-auto flex-1">
              <div className="px-5 py-4 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <FieldInput label="Plan Name" required value={planForm.planName} onChange={(v) => setPlanForm((p) => ({ ...p, planName: v }))} placeholder="e.g. Basic, Pro, Enterprise" error={planErrors.planName} />
                  </div>
                  <div>
                    <FieldInput label="Monthly Price (₹)" type="number" value={planForm.monthlyPrice} onChange={(v) => setPlanForm((p) => ({ ...p, monthlyPrice: v }))} placeholder="0.00" error={planErrors.monthlyPrice} hint="Price charged per month" />
                  </div>
                  <div>
                    <FieldInput label="Yearly Price (₹)" type="number" value={planForm.yearlyPrice} onChange={(v) => setPlanForm((p) => ({ ...p, yearlyPrice: v }))} placeholder="0.00" error={planErrors.yearlyPrice} hint="Price charged per year" />
                  </div>
                  <div>
                    <label className="block text-xs font-500 text-foreground mb-1">Status</label>
                    <select
                      value={planForm.status}
                      onChange={(e) => setPlanForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Feature Selection */}
                {features.length > 0 && (
                  <div>
                    <label className="block text-xs font-500 text-foreground mb-2">Included Features</label>
                    <div className="border border-border rounded-lg divide-y divide-border max-h-36 overflow-y-auto">
                      {features.map((feat) => (
                        <label key={feat.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={planForm.selectedFeatureIds.includes(feat.id)}
                            onChange={() => toggleFeatureInPlan(feat.id)}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20"
                          />
                          <span className="text-sm text-foreground">{feat.featureName}</span>
                          {feat.status === 'inactive' && <span className="text-xs text-muted-foreground">(inactive)</span>}
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{planForm.selectedFeatureIds.length} feature(s) selected</p>
                  </div>
                )}

                {/* Resource Limits Toggle */}
                <button
                  type="button"
                  onClick={() => setShowResourceLimits(!showResourceLimits)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm font-500 text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HardDrive size={14} className="text-muted-foreground" />
                    Resource Limits & Extra Pricing
                  </div>
                  {showResourceLimits ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showResourceLimits && (
                  <div className="space-y-3 border border-border rounded-lg p-4">
                    <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Resource Limits</p>
                    <div className="grid grid-cols-3 gap-3">
                      <FieldInput label="Max Users" type="number" value={planForm.maxUsers} onChange={(v) => setPlanForm((p) => ({ ...p, maxUsers: v }))} placeholder="e.g. 25" error={planErrors.maxUsers} />
                      <FieldInput label="Storage Limit (GB)" type="number" value={planForm.storageLimitGb} onChange={(v) => setPlanForm((p) => ({ ...p, storageLimitGb: v }))} placeholder="e.g. 50" error={planErrors.storageLimitGb} />
                      <FieldInput label="API Limit (calls/mo)" type="number" value={planForm.apiLimit} onChange={(v) => setPlanForm((p) => ({ ...p, apiLimit: v }))} placeholder="e.g. 100000" />
                    </div>
                    <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mt-2">Extra Usage Pricing</p>
                    <div className="grid grid-cols-3 gap-3">
                      <FieldInput label="Extra User Price (₹)" type="number" value={planForm.extraUserPrice} onChange={(v) => setPlanForm((p) => ({ ...p, extraUserPrice: v }))} placeholder="per extra user" />
                      <FieldInput label="Extra Storage Price (₹/GB)" type="number" value={planForm.extraStoragePrice} onChange={(v) => setPlanForm((p) => ({ ...p, extraStoragePrice: v }))} placeholder="per extra GB" />
                      <FieldInput label="Extra API Price (₹/call)" type="number" value={planForm.extraApiPrice} onChange={(v) => setPlanForm((p) => ({ ...p, extraApiPrice: v }))} placeholder="per extra call" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border flex-shrink-0">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-sm font-500 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingPlan} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                  <Save size={13} />
                  {savingPlan ? 'Saving...' : editingPlan ? 'Update Plan' : 'Add Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Modal */}
      {showFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-600 text-foreground">{editingFeature ? 'Edit Feature' : 'Add Feature'}</h3>
              <button onClick={() => setShowFeatureModal(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveFeature} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-500 text-foreground mb-1">Feature Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={featureForm.featureName}
                  onChange={(e) => { setFeatureForm((p) => ({ ...p, featureName: e.target.value })); setFeatureNameError(''); }}
                  placeholder="e.g. Contact Management"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${featureNameError ? 'border-red-400 bg-red-50' : 'border-border'}`}
                />
                {featureNameError && <p className="mt-1 text-xs text-red-500">{featureNameError}</p>}
              </div>
              <div>
                <label className="block text-xs font-500 text-foreground mb-1">Description</label>
                <textarea
                  value={featureForm.description}
                  onChange={(e) => setFeatureForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief description of this feature..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-foreground mb-1">Status</label>
                <select value={featureForm.status} onChange={(e) => setFeatureForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowFeatureModal(false)} className="px-4 py-2 text-sm font-500 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingFeature} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                  <Save size={13} />
                  {savingFeature ? 'Saving...' : editingFeature ? 'Update Feature' : 'Add Feature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
