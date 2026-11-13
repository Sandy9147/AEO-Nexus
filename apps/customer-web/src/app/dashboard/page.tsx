'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { DashboardSummaryDto } from '@aeo-nexus/contracts';

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [userName, setUserName] = useState<string>('Founder');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const token = localStorage.getItem('aeo_access_token');
    const workspaceId = localStorage.getItem('aeo_active_workspace_id');

    if (!token) {
      router.replace('/login');
      return;
    }

    const storedUser = localStorage.getItem('aeo_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.firstName) setUserName(u.firstName);
      } catch {
        // Ignore
      }
    }

    if (!workspaceId) {
      router.replace('/workspaces');
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/dashboard-summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspaceId,
          },
        });

        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error?.message || 'Failed to load dashboard summary');
        }

        setSummary(json.data);
      } catch (err: any) {
        setError(err.message || 'Unable to connect to AEO Nexus API');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router, API_BASE]);

  return (
    <CustomerShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Workspace Overview
              </span>
              {summary?.workspace.role && (
                <Badge variant="primary">
                  {summary.workspace.role.replace('WORKSPACE_', '')}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {userName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here is the live operational health and active setup for{' '}
              <span className="font-semibold text-slate-700">
                {summary?.workspace.name || 'your workspace'}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/onboarding">
              <Button size="sm" variant="outline" className="text-xs">
                Resume Onboarding
              </Button>
            </Link>
            <Link href="/apps">
              <Button size="sm" variant="primary" className="text-xs">
                Launch Tools
              </Button>
            </Link>
          </div>
        </div>

        {loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin text-2xl text-[#3563F6] mb-3">⟳</div>
            <p className="text-sm font-medium text-slate-600">Loading workspace telemetry...</p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <div className="font-semibold mb-1">Error Loading Dashboard</div>
            <p>{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 bg-white text-xs"
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </Button>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            {/* Business Profile Completion & Onboarding Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Completion Bar */}
              <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base text-slate-900">
                        Business Profile Setup
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Context completeness informing marketing and search visibility
                      </CardDescription>
                    </div>
                    <span className="text-xl font-bold text-[#3563F6]">
                      {summary.profileCompletion}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#3563F6] to-[#6554E8] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${summary.profileCompletion}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                      <span className="text-slate-400 block text-[10px] uppercase">Entity</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {summary.businessProfile?.businessName || 'Not Set'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                      <span className="text-slate-400 block text-[10px] uppercase">Industry</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {summary.businessProfile?.industry || 'Not Set'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                      <span className="text-slate-400 block text-[10px] uppercase">Primary Color</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="h-3 w-3 rounded-full border border-slate-300"
                          style={{
                            backgroundColor: summary.brandProfile?.primaryColor || '#3563F6',
                          }}
                        />
                        <span className="font-mono text-slate-700 text-[11px]">
                          {summary.brandProfile?.primaryColor || '#3563F6'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                      <span className="text-slate-400 block text-[10px] uppercase">Brand Voice</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {summary.brandProfile?.brandVoice ? 'Defined' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-900">Quick Actions</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Direct access to frequent operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/onboarding/business" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs text-slate-700">
                      🏢 Update Business Profile
                    </Button>
                  </Link>
                  <Link href="/onboarding/brand" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs text-slate-700">
                      🎨 Edit Brand Kit & Colors
                    </Button>
                  </Link>
                  <Link href="/team" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs text-slate-700">
                      👥 Invite Team Member
                    </Button>
                  </Link>
                  <Link href="/settings" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs text-slate-700">
                      ⚙️ Workspace Preferences
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Getting Started Checklist */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      Getting Started Checklist
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Follow these milestones to set up your business operating system
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {summary.checklist.filter((c) => c.completed).length} / {summary.checklist.length} Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {summary.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-xs mt-0.5 ${
                          item.completed
                            ? 'bg-emerald-100 text-emerald-700 font-bold'
                            : 'border border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                      <div>
                        <div
                          className={`text-sm font-semibold ${
                            item.completed ? 'text-slate-700' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <Link href={item.href}>
                      <Button
                        size="sm"
                        variant={item.completed ? 'outline' : 'primary'}
                        className="text-xs shrink-0"
                      >
                        {item.completed ? 'Review' : 'Configure →'}
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recently Accessed Tools & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Essential & Curated Tools */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      Essential Workspace Tools
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Active operational utilities ready to launch
                    </CardDescription>
                  </div>
                  <Link href="/apps" className="text-xs text-[#3563F6] hover:underline font-semibold">
                    View Catalog →
                  </Link>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {summary.recentTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="p-3 rounded-xl border border-slate-100 bg-[#F7F9FC] hover:border-[#3563F6]/50 transition flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{tool.name}</span>
                          <Badge variant="primary" className="text-[9px] py-0">
                            {tool.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{tool.description}</p>
                      </div>
                      <Link href={tool.href}>
                        <Button size="sm" variant="outline" className="text-xs bg-white shrink-0">
                          Launch
                        </Button>
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activity Log */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base text-slate-900">Recent Activity</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Live audit trail of workspace configuration events
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {summary.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs"
                    >
                      <div className="h-6 w-6 rounded-full bg-[#EAF0FF] text-[#3563F6] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        ⚡
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 capitalize">
                          {act.action}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                          {act.resource}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Projects & Usage Summary (Truth in Telemetry) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Projects Overview</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Active deliverables across Plan, Build, and Market
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-6">
                  <div className="text-3xl mb-2">📁</div>
                  <h4 className="text-sm font-semibold text-slate-800">No active projects yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Complete your onboarding profile to initialize your first business campaign or asset pipeline.
                  </p>
                  <Link href="/onboarding">
                    <Button size="sm" variant="outline" className="text-xs">
                      Continue Setup
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Usage & Quotas</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Telemetry from authenticated runtime services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Workspace Member Seats</span>
                      <span className="font-semibold text-slate-900">1 Active</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#3563F6] h-1.5 w-[20%]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Database Isolated Tenant</span>
                      <span className="font-semibold text-emerald-600">Active (Neon)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Standard tier with serverless PostgreSQL persistence.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </CustomerShell>
  );
}

