'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

interface LeadFormData {
  fullName: string;
  phone: string;
  email: string;
  companyName: string;
  campaignId: string;
  dealValue: string;
  followUpDate: string;
  notes: string;
  source: string;
  password: string;
}

interface Campaign {
  id: string;
  name: string;
}

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddLeadContent() {
  const router = useRouter();

  const [formData, setFormData] = useState<LeadFormData>({
    fullName: '', phone: '', email: '', companyName: '',
    campaignId: '', dealValue: '', followUpDate: '', notes: '',
    source: 'Website', password: '',
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/mysql/campaigns', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Failed to load campaigns');
        setCampaigns(Array.isArray(payload) ? payload : []);
      } catch {
        setCampaigns([]);
      }
    };
    fetchCampaigns();
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof LeadFormData, string>> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.companyName.trim()) newErrors.companyName = 'Company Name is required';
    if (formData.dealValue.trim() && isNaN(Number(formData.dealValue))) {
      newErrors.dealValue = 'Enter a valid number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof LeadFormData]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/mysql/leads', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          companyName: formData.companyName.trim(),
          campaignId: formData.campaignId || null,
          dealValue: formData.dealValue.trim() ? Number(formData.dealValue) : null,
          followUpDate: formData.followUpDate || null,
          notes: formData.notes.trim() || null,
          source: formData.source,
          password: formData.password || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save lead.');
      }
      router.push('/leads');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save lead.');
      setSaving(false);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full px-3 py-2.5 text-sm rounded-lg border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${hasError ? 'border-red-400' : 'border-border'}`;

  return (
    <div className="w-full">
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/leads')} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-600 text-foreground">Add Lead</h1>
            <p className="text-sm text-muted-foreground mt-0.5">New leads start with status "New" — update as you progress</p>
          </div>
        </div>

        {submitError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{submitError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white border border-border rounded-xl shadow-sm divide-y divide-border">
            {/* Contact Information */}
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Contact Information</h2>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-sm font-500 text-foreground">Full Name <span className="text-red-500">*</span></label>
                <input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleChange} placeholder="e.g. Rahul Sharma"
                  className={inputClass(!!errors.fullName)} />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-500 text-foreground">Phone <span className="text-red-500">*</span></label>
                  <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210"
                    className={inputClass(!!errors.phone)} />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-500 text-foreground">Email <span className="text-red-500">*</span></label>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="lead@example.com"
                    className={inputClass(!!errors.email)} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="block text-sm font-500 text-foreground">Company Name <span className="text-red-500">*</span></label>
                  <input id="companyName" name="companyName" type="text" value={formData.companyName} onChange={handleChange} placeholder="e.g. Acme Corp"
                    className={inputClass(!!errors.companyName)} />
                  {errors.companyName && <p className="text-xs text-red-500">{errors.companyName}</p>}
                </div>

                {/* Lead Source */}
                <div className="space-y-1.5">
                  <label htmlFor="source" className="block text-sm font-500 text-foreground">Lead Source <span className="text-red-500">*</span></label>
                  <select id="source" name="source" value={formData.source} onChange={handleChange}
                    className={inputClass()}>
                    <option value="Website">Website</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* Username (Disabled) */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-sm font-500 text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Username <span className="text-xs font-400 opacity-60">(Pre-filled with email)</span></label>
                  <input id="username" name="username" type="text" value={formData.email} disabled placeholder="Auto-filled"
                    className={`${inputClass()} bg-muted/30 cursor-not-allowed`} title="Username matches email" />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-500 text-foreground">Set Password <span className="text-muted-foreground text-xs font-400">(optional)</span></label>
                  <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••"
                    className={inputClass()} />
                </div>
              </div>
            </div>

            {/* Lead Details */}
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Lead Details</h2>

              {/* Campaign */}
              <div className="space-y-1.5">
                <label htmlFor="campaignId" className="block text-sm font-500 text-foreground">Campaign <span className="text-muted-foreground text-xs font-400">(optional)</span></label>
                <select id="campaignId" name="campaignId" value={formData.campaignId} onChange={handleChange}
                  className={inputClass()}>
                  <option value="">— Select a campaign —</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Deal Value */}
                <div className="space-y-1.5">
                  <label htmlFor="dealValue" className="block text-sm font-500 text-foreground">Deal Value <span className="text-muted-foreground text-xs font-400">(optional)</span></label>
                  <input id="dealValue" name="dealValue" type="number" min="0" step="0.01" value={formData.dealValue} onChange={handleChange} placeholder="e.g. 50000"
                    className={inputClass(!!errors.dealValue)} />
                  {errors.dealValue && <p className="text-xs text-red-500">{errors.dealValue}</p>}
                </div>

                {/* Follow-up Date */}
                <div className="space-y-1.5">
                  <label htmlFor="followUpDate" className="block text-sm font-500 text-foreground">Follow-up Date <span className="text-muted-foreground text-xs font-400">(optional)</span></label>
                  <input id="followUpDate" name="followUpDate" type="date" value={formData.followUpDate} onChange={handleChange}
                    className={inputClass()} />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label htmlFor="notes" className="block text-sm font-500 text-foreground">Notes <span className="text-muted-foreground text-xs font-400">(optional)</span></label>
                <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} placeholder="Any additional notes about this lead..."
                  className={`${inputClass()} resize-none`} />
              </div>
            </div>

            <div className="p-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => router.push('/leads')} className="px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm disabled:opacity-60">
                <Save size={14} />{saving ? 'Saving...' : 'Add Lead'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
