'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Package, Eye, Pencil, Trash2, Globe, Tag, Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProductRow {
  id: string;
  name: string;
  productCode: string | null;
  domainUrl: string | null;
  productType: 'web_app' | 'mobile_app' | 'both';
  status: 'active' | 'inactive';
  createdAt: string;
  planCount: number;
  featureCount: number;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  web_app: 'Web App',
  mobile_app: 'Mobile App',
  both: 'Both',
};

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${
        status === 'active' ?'bg-green-50 text-green-700' :'bg-gray-100 text-gray-500'
      }`}
    >
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 bg-blue-50 text-blue-700">
      {PRODUCT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          base_url,
          product_code,
          domain_url,
          product_type,
          status,
          created_at
        `);

      if (fetchError) throw fetchError;

      const rows: ProductRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        productCode: row.product_code ?? null,
        domainUrl: row.domain_url ?? null,
        productType: row.product_type ?? 'web_app',
        status: row.status ?? 'active',
        createdAt: row.created_at,
        planCount: 0,
        featureCount: 0,
      }));
      setProducts(rows);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? All associated plans and features will also be deleted.')) return;
    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error: delError } = await supabase.from('products').delete().eq('id', id);
      if (delError) throw delError;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message ?? 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.productCode ?? '').toLowerCase().includes(q) ||
      (p.domainUrl ?? '').toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-primary" />
            <h1 className="text-lg font-600 text-foreground">Products</h1>
            <span className="ml-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          <Link
            href="/products/add"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            Add Product
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-white flex-shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-500 capitalize transition-all ${
                  statusFilter === f
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Package size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No products found</p>
              <Link href="/products/add" className="text-xs text-primary hover:underline">
                Add your first product
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Product Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Code</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Domain</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Features</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Plans</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((product, idx) => (
                  <tr
                    key={product.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package size={13} className="text-primary" />
                        </div>
                        <span className="font-500 text-foreground truncate max-w-[160px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {product.productCode ? (
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                          {product.productCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {product.domainUrl ? (
                        <a
                          href={product.domainUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[160px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe size={11} />
                          {product.domainUrl.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <TypeBadge type={product.productType} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-500 text-muted-foreground">
                        <Zap size={11} className="text-amber-500" />
                        {product.featureCount}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-500 text-muted-foreground">
                        <Tag size={11} />
                        {product.planCount} {product.planCount === 1 ? 'plan' : 'plans'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/products/${product.id}`)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/products/${product.id}/edit`)}
                          className="p-1.5 rounded-md hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="px-6 py-2.5 border-t border-border bg-white flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {products.length} products
            </p>
          </div>
        )}
      </div>
    </>
  );
}
