'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react';

interface ClientFormData {
  name: string;
  displayName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  billingEmail: string;
  status: 'active' | 'inactive';
  source: string;
}

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

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    displayName: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    billingEmail: '',
    status: 'active',
    source: 'lead_conversion',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const fetchClient = async () => {
      try {
        const data = await fetchJson<any>(`/api/mysql/clients/${encodeURIComponent(clientId)}`);
        setFormData({
          name: data.name || '',
          displayName: data.displayName || data.display_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          gstNumber: data.gstNumber || data.gst_number || '',
          billingEmail: data.billingEmail || data.billing_email || '',
          status: data.status || 'active',
          source: data.source || 'lead_conversion',
        });
      } catch (err: any) {
        setSubmitError(err?.message || 'Failed to load client.');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [clientId]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (formData.phone && !/^[0-9+\-\s()]{7,15}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid phone number';
    }
    if (formData.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billingEmail)) {
      newErrors.billingEmail = 'Enter a valid billing email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ClientFormData]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await fetchJson(`/api/mysql/clients/${encodeURIComponent(clientId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          displayName: formData.displayName.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          gstNumber: formData.gstNumber.trim() || null,
          billingEmail: formData.billingEmail.trim() || null,
          status: formData.status,
          source: formData.source,
        }),
      });
      router.push(`/clients/${clientId}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to update client.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto">
        <div className="bg-white border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/clients/${clientId}`)} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-600 text-foreground">Edit Client</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Update client information</p>
        </div>
      </div>

      {submitError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{submitError}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-border rounded-xl shadow-sm divide-y divide-border">
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-500 text-foreground">Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Full name"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${errors.name ? 'border-red-400' : 'border-border'}`} />
                </div>
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="displayName" className="block text-sm font-500 text-foreground">Company / Display Name</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input id="displayName" name="displayName" type="text" value={formData.displayName} onChange={handleChange} placeholder="Company or business name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-500 text-foreground">Phone</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${errors.phone ? 'border-red-400' : 'border-border'}`} />
                </div>
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-500 text-foreground">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="client@example.com"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${errors.email ? 'border-red-400' : 'border-border'}`} />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="billingEmail" className="block text-sm font-500 text-foreground">Billing Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input id="billingEmail" name="billingEmail" type="email" value={formData.billingEmail} onChange={handleChange} placeholder="billing@example.com"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${errors.billingEmail ? 'border-red-400' : 'border-border'}`} />
                </div>
                {errors.billingEmail && <p className="text-xs text-red-500">{errors.billingEmail}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="address" className="block text-sm font-500 text-foreground">Address</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                <textarea id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Street, City, State, PIN" rows={2}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="gstNumber" className="block text-sm font-500 text-foreground">GST Number</label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input id="gstNumber" name="gstNumber" type="text" value={formData.gstNumber} onChange={handleChange} placeholder="22AAAAA0000A1Z5"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase" />
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Classification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="status" className="block text-sm font-500 text-foreground">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="source" className="block text-sm font-500 text-foreground">Source</label>
                <select id="source" name="source" value={formData.source} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="lead_conversion">Lead Conversion</option>
                  <option value="reference">Reference</option>
                  <option value="website">Website</option>
                  <option value="ads">Ads</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6 flex items-center justify-end gap-3">
            <button type="button" onClick={() => router.push(`/clients/${clientId}`)} className="px-5 py-2.5 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-600 bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-60">
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
