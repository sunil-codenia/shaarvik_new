'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { isValidEmail, isNonEmpty } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNonEmpty(email) || !isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AppLogo size={36} />
            <span className="text-xl font-bold text-foreground">Shaarvik</span>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl shadow-sm p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.
              </p>
              <Link href="/login" className="text-sm text-primary hover:underline font-medium">
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
                <ArrowLeft size={13} /> Back to Sign In
              </Link>
              <h1 className="text-lg font-bold text-foreground mb-1">Forgot your password?</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
