'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Mail, Shield, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const role = user?.user_metadata?.role || 'staff';
  const email = user?.email || '';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccess('Your password has been updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your profile and security preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col: Profile Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="flex flex-col items-center text-center space-y-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
              >
                {initials}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{displayName}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{email}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 italic">
                  <Shield size={12} />
                  {role}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400" />
                <span className="truncate">{email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <User size={16} className="text-slate-400" />
                <span className="capitalize">{role} Account</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Password Change Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <KeyRound size={18} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-900">Sign-in & Security</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm animate-in slide-in-from-top-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm animate-in slide-in-from-top-2">
                  <CheckCircle2 size={18} />
                  {success}
                </div>
              )}

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Current Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={16} />
                    <input
                      type="password"
                      required
                      value={form.currentPassword}
                      onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      New Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={16} />
                      <input
                        type="password"
                        required
                        value={form.newPassword}
                        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        placeholder="Min. 8 characters"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      Confirm New Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={16} />
                      <input
                        type="password"
                        required
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        placeholder="Re-type new password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
