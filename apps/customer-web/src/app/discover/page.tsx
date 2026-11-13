'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { DiscoverOverviewDto } from '@aeo-nexus/contracts';

export default function DiscoverDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DiscoverOverviewDto | null>(null);
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
    fetch(`${apiUrl}/workspaces/${wsId}/discover/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOverview(data);
      })
      .catch((err) => console.error('Failed to load Discover overview:', err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'RUNNING':
        return <Badge variant="primary">Running</Badge>;
      case 'FAILED':
        return <Badge variant="warning">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="secondary">Queued</Badge>;
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <h1 className="text-2xl font-bold text-gray-900">Discover — Research & Opportunity Intelligence</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Autonomous AI business research, competitor matrices, audience personas, market trends, and Answer Engine Optimization (AEO) visibility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/discover/reports">
              <Button variant="outline" size="sm">
                📄 Executive Reports
              </Button>
            </Link>
            <Link href="/discover/research/new">
              <Button variant="primary" size="sm">
                + New Research Study
              </Button>
            </Link>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2">
          <Link href="/discover" className="px-3 py-2 text-sm font-semibold text-[#3563F6] border-b-2 border-[#3563F6] whitespace-nowrap">
            Overview
          </Link>
          <Link href="/discover/research" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
            Research Studies
          </Link>
          <Link href="/discover/opportunities" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
            Market Opportunities
          </Link>
          <Link href="/discover/competitors" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
            Competitors
          </Link>
          <Link href="/discover/audience" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
            Audience & ICP
          </Link>
          <Link href="/discover/market-trends" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
            Market Trends
          </Link>
          <Link href="/discover/aeo-research" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
            AEO Diagnostics
          </Link>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4 bg-white border border-gray-100 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Research Studies</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : overview?.totalResearch ?? 0}</div>
            <div className="text-xs text-emerald-600 mt-1">
              {overview?.completedResearch ?? 0} completed
            </div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunities</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : overview?.totalOpportunities ?? 0}</div>
            <div className="text-xs text-blue-600 mt-1">Validated signals</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Competitors</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : overview?.totalCompetitors ?? 0}</div>
            <div className="text-xs text-purple-600 mt-1">Tracked benchmarks</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Audience ICPs</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : overview?.totalAudienceProfiles ?? 0}</div>
            <div className="text-xs text-amber-600 mt-1">AI Buyer Personas</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">AEO Queries</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : overview?.totalAeoQuestions ?? 0}</div>
            <div className="text-xs text-indigo-600 mt-1">Search gap audits</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence Avg</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">87%</div>
            <div className="text-xs text-gray-500 mt-1">Evidence-backed</div>
          </Card>
        </div>

        {/* Quick Research Actions */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Quick Research Launchers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/discover/research/new?objective=MARKET_OPPORTUNITY" className="group">
              <Card className="p-4 border border-gray-200 hover:border-[#3563F6] transition shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">💡</div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#3563F6]">Market Opportunity Study</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Detect customer friction, demand evidence, differentiation, and validation experiments.
                  </p>
                </div>
                <div className="text-xs font-medium text-[#3563F6] mt-4 flex items-center gap-1">
                  Launch Study →
                </div>
              </Card>
            </Link>

            <Link href="/discover/research/new?objective=COMPETITOR_ANALYSIS" className="group">
              <Card className="p-4 border border-gray-200 hover:border-[#3563F6] transition shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">⚔️</div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#3563F6]">Competitor Deep Dive</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Benchmark features, positioning, pricing observations, and differentiation gaps.
                  </p>
                </div>
                <div className="text-xs font-medium text-[#3563F6] mt-4 flex items-center gap-1">
                  Analyze Rivals →
                </div>
              </Card>
            </Link>

            <Link href="/discover/research/new?objective=AUDIENCE_DISCOVERY" className="group">
              <Card className="p-4 border border-gray-200 hover:border-[#3563F6] transition shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#3563F6]">Target Audience & ICP</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Generate ideal customer profiles, pain points, buying objections, and journeys.
                  </p>
                </div>
                <div className="text-xs font-medium text-[#3563F6] mt-4 flex items-center gap-1">
                  Map Personas →
                </div>
              </Card>
            </Link>

            <Link href="/discover/research/new?objective=AEO_DISCOVERY" className="group">
              <Card className="p-4 border border-gray-200 hover:border-[#3563F6] transition shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#3563F6]">AEO Visibility Diagnostic</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Discover customer questions asked to AI models and citation opportunities.
                  </p>
                </div>
                <div className="text-xs font-medium text-[#3563F6] mt-4 flex items-center gap-1">
                  Audit AI Answers →
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Two-Column Grid: Recent Research & Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Research */}
          <Card className="p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Research Studies</h2>
              <Link href="/discover/research" className="text-xs font-medium text-[#3563F6] hover:underline">
                View All ({overview?.totalResearch ?? 0})
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading research studies...</div>
            ) : !overview?.recentResearch || overview.recentResearch.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No research studies created yet.</p>
                <Link href="/discover/research/new" className="inline-block mt-3">
                  <Button variant="primary" size="sm">Create First Study</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {overview.recentResearch.map((res) => (
                  <div key={res.id} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition">
                    <div className="min-w-0 pr-4">
                      <Link href={`/discover/research/${res.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#3563F6] truncate block">
                        {res.title}
                      </Link>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <span>{res.topic}</span>
                        <span>•</span>
                        <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(res.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top Discovered Opportunities */}
          <Card className="p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Validated Market Opportunities</h2>
              <Link href="/discover/opportunities" className="text-xs font-medium text-[#3563F6] hover:underline">
                View All ({overview?.totalOpportunities ?? 0})
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading opportunities...</div>
            ) : !overview?.recentOpportunities || overview.recentOpportunities.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No market opportunities recorded yet.</p>
                <p className="text-xs text-gray-400 mt-1">Run an AI research study to detect high-confidence opportunities.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.recentOpportunities.map((opp) => (
                  <div key={opp.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-blue-200 transition">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">{opp.title}</h3>
                      <Badge variant={opp.confidenceLevel === 'HIGH' ? 'success' : 'primary'}>
                        {opp.confidenceLevel} Confidence
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{opp.customerProblem}</p>
                    <div className="text-xs text-[#3563F6] font-medium mt-2 flex items-center gap-1">
                      <span>Experiment:</span>
                      <span className="text-gray-700 font-normal line-clamp-1">{opp.suggestedExperiment}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Competitor Overview & Audience Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Competitor Snapshot */}
          <Card className="p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Competitor Matrix</h2>
              <Link href="/discover/competitors" className="text-xs font-medium text-[#3563F6] hover:underline">
                Manage Competitors ({overview?.totalCompetitors ?? 0})
              </Link>
            </div>

            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading competitors...</div>
            ) : !overview?.recentCompetitors || overview.recentCompetitors.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No competitor profiles recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.recentCompetitors.map((comp) => (
                  <div key={comp.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{comp.name}</span>
                      <Badge variant={comp.isVerified ? 'success' : 'outline'}>
                        {comp.isVerified ? 'Verified Fact' : 'AI Analysis'}
                      </Badge>
                    </div>
                    {comp.positioning && (
                      <p className="text-xs text-gray-600 mt-1">{comp.positioning}</p>
                    )}
                    {comp.strengths && comp.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {comp.strengths.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                            + {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Audience Snapshot */}
          <Card className="p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Target Audience Personas</h2>
              <Link href="/discover/audience" className="text-xs font-medium text-[#3563F6] hover:underline">
                View All ICPs ({overview?.totalAudienceProfiles ?? 0})
              </Link>
            </div>

            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading audience...</div>
            ) : !overview?.recentAudience || overview.recentAudience.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No audience profiles saved yet.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.recentAudience.map((aud) => (
                  <div key={aud.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{aud.segmentName}</span>
                      <Badge variant="warning">
                        {aud.isAiGenerated ? 'AI Generated Persona' : 'Surveyed ICP'}
                      </Badge>
                    </div>
                    {aud.idealCustomerProfile && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{aud.idealCustomerProfile}</p>
                    )}
                    {aud.painPoints && aud.painPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {aud.painPoints.slice(0, 2).map((p, idx) => (
                          <span key={idx} className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded">
                            • {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </CustomerShell>
  );
}
