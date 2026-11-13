'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@aeo-nexus/ui';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  isComingSoon?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'AI Business Agent', href: '/agent', icon: '🤖', badge: 'Phase 5', isComingSoon: true },
  { name: 'Apps & Tools', href: '/apps', icon: '⚡' },
];

const LIFECYCLE_NAV: NavItem[] = [
  { name: 'Discover', href: '/discover', icon: '🔍', isComingSoon: true },
  { name: 'Plan', href: '/plan', icon: '📋', isComingSoon: true },
  { name: 'Build', href: '/build', icon: '🛠️', isComingSoon: true },
  { name: 'Market', href: '/market', icon: '📢', isComingSoon: true },
  { name: 'Automate', href: '/automate', icon: '⚡', isComingSoon: true },
  { name: 'Grow', href: '/grow', icon: '📈', isComingSoon: true },
];

const WORKSPACE_NAV: NavItem[] = [
  { name: 'Projects', href: '/projects', icon: '📁' },
  { name: 'Assets & Knowledge', href: '/assets', icon: '📚' },
  { name: 'Team', href: '/team', icon: '👥' },
  { name: 'Integrations', href: '/integrations', icon: '🔌', isComingSoon: true },
  { name: 'Billing & Usage', href: '/billing', icon: '💳', isComingSoon: true },
  { name: 'Notifications', href: '/notifications', icon: '🔔' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [userName, setUserName] = useState<string>('Business Owner');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('aeo_access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const storedUser = localStorage.getItem('aeo_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.firstName) {
          setUserName(`${u.firstName} ${u.lastName || ''}`.trim());
        }
      }

      const storedWorkspaces = localStorage.getItem('aeo_workspaces');
      if (storedWorkspaces) {
        const list = JSON.parse(storedWorkspaces);
        setWorkspaces(list);
        const currentId = localStorage.getItem('aeo_active_workspace_id');
        const current = list.find((w: WorkspaceItem) => w.id === currentId) || list[0];
        if (current) {
          setActiveWorkspace(current);
          localStorage.setItem('aeo_active_workspace_id', current.id);
        }
      }
    } catch {
      // Fallback
    }
  }, [router]);

  const switchWorkspace = (ws: WorkspaceItem) => {
    setActiveWorkspace(ws);
    localStorage.setItem('aeo_active_workspace_id', ws.id);
    setWorkspaceMenuOpen(false);
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('aeo_access_token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('aeo_access_token');
      localStorage.removeItem('aeo_user');
      localStorage.removeItem('aeo_workspaces');
      localStorage.removeItem('aeo_active_workspace_id');
      router.push('/login');
    }
  };

  const renderNavLinks = (items: NavItem[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-[#3563F6] text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">{item.icon}</span>
              <span>{item.name}</span>
            </div>
            {item.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              N
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900">AEO Nexus</span>
              <span className="text-[10px] font-medium text-slate-400">Customer Platform</span>
            </div>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Active Workspace Pill / Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-xs font-medium text-slate-800 transition"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="max-w-[140px] truncate font-semibold">
                {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
              </span>
              <span className="text-[10px] text-slate-400">▼</span>
            </button>

            {workspaceMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Workspace
                </div>
                <div className="space-y-1 my-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => switchWorkspace(ws)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition text-left ${
                        activeWorkspace?.id === ws.id
                          ? 'bg-[#EAF0FF] text-[#3563F6] font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ws.role.replace('WORKSPACE_', '')}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href="/workspaces"
                    onClick={() => setWorkspaceMenuOpen(false)}
                    className="text-xs text-[#3563F6] hover:underline font-medium px-2 py-1"
                  >
                    Manage Workspaces
                  </Link>
                  <Link
                    href="/onboarding"
                    onClick={() => setWorkspaceMenuOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                  >
                    + New
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Onboarding Resume Link if applicable */}
          <Link href="/onboarding">
            <Button size="sm" variant="outline" className="hidden sm:inline-flex text-xs h-8">
              Onboarding
            </Button>
          </Link>

          {/* User profile & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-[#EAF0FF] border border-[#3563F6]/20 text-[#3563F6] font-bold text-xs flex items-center justify-center">
              {userName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium transition px-1"
              title="Logout"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-200/80 bg-white hidden md:flex flex-col py-6 px-4 space-y-6 shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Core Platform
            </div>
            {renderNavLinks(PRIMARY_NAV)}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Business Lifecycle
            </div>
            {renderNavLinks(LIFECYCLE_NAV)}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Workspace & Operations
            </div>
            {renderNavLinks(WORKSPACE_NAV)}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-[#F7F9FC] border border-slate-200/60 text-xs">
              <div className="font-semibold text-slate-800">AEO Nexus OS</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Phase 3 Customer Platform</div>
              <div className="mt-2 text-[10px] text-emerald-600 font-medium flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Backend Connected
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-slate-900/40 backdrop-blur-sm flex">
            <div className="w-72 bg-white h-full p-4 overflow-y-auto space-y-6 shadow-xl animate-in slide-in-from-left">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="font-bold text-sm text-slate-900">Navigation Menu</div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Core Platform
                </div>
                {renderNavLinks(PRIMARY_NAV)}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Business Lifecycle
                </div>
                {renderNavLinks(LIFECYCLE_NAV)}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Workspace
                </div>
                {renderNavLinks(WORKSPACE_NAV)}
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

