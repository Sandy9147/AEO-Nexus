'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { BuildOverviewDto } from '@aeo-nexus/contracts';

export default function BuildDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<BuildOverviewDto | null>(null);
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
    fetch(`${apiUrl}/workspaces/${wsId}/build/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOverview(data);
      })
      .catch((err) => console.error('Failed to load Build overview:', err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">Published</Badge>;
      case 'READY':
        return <Badge variant="primary">Ready to Publish</Badge>;
      case 'GENERATING':
        return <Badge variant="primary">AI Generating...</Badge>;
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const templates = [
    {
      title: 'B2B SaaS Landing Page',
      desc: 'Optimized for conversational AI citations, feature breakdowns, and self-serve trial conversion.',
      badge: 'Popular',
      type: 'SAAS_LANDING',
    },
    {
      title: 'Agency & Professional Services',
      desc: 'Comprehensive multi-page structure showcasing services, verified case studies, and inquiries.',
      badge: 'High Conversion',
      type: 'AGENCY_PORTFOLIO',
    },
    {
      title: 'Local Business & Consultation',
      desc: 'Clear value proposition, transparent service pricing, FAQ section, and direct contact booking.',
      badge: 'Turnkey',
      type: 'BUSINESS_WEBSITE',
    },
  ];

  return (
    <CustomerShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Website & Landing Page Builder</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                Phase 6C Active
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Transform Discover research and approved strategic plans into high-converting digital landing pages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/build/websites">
              <Button variant="outline">Browse All Websites</Button>
            </Link>
            <Link href="/build/websites/new">
              <Button variant="primary">✨ Create / Generate Website</Button>
            </Link>
          </div>
        </div>

        {/* Lifecycle Journey Progress Banner */}
        <div className="p-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">Unified Lifecycle Journey</div>
              <div className="text-sm font-semibold text-slate-800">
                Discover (Insights) → Plan (Roadmaps) → <span className="text-blue-600 font-bold">Build (Websites)</span> → Publish (Subdomains)
              </div>
            </div>
          </div>
          <Link href="/build/websites/new">
            <Button size="sm" variant="primary">Launch Builder Wizard →</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Websites</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  {loading ? '...' : overview?.totalWebsites ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                🌐
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Live & Published</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                  {loading ? '...' : overview?.publishedWebsites ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                ✅
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drafts & In Progress</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-2">
                  {loading ? '...' : overview?.draftWebsites ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                📝
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Launch Templates */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Start with a Proven Blueprint</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {templates.map((tpl, i) => (
              <Card key={i} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {tpl.badge}
                    </span>
                    <span className="text-lg">✨</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{tpl.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">{tpl.desc}</p>
                </div>
                <Link href={`/build/websites/new?type=${tpl.type}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Use This Template →
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Websites List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Your Websites</h2>
            <Link href="/build/websites" className="text-xs font-semibold text-blue-600 hover:underline">
              View All ({overview?.websites?.length || 0}) →
            </Link>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading websites...</div>
            ) : !overview?.websites || overview.websites.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <span className="text-4xl block">🛠️</span>
                <p className="text-slate-700 font-semibold">No websites created yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create your first website or let AI generate a full multi-page site from your workspace profile.
                </p>
                <Link href="/build/websites/new">
                  <Button variant="primary">Create Website Now</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {overview.websites.map((site) => (
                  <div key={site.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Link href={`/build/websites/${site.id}`} className="font-bold text-slate-900 hover:text-blue-600">
                          {site.name}
                        </Link>
                        {getStatusBadge(site.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>📄 {site.pagesCount ?? 1} pages</span>
                        <span>v{site.currentVersionNumber}.0</span>
                        {site.isPublished && site.publishedSubdomain && (
                          <span className="text-emerald-700 font-medium">
                            🌐 https://{site.publishedSubdomain}.sites.aeonexus.com
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/build/websites/${site.id}/editor`}>
                        <Button size="sm" variant="primary">Open Editor</Button>
                      </Link>
                      <Link href={`/build/websites/${site.id}`}>
                        <Button size="sm" variant="outline">Overview</Button>
                      </Link>
                    </div>
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
