'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { PlanningOverviewDto } from '@aeo-nexus/contracts';

export default function PlanDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PlanningOverviewDto | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>('');

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);

    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOverview(data);
      })
      .catch((err) => console.error('Failed to load Plan overview:', err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
        return <Badge variant="success">{status}</Badge>;
      case 'READY_FOR_REVIEW':
        return <Badge variant="primary">Ready For Review</Badge>;
      case 'GENERATING':
        return <Badge variant="primary">Generating...</Badge>;
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'ARCHIVED':
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <h1 className="text-2xl font-bold text-gray-900">Plan — AI Business Planning & Strategy Engine</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Transform Discover research and market opportunities into rigorous business plans, execution roadmaps, measurable goals, and prioritized initiatives.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/plan/reports">
              <Button variant="outline" size="sm">
                📄 Executive Reports
              </Button>
            </Link>
            <Link href="/plan/reviews">
              <Button variant="outline" size="sm">
                🔄 Strategy Reviews
              </Button>
            </Link>
            <Link href="/plan/strategies/new">
              <Button variant="primary" size="sm">
                + New Strategic Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* Journey Breadcrumb: Discover -> Plan -> Build */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-600 text-white font-semibold text-xs rounded-full">Lifecycle</span>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Link href="/discover" className="text-blue-600 hover:underline">1. Discover</Link>
              <span>→</span>
              <span className="text-indigo-900 font-bold bg-white px-2.5 py-0.5 rounded border border-indigo-200">2. Plan (Active)</span>
              <span>→</span>
              <span className="text-gray-400">3. Build (Coming Soon)</span>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            AI Business Agent orchestrates goals and initiative milestones.
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="text-xs font-medium text-gray-500">Strategic Plans</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? '...' : overview?.totalPlans || 0}
            </div>
            <div className="text-xs text-blue-600 mt-1 font-medium">
              {overview?.activePlans || 0} active / ready
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-green-500">
            <div className="text-xs font-medium text-gray-500">Business Goals</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? '...' : overview?.totalGoals || 0}
            </div>
            <div className="text-xs text-green-600 mt-1 font-medium">
              {overview?.achievedGoals || 0} achieved
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-500">
            <div className="text-xs font-medium text-gray-500">Prioritized Initiatives</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? '...' : overview?.totalInitiatives || 0}
            </div>
            <div className="text-xs text-purple-600 mt-1 font-medium">
              {overview?.highPriorityInitiatives || 0} high / critical
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="text-xs font-medium text-gray-500">Milestones</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? '...' : (overview?.upcomingMilestonesCount || 0) + (overview?.overdueMilestonesCount || 0)}
            </div>
            <div className="text-xs text-amber-600 mt-1 font-medium">
              {overview?.overdueMilestonesCount ? `${overview.overdueMilestonesCount} overdue` : 'All on track'}
            </div>
          </Card>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-medium overflow-x-auto">
          <Link href="/plan" className="pb-3 border-b-2 border-blue-600 text-blue-600">
            Overview Dashboard
          </Link>
          <Link href="/plan/strategies" className="pb-3 text-gray-500 hover:text-gray-700">
            Strategic Plans
          </Link>
          <Link href="/plan/roadmaps" className="pb-3 text-gray-500 hover:text-gray-700">
            Execution Roadmaps
          </Link>
          <Link href="/plan/goals" className="pb-3 text-gray-500 hover:text-gray-700">
            Goals & KPIs
          </Link>
          <Link href="/plan/priorities" className="pb-3 text-gray-500 hover:text-gray-700">
            Initiatives & Priorities
          </Link>
          <Link href="/plan/milestones" className="pb-3 text-gray-500 hover:text-gray-700">
            Milestones
          </Link>
          <Link href="/plan/reviews" className="pb-3 text-gray-500 hover:text-gray-700">
            Reviews
          </Link>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Active Plans & High-Priority Initiatives */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Plans Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🧭</span> Active Strategic Plans
                </h2>
                <Link href="/plan/strategies" className="text-xs font-medium text-blue-600 hover:underline">
                  View All Plans →
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading strategic plans...</div>
              ) : !overview?.activePlansList || overview.activePlansList.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">No strategic plans generated yet.</p>
                  <Link href="/plan/strategies/new">
                    <Button variant="primary" size="sm">
                      Generate Plan with AI
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {overview.activePlansList.map((p) => (
                    <div key={p.id} className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/plan/strategies/${p.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                            {p.title}
                          </Link>
                          {getStatusBadge(p.status)}
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            v{p.currentVersionNumber}.0
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {p.executiveSummary || p.marketPositioning || 'Comprehensive strategic business plan'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Horizon: {p.horizonMonths} mo</span>
                          <span>•</span>
                          <span>Confidence: {Math.round((p.confidenceScore || 0.85) * 100)}%</span>
                          <span>•</span>
                          <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link href={`/plan/strategies/${p.id}`}>
                        <Button variant="outline" size="sm">
                          Workspace →
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* High-Priority Initiatives Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🚀</span> Priority Strategic Initiatives
                </h2>
                <Link href="/plan/priorities" className="text-xs font-medium text-blue-600 hover:underline">
                  Manage Initiatives →
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading initiatives...</div>
              ) : !overview?.initiatives || overview.initiatives.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">No initiatives generated yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overview.initiatives.slice(0, 4).map((init) => (
                    <div key={init.id} className="p-3 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{init.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            init.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            init.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {init.priority}
                          </span>
                          <span className="text-xs text-gray-400">Impact: {init.expectedImpact}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{init.description || init.strategicRationale}</p>
                      </div>
                      <div>
                        {init.projectId ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium border border-green-200">
                            ✓ Converted to Project
                          </span>
                        ) : (
                          <Link href={`/plan/priorities`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              Convert →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Business Goals & KPI Progress */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🎯</span> Key Results & Goal Trackers
                </h2>
                <Link href="/plan/goals" className="text-xs font-medium text-blue-600 hover:underline">
                  View All Goals →
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading goals...</div>
              ) : !overview?.goals || overview.goals.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">No goals configured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overview.goals.slice(0, 4).map((g) => (
                    <div key={g.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 truncate">{g.title}</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-300 text-gray-600">
                          {g.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Current: {g.currentValue} {g.unit}</span>
                        <span>Target: {g.targetValue} {g.unit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, g.progressPercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>{g.progressPercent}% Completed</span>
                        <span>{g.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Milestones & Planning Recommendations */}
          <div className="space-y-6">
            {/* Upcoming Milestones */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <span>🚩</span> Key Milestones
                </h3>
                <Link href="/plan/milestones" className="text-xs text-blue-600 hover:underline">
                  All →
                </Link>
              </div>

              {loading ? (
                <div className="text-xs text-gray-400 py-4 text-center">Loading milestones...</div>
              ) : (
                <div className="space-y-3">
                  {overview?.overdueMilestones && overview.overdueMilestones.length > 0 && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      <span className="font-bold">⚠️ Overdue: </span>
                      {overview.overdueMilestones[0].title} (Target: {new Date(overview.overdueMilestones[0].targetDate).toLocaleDateString()})
                    </div>
                  )}

                  {overview?.upcomingMilestones && overview.upcomingMilestones.length > 0 ? (
                    overview.upcomingMilestones.slice(0, 4).map((m) => (
                      <div key={m.id} className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium text-gray-800">
                          <span>{m.title}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(m.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                        {m.successCriteria && (
                          <p className="text-[11px] text-gray-500 line-clamp-1">Criteria: {m.successCriteria}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 py-2">No upcoming milestones</div>
                  )}
                </div>
              )}
            </Card>

            {/* AI Strategic Recommendations */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <span>💡</span> AI Recommendations
                </h3>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                  Autonomous
                </span>
              </div>

              {loading ? (
                <div className="text-xs text-gray-400 py-4 text-center">Loading recommendations...</div>
              ) : !overview?.recommendations || overview.recommendations.length === 0 ? (
                <div className="text-xs text-gray-400 py-2">No pending recommendations.</div>
              ) : (
                <div className="space-y-3">
                  {overview.recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-indigo-900">
                        <span>{rec.title}</span>
                        <span className="text-[10px] uppercase text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                          {rec.impact} Impact
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">{rec.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Launchers */}
            <Card className="p-5 space-y-3 bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-100">
              <h3 className="font-bold text-gray-900 text-sm">Planning Actions</h3>
              <div className="space-y-2">
                <Link href="/plan/strategies/new" className="block">
                  <Button variant="primary" size="sm" className="w-full justify-start text-xs">
                    ✨ Generate New Strategic Plan
                  </Button>
                </Link>
                <Link href="/plan/roadmaps" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs bg-white">
                    🗺️ Open Roadmap Visualizer
                  </Button>
                </Link>
                <Link href="/plan/reviews" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs bg-white">
                    📝 Conduct Strategy Review
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
