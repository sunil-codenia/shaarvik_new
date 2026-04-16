'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface FormData {
  name: string;
  productCode: string;
  description: string;
  domainUrl: string;
  productType: 'web_app' | 'mobile_app' | 'both';
  status: 'active' | 'inactive';
}

interface FormErrors {
  name?: string;
  productCode?: string;
  domainUrl?: string;
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: '',
    productCode: '',
    description: '',
    domainUrl: '',
    productType: 'web_app',
    status: 'active',
  });
  const [originalCode, setOriginalCode] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        const code = data.product_code ?? '';
        setOriginalCode(code);
        setForm({
          name: data.name ?? '',
          productCode: code,
          description: data.description ?? '',
          domainUrl: data.domain_url ?? '',
          productType: data.product_type ?? 'web_app',
          status: data.status ?? 'active',
        });
      } catch (err: any) {
        setServerError(err.message ?? 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = 'Product name is required';
    if (!form.productCode.trim()) {
      newErrors.productCode = 'Product code is required';
    } else if (!/^[A-Z0-9_]+$/.test(form.productCode.trim())) {
      newErrors.productCode = 'Product code must be uppercase letters, numbers, or underscores only';
    }
    if (form.domainUrl && !isValidUrl(form.domainUrl)) {
      newErrors.domainUrl = 'Enter a valid URL (e.g. https://example.com)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'productCode' ? value.toUpperCase() : value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').update({
        name: form.name.trim(),
        product_code: form.productCode.trim() || null,
        description: form.description.trim() || null,
        domain_url: form.domainUrl.trim() || null,
        product_type: form.productType,
        status: form.status,
      }).eq('id', id);

      if (error) {
        if (error.code === '23505') {
          setErrors({ productCode: 'This product code already exists. Please use a unique code.' });
        } else {
          throw error;
        }
        return;
      }
      router.push(`/products/${id}`);
    } catch (err: any) {
      setServerError(err.message ?? 'Failed to update product');
    } finally {
      setSaving(false);
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

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-white flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h1 className="text-base font-600 text-foreground">Edit Product</h1>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            {serverError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {serverError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl divide-y divide-border">
              <div className="px-6 py-4">
                <h2 className="text-sm font-600 text-foreground">Product Information</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Update the product details</p>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-500 text-foreground mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      errors.name ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Product Code */}
                <div>
                  <label className="block text-xs font-500 text-foreground mb-1">
                    Product Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="productCode"
                    value={form.productCode}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      errors.productCode ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  />
                  {errors.productCode ? (
                    <p className="mt-1 text-xs text-red-500">{errors.productCode}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Uppercase letters and numbers only. Must be unique.</p>
                  )}
                </div>

                {/* Domain URL */}
                <div>
                  <label className="block text-xs font-500 text-foreground mb-1">Domain URL</label>
                  <input
                    type="text"
                    name="domainUrl"
                    value={form.domainUrl}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      errors.domainUrl ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  />
                  {errors.domainUrl && <p className="mt-1 text-xs text-red-500">{errors.domainUrl}</p>}
                </div>

                {/* Product Type */}
                <div>
                  <label className="block text-xs font-500 text-foreground mb-1">Product Type</label>
                  <select
                    name="productType"
                    value={form.productType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="web_app">Web App</option>
                    <option value="mobile_app">Mobile App</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-500 text-foreground mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-500 text-foreground mb-1">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm font-500 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-500 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
