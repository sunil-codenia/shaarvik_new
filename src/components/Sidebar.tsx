'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, TrendingUp, Settings, ChevronLeft, ChevronRight, LogOut, FileText, Megaphone, LifeBuoy, UserCog, Globe, CheckSquare, Building2, AlertTriangle, LayoutList, CreditCard, BarChart2, ShieldCheck, ChevronDown, Network, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';


interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  group: string;
  module?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main', module: 'Dashboard' },
  { id: 'nav-marketing', label: 'Marketing', href: '/marketing', icon: Megaphone, group: 'main', module: 'Marketing' },
  { id: 'nav-leads', label: 'Leads', href: '/leads', icon: TrendingUp, group: 'main', module: 'Leads' },
  { id: 'nav-clients', label: 'Clients', href: '/clients', icon: Users, group: 'main', module: 'Clients' },
  { id: 'nav-tasks', label: 'Tasks', href: '/tasks', icon: CheckSquare, group: 'main' },
  { id: 'nav-invoices', label: 'Billing', href: '/invoices', icon: FileText, group: 'main', module: 'Billing' },
  { id: 'nav-tickets', label: 'Support', href: '/tickets', icon: LifeBuoy, group: 'main', module: 'Support' },
  { id: 'nav-companies', label: 'Companies', href: '/companies', icon: Building2, group: 'main', adminOnly: true },
  { id: 'nav-plans', label: 'Plans', href: '/plans', icon: LayoutList, group: 'main', adminOnly: true },
  { id: 'nav-subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: CreditCard, group: 'main', adminOnly: true },
  { id: 'nav-staff', label: 'Staff', href: '/staff', icon: UserCog, group: 'main', module: 'Staff' },
  { id: 'nav-user-management', label: 'User Management', href: '/user-management', icon: UsersRound, group: 'system', adminOnly: true },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings, group: 'system' },
];

