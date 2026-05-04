'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, X, LayoutDashboard, Users, User, TrendingUp, Settings, LogOut, Package, CreditCard, FileText, Megaphone, LifeBuoy, UserCog, ChevronDown, Globe, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import Icon from '@/components/ui/AppIcon';
import { useTheme } from '@/contexts/ThemeContext';


interface MobileNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  module?: string;
  adminOnly?: boolean;
}

const mobileNavItems: MobileNavItem[] = [
  { id: 'mob-dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'Dashboard' },
  { id: 'mob-marketing', label: 'Marketing', href: '/marketing', icon: Megaphone, module: 'Marketing' },
  { id: 'mob-leads', label: 'Leads', href: '/leads', icon: TrendingUp, module: 'Leads' },
  { id: 'mob-clients', label: 'Clients', href: '/clients', icon: Users, module: 'Clients' },
  { id: 'mob-subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: CreditCard, module: 'Subscriptions' },
  { id: 'mob-invoices', label: 'Billing', href: '/invoices', icon: FileText, module: 'Billing' },
  { id: 'mob-tickets', label: 'Support', href: '/tickets', icon: LifeBuoy, module: 'Support' },
  { id: 'mob-products', label: 'Products', href: '/products', icon: Package, module: 'Products' },
  { id: 'mob-staff', label: 'Staff', href: '/staff', icon: UserCog, module: 'Staff' },
  { id: 'mob-profile', label: 'My Profile', href: '/profile', icon: User },
  { id: 'mob-settings', label: 'Settings', href: '/settings', icon: Settings },
];

export default function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin, canView, loading: rbacLoading } = useRBAC();
  const { isDark, toggleTheme } = useTheme();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const role = user?.user_metadata?.role || 'staff';
  const email = user?.email || '';

  const handleSignOut = async () => {
    try {
      setDropdownOpen(false);
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {}
  };

  const isNavVisible = (item: MobileNavItem): boolean => {
    if (item.adminOnly) return isAdmin;
    if (!item.module) return true;
    if (isAdmin) return true;
    if (rbacLoading) return true;
    return canView(item.module);
  };

  const visibleItems = mobileNavItems.filter(isNavVisible);

  return (
    <>
      {/* Desktop Topbar */}
      <header
        className="hidden lg:flex sticky top-0 z-40 h-14 items-center px-6 gap-4"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid hsl(var(--border))',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}
          >
            S
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-slate-800 leading-tight">Shaarvik Control Panel</p>
            <p className="text-[10px] text-slate-400 leading-tight">Shaarvik Technologies LLP</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/website"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
            style={{
              color: '#3b82f6',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.15)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.2)';
            }}
          >
            <Globe size={13} />
            <span>Website</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 0 2px white' }} />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'hsl(var(--foreground))' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="User menu"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 2px 6px rgba(59,130,246,0.35)' }}
              >
                {initials}
              </div>
              <div className="text-left hidden xl:block">
                <p className="text-[12.5px] font-medium text-slate-700 leading-tight">{displayName}</p>
                <p className="text-[10.5px] text-slate-400 capitalize leading-tight">{role}</p>
              </div>
              <ChevronDown size={13} className={`text-slate-400 hidden xl:block transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
                <div
                  className="absolute right-0 top-full mt-1.5 w-56 rounded-xl z-50 overflow-hidden"
                  style={{
                    background: 'white',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 2px 6px rgba(59,130,246,0.35)' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">{displayName}</p>
                        <p className="text-[11px] text-slate-400 leading-tight truncate">{email}</p>
                        <p className="text-[10px] text-blue-500 capitalize leading-tight font-medium">{role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 transition-colors"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <User size={14} className="text-slate-400" />
                      My Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 transition-colors"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--muted))'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <Settings size={14} className="text-slate-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors"
                      style={{ color: '#ef4444', cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Topbar */}
      <header
        className="lg:hidden sticky top-0 z-40 h-14 flex items-center px-4 gap-3"
        style={{ background: '#0a1628', borderBottom: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'rgba(148,163,184,0.85)' }}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
          >
            S
          </div>
          <p className="text-[13px] font-semibold text-white leading-tight">Shaarvik Control Panel</p>
        </div>
        <button
          className="relative p-1.5 rounded-md transition-colors"
          style={{ color: 'rgba(148,163,184,0.85)' }}
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 0 1.5px #0a1628' }} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside
            className="relative z-10 w-72 h-full flex flex-col animate-slide-up"
            style={{
              background: 'linear-gradient(180deg, #0a1628 0%, #1e293b 100%)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 2px 6px rgba(59,130,246,0.4)' }}
                >
                  S
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white leading-tight">Shaarvik</p>
                  <p className="text-[10px] leading-tight" style={{ color: 'rgba(100,116,139,1)' }}>Control Panel</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'rgba(100,116,139,1)' }}
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(100,116,139,1)' }}>
                Navigation
              </p>
              <ul className="space-y-0.5">
                {visibleItems?.map((item) => {
                  const Icon = item?.icon;
                  const isActive = pathname === item?.href || pathname.startsWith(item?.href + '/');
                  return (
                    <li key={item?.id}>
                      <Link
                        href={item?.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150"
                        style={
                          isActive
                            ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', boxShadow: 'inset 3px 0 0 #3b82f6' }
                            : { color: 'rgba(148,163,184,0.85)' }
                        }
                      >
                        <Icon size={17} />
                        {item?.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Back to Website */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Link
                  href="/website"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}
                >
                  <Globe size={17} />
                  Back to Website
                </Link>
              </div>
            </nav>

            <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{ color: 'rgba(148,163,184,0.85)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-slate-200 truncate">{displayName}</p>
                  <p className="text-[11px] capitalize" style={{ color: 'rgba(100,116,139,1)' }}>{role}</p>
                </div>
                <LogOut size={14} style={{ color: 'rgba(100,116,139,1)' }} />
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}