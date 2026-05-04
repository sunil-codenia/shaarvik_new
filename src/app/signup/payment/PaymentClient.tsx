'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { CreditCard, Smartphone, Building, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type PaymentMethod = 'upi' | 'card' | 'netbanking';
type PageState = 'form' | 'processing' | 'success' | 'error';

export default function PaymentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTrial = searchParams.get('trial') === 'true';
  const supabase = createClient();

  const [signupData, setSignupData] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [pageState, setPageState] = useState<PageState>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sd = sessionStorage.getItem('signup_data');
    const pd = sessionStorage.getItem('selected_plan');
    if (!sd || !pd) { router.replace('/signup'); return; }
    setSignupData(JSON.parse(sd));
    setPlanData(JSON.parse(pd));
  }, [router]);

  const formatCard = (val: string) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (val: string) => {
    const v = val.replace(/\D/g, '').slice(0, 4);
    return v.length >= 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
  };

  const validatePayment = (): string | null => {
    if (paymentMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) return 'Please enter a valid UPI ID (e.g. name@upi).';
    }
    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) return 'Please enter a valid 16-digit card number.';
      if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) return 'Please enter a valid expiry date (MM/YY).';
      if (cardCvv.length < 3) return 'Please enter a valid CVV.';
      if (!cardName.trim()) return 'Please enter the cardholder name.';
    }
    if (paymentMethod === 'netbanking') {
      if (!selectedBank) return 'Please select your bank.';
    }
    return null;
  };

  const createSubscriptionRecord = async (companyId: string, planId: string, planName: string) => {
    // Fetch a product to link subscription to (first active product)
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const { data: sub } = await supabase.from('subscriptions').insert({
      company_id: companyId,
      product_id: product?.id ?? null,
      plan: planName,
      status: 'active',
    }).select('id, product_id').single();

    return sub;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTrial) {
      const validationError = validatePayment();
      if (validationError) { setError(validationError); return; }
    }

    setLoading(true);
    setPageState('processing');
    setError(null);

    try {
      // Simulate payment processing
      if (!isTrial) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const companyId: string | null = signupData?.companyId ?? null;

      if (companyId) {
        // Create subscription record linked to company
        const sub = await createSubscriptionRecord(companyId, planData?.id, planData?.name);

        // Create invoice for paid plans
        if (!isTrial && planData?.priceValue > 0) {
          const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          await supabase.from('invoices').insert({
            invoice_number: `INV-${Date.now()}`,
            company_id: companyId,
            product_id: sub?.product_id ?? null,
            subscription_id: sub?.id ?? null,
            amount: planData?.priceValue,
            final_amount: planData?.priceValue,
            paid_amount: planData?.priceValue,
            status: 'paid',
            due_date: new Date().toISOString().split('T')[0],
            notes: `${planData?.name} Plan - Initial Payment. Ref: ${paymentRef}`,
          });
        }
      }

      // Clear session storage
      sessionStorage.removeItem('signup_data');
      sessionStorage.removeItem('selected_plan');

      setPageState('success');
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.');
      setPageState('error');
    } finally {
      setLoading(false);
    }
  };

  if (!signupData || !planData) return null;

  // Success State
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isTrial ? '🎉 Trial Activated!' : '🎉 Payment Successful!'}
          </h1>
          <p className="text-gray-500 mb-4">
            {isTrial
              ? `Your 14-day free trial for ${planData?.name} plan has been activated.`
              : `Your ${planData?.name} plan is now active.`}
          </p>
          <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-6">
            ✅ Company created · Subscription active{!isTrial ? ' · Invoice generated' : ''}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please sign in with your credentials to access your dashboard.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Go to Sign In →
          </button>
        </div>
      </div>
    );
  }

  // Processing State
  if (pageState === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isTrial ? 'Activating your trial...' : 'Processing payment...'}
          </h2>
          <p className="text-gray-500 text-sm">Please wait, do not close this page.</p>
        </div>
      </div>
    );
  }

  // Error State
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6">{error || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => setPageState('form')}
            className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AppLogo size={32} />
            <span className="text-lg font-bold text-gray-900">Shaarvik</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center">
            {isTrial ? 'Activate Free Trial' : 'Complete Payment'}
          </h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            {planData?.name} Plan — {isTrial ? '14-day free trial' : planData?.price}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          {isTrial ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-6">
                Your account has been created. Click below to activate your 14-day free trial.
              </p>
              <button
                onClick={handlePayment as any}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                🎁 Activate Free Trial
              </button>
            </div>
          ) : (
            <form onSubmit={handlePayment} className="space-y-5">
              {/* Payment Method Tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                {([
                  { id: 'upi', label: 'UPI', icon: <Smartphone size={14} /> },
                  { id: 'card', label: 'Card', icon: <CreditCard size={14} /> },
                  { id: 'netbanking', label: 'Net Banking', icon: <Building size={14} /> },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${paymentMethod === m.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {m.icon}{m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'upi' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">UPI ID</label>
                  <input
                    type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Card Number</label>
                    <input
                      type="text" value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))}
                      placeholder="1234 5678 9012 3456" maxLength={19}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">Expiry</label>
                      <input
                        type="text" value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY" maxLength={5}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">CVV</label>
                      <input
                        type="password" value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Cardholder Name</label>
                    <input
                      type="text" value={cardName} onChange={e => setCardName(e.target.value)}
                      placeholder="Name on card"
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'netbanking' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Select Bank</label>
                  <select
                    value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  >
                    <option value="">Choose your bank</option>
                    {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Yes Bank', 'PNB', 'Bank of Baroda'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <Shield size={13} className="text-green-500 flex-shrink-0" />
                <span>Your payment is secured with 256-bit SSL encryption</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Processing...' : `Pay ${planData?.price}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