const marketingDropdownItems = [
  { id: 'nav-ai-performance', label: 'AI Performance', href: '/marketing/ai-performance', icon: BarChart2 },
  { id: 'nav-ai-audit', label: 'AI Audit Log', href: '/marketing/ai-audit', icon: ShieldCheck },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin, canView, loading: rbacLoading } = useRBAC();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const role = user?.user_metadata?.role || 'staff';

  // Auto-open marketing dropdown if on a marketing sub-page
  useEffect(() => {
    if (pathname.startsWith('/marketing/ai-performance') || pathname.startsWith('/marketing/ai-audit')) {
      setMarketingOpen(true);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await signOut();
      setShowLogoutConfirm(false);
      router.push('/login');
      router.refresh();
    } catch {
      setLogoutError('Logout failed, please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const isNavVisible = (item: NavItem): boolean => {
    if (item.adminOnly) return isAdmin;
    if (!item.module) return true;
    if (isAdmin) return true;
    if (rbacLoading) return true;
    return canView(item.module);
  };

  const visibleMain = navItems.filter((i) => i.group === 'main' && isNavVisible(i));
  const visibleSystem = navItems.filter((i) => i.group === 'system' && isNavVisible(i));

  const isMarketingActive = pathname === '/marketing' || pathname.startsWith('/marketing/');

  return (
    <>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <AlertTriangle size={20} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px]">Confirm Logout</h3>
                <p className="text-[12px]" style={{ color: 'rgba(148,163,184,0.7)' }}>You will be redirected to login</p>
              </div>
            </div>
            <p className="text-[13px] mb-5" style={{ color: 'rgba(148,163,184,0.85)' }}>
              Are you sure you want to logout?
            </p>
            {logoutError && (
              <div
                className="mb-4 px-3 py-2 rounded-lg text-[12px]"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                {logoutError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowLogoutConfirm(false); setLogoutError(null); }}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 flex items-center justify-center gap-2"
                style={{ background: loggingOut ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.85)', color: '#fff' }}
                onMouseEnter={(e) => { if (!loggingOut) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,1)'; }}
                onMouseLeave={(e) => { if (!loggingOut) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.85)'; }}
              >
                {loggingOut ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                    Logging out…
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0a1628 0%, #0f1f3d 40%, #1a2744 100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '2px 0 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo / Brand */}
        <div
          className={`flex items-center h-16 flex-shrink-0 px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 2px 12px rgba(59,130,246,0.5)' }}
          >
            S
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-semibold text-[13.5px] leading-tight truncate">Shaarvik</p>
              <p className="text-[10px] leading-tight truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>Control Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
          {!collapsed && (
            <p className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(71,85,105,1)' }}>
              Main
            </p>
          )}
          <ul className="space-y-0.5 px-2">
            {visibleMain.map((item) => {
              const ItemIcon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/marketing' && pathname.startsWith(item.href + '/'));
              const isMarketingItem = item.id === 'nav-marketing';

              if (isMarketingItem) {
                return (
                  <li key={item.id}>
                    {/* Marketing row with dropdown toggle */}
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={item.href}
                        className={`group relative flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                          collapsed ? 'justify-center' : ''
                        }`}
                        style={
                          isMarketingActive
                            ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', boxShadow: 'inset 3px 0 0 #3b82f6' }
                            : { color: 'rgba(148,163,184,0.8)' }
                        }
                        onMouseEnter={(e) => {
                          if (!isMarketingActive) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                            (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMarketingActive) {
                            (e.currentTarget as HTMLElement).style.background = '';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.8)';
                          }
                        }}
                        title={collapsed ? item.label : undefined}
                      >
                        <ItemIcon size={17} className="flex-shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {collapsed && (
                          <span
                            className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                      {!collapsed && (
                        <button
                          onClick={() => setMarketingOpen(!marketingOpen)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 flex-shrink-0"
                          style={{ color: 'rgba(148,163,184,0.5)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.5)'; }}
                          title="Toggle Marketing submenu"
                        >
                          <ChevronDown
                            size={13}
                            style={{ transform: marketingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                          />
                        </button>
                      )}
                    </div>

                    {/* Dropdown sub-items */}
                    {!collapsed && marketingOpen && (
                      <ul className="mt-0.5 ml-4 space-y-0.5 pl-3" style={{ borderLeft: '1px solid rgba(59,130,246,0.2)' }}>
                        {marketingDropdownItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + '/');
                          return (
                            <li key={sub.id}>
                              <Link
                                href={sub.href}
                                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-150"
                                style={
                                  isSubActive
                                    ? { background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }
                                    : { color: 'rgba(148,163,184,0.65)' }
                                }
                                onMouseEnter={(e) => {
                                  if (!isSubActive) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                                    (e.currentTarget as HTMLElement).style.color = '#cbd5e1';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSubActive) {
                                    (e.currentTarget as HTMLElement).style.background = '';
                                    (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.65)';
                                  }
                                }}
                              >
                                <SubIcon size={14} className="flex-shrink-0" />
                                <span className="truncate">{sub.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    style={
                      isActive
                        ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', boxShadow: 'inset 3px 0 0 #3b82f6' }
                        : { color: 'rgba(148,163,184,0.8)' }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                        (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = '';
                        (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.8)';
                      }
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <ItemIcon size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {collapsed && (
                      <span
                        className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* System Group */}
          <div className="mt-3 pt-3 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(71,85,105,1)' }}>
                System
              </p>
            )}
            <ul className="space-y-0.5">
              {visibleSystem.map((item) => {
                const ItemIcon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                        collapsed ? 'justify-center' : ''
                      }`}
                      style={
                        isActive
                          ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', boxShadow: 'inset 3px 0 0 #3b82f6' }
                          : { color: 'rgba(148,163,184,0.8)' }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                          (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = '';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.8)';
                        }
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      <ItemIcon size={17} className="flex-shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {collapsed && (
                        <span
                          className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Debug Reports Section */}
          {/* remove Debug Reports section */}

          {/* Back to Website */}
          <div className="mt-3 pt-3 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link
              href="/website"
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                background: 'rgba(59,130,246,0.08)',
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.18)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.4)';
                (e.currentTarget as HTMLElement).style.color = '#93c5fd';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.2)';
                (e.currentTarget as HTMLElement).style.color = '#60a5fa';
              }}
              title={collapsed ? 'Back to Website' : undefined}
            >
              <Globe size={17} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">Back to Website</span>}
              {collapsed && (
                <span
                  className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Back to Website
                </span>
              )}
            </Link>
          </div>

          {/* System Architecture — Temp Dev Module */}
          <div className="mt-1 mx-2">
            <Link
              href="/system-architecture"
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                collapsed ? 'justify-center' : ''
              }`}
              style={
                pathname === '/system-architecture'
                  ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', boxShadow: 'inset 3px 0 0 #fbbf24' }
                  : { color: 'rgba(251,191,36,0.7)' }
              }
              onMouseEnter={(e) => {
                if (pathname !== '/system-architecture') {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.1)';
                  (e.currentTarget as HTMLElement).style.color = '#fbbf24';
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== '/system-architecture') {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(251,191,36,0.7)';
                }
              }}
              title={collapsed ? 'System Architecture' : undefined}
            >
              <Network size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1 truncate flex items-center gap-1.5">
                  Sys. Architecture
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                  >
                    TEMP
                  </span>
                </span>
              )}
              {collapsed && (
                <span
                  className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  System Architecture (Temp)
                </span>
              )}
            </Link>
          </div>

          {/* Logout Nav Item */}
          <div className="mt-1 mx-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={`group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{ color: 'rgba(248,113,113,0.85)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
                (e.currentTarget as HTMLElement).style.color = '#f87171';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '';
                (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.85)';
              }}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={17} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">Logout</span>}
              {collapsed && (
                <span
                  className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Logout
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Bottom: User + Collapse */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {!collapsed ? (
            <div
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg"
              style={{ color: 'rgba(148,163,184,0.85)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 2px 8px rgba(59,130,246,0.35)' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium text-slate-200 truncate">{displayName}</p>
                <p className="text-[11px] capitalize" style={{ color: 'rgba(100,116,139,1)' }}>{role}</p>
              </div>
            </div>
          ) : (
            <div
              className="w-full flex items-center justify-center p-2 rounded-lg"
              style={{ color: 'rgba(100,116,139,1)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
              >
                {initials}
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-150"
            style={{ color: 'rgba(100,116,139,0.8)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}