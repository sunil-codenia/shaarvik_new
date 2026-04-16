'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Check, Package, Zap, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  description: string | null;
}

export default function PlanSelectionPage() {
  const router = useRouter();
  const [signupData, setSignupData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem('signup_data');
    if (!data) {
      router.replace('/signup');
      return;
    }
    setSignupData(JSON.parse(data));
  }, [router]);

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select('id, name, price, billing_cycle, description')
        .eq('is_active', true)
        .order('price', { ascending: true });

      setProducts((data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        billing_cycle: p.billing_cycle || 'monthly',
        description: p.description || null,
      })));
      setProductsLoading(false);
    };
    fetchProducts();
  }, []);

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    sessionStorage.setItem('selected_plan', JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Free',
      priceValue: product.price,
    }));
  };

  const handleContinue = () => {
    if (!selectedProductId) return;
    setLoading(true);
    router.push('/signup/payment');
  };

  const handleFreeTrial = () => {
    const firstProduct = products[0];
    if (!firstProduct) return;
    setLoading(true);
    sessionStorage.setItem('selected_plan', JSON.stringify({
      id: firstProduct.id,
      name: firstProduct.name,
      price: firstProduct.price > 0 ? `₹${firstProduct.price.toLocaleString('en-IN')}` : 'Free',
      priceValue: firstProduct.price,
      isTrial: true,
    }));
    router.push('/signup/payment?trial=true');
  };

  if (!signupData) return null;

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <AppLogo size={32} />
          <span className="text-lg font-bold text-white">Shaarvik</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
          Choose your plan
        </h1>
        <p className="text-gray-400 text-sm text-center max-w-md">
          Welcome, <span className="text-blue-400 font-medium">{signupData?.name}</span>! Select the plan that fits your business needs.
        </p>
      </div>

      {/* Products Grid */}
      {productsLoading ? (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-900 border border-gray-800 p-7 animate-pulse">
              <div className="h-6 bg-gray-800 rounded mb-4 w-1/2" />
              <div className="h-4 bg-gray-800 rounded mb-6 w-3/4" />
              <div className="h-10 bg-gray-800 rounded mb-6 w-1/3" />
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => <div key={j} className="h-3 bg-gray-800 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-12">
          <Package size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No products available yet.</p>
          <p className="text-gray-600 text-sm">Please contact support to get started.</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {products.map((product, idx) => {
            const isSelected = selectedProductId === product.id;
            const isHighlighted = idx === 1 && products.length >= 3;
            return (
              <div
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className={`relative rounded-2xl p-7 flex flex-col cursor-pointer transition-all duration-200 ${
                  isHighlighted
                    ? 'bg-blue-600 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-950'
                    : isSelected
                    ? 'bg-gray-800 ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-950' :'bg-gray-900 border border-gray-800 hover:border-gray-600'
                }`}
              >
                {isHighlighted && (
                  <div className="text-xs font-bold text-blue-200 bg-blue-500/30 px-3 py-1 rounded-full self-start mb-4 uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                {isSelected && !isHighlighted && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {isHighlighted ? (
                    <Star size={20} className="text-white" />
                  ) : (
                    <Zap size={20} className="text-blue-500" />
                  )}
                  <h3 className="text-xl font-bold text-white">{product.name}</h3>
                </div>
                {product.description && (
                  <p className={`text-sm mb-5 ${isHighlighted ? 'text-blue-100' : 'text-gray-400'}`}>
                    {product.description}
                  </p>
                )}
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-white">
                    {product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Free'}
                  </span>
                  {product.price > 0 && (
                    <span className={`text-sm capitalize ${isHighlighted ? 'text-blue-200' : 'text-gray-500'}`}>
                      /{product.billing_cycle}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectProduct(product); }}
                  className={`w-full px-4 py-3 font-semibold rounded-xl transition-all duration-200 text-sm mt-auto ${
                    isHighlighted
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
                      : isSelected
                      ? 'bg-blue-600 text-white' :'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {isSelected ? '✓ Selected' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="max-w-md mx-auto space-y-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedProductId || loading || productsLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          {loading ? 'Redirecting...' : 'Continue to Payment'}
        </button>

        {products.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <button
              type="button"
              onClick={handleFreeTrial}
              disabled={loading || productsLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-blue-400 border border-blue-800 hover:bg-blue-900/30 transition-all disabled:opacity-40"
            >
              🎁 Start Free Trial (14 days, no credit card)
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-600">
          <Link href="/login" className="text-gray-500 hover:text-gray-400 underline">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
