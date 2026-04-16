'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Mail, Lock, Eye, EyeOff, User, Building2, Phone, ArrowRight } from 'lucide-react';
import { isValidEmail, isNonEmpty } from '@/lib/validation';

interface FormData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!isNonEmpty(form.name)) return 'Full name is required.';
    if (!isNonEmpty(form.companyName)) return 'Company name is required.';
    if (!isNonEmpty(form.email) || !isValidEmail(form.email)) return 'A valid email address is required.';
    if (!isNonEmpty(form.password) || form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.companyName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Account creation failed. Please try again.');
        return;
      }

      // Step 5: Store signup data for plan selection (company_id included)
      sessionStorage.setItem('signup_data', JSON.stringify({
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        password: form.password,
        userId: data?.user?.id ?? null,
        companyId: data?.companyId ?? null,
      }));

      router.push('/signup/plans');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AppLogo size={36} />
            <span className="text-xl font-bold text-gray-900">Shaarvik</span>
          </div>
          <p className="text-sm text-gray-500 text-center">Create your account to get started</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="name" name="name" type="text" value={form.name} onChange={handleChange}
                  placeholder="John Doe" autoComplete="name"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="companyName" name="companyName" type="text" value={form.companyName} onChange={handleChange}
                  placeholder="Acme Construction Ltd." autoComplete="organization"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="email" name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="you@company.com" autoComplete="email" inputMode="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange}
                  placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="Min. 8 characters" autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Toggle password">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="Re-enter password" autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Toggle confirm password">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <ArrowRight size={16} />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
