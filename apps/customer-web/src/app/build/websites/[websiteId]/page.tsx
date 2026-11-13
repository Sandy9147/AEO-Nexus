'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { WebsiteDetailDto } from '@aeo-nexus/contracts';

export default function WebsiteDetailPage() {
  const params = useParams();
  const websiteId = params.websiteId as string;
  const router = useRouter();

  const [website, setWebsite] = useState<WebsiteDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const fetchWebsite = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token || !websiteId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setWebsite(data);
      })
      .catch((err) => console.error('Failed to load website:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWebsite();
    const interval = setInterval(() => {
      if (website?.status === 'GENERATING') {
        fetchWebsite();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [websiteId, website?.status]);

  if (loading) {
    return (
      <CustomerShell>
        <div className="p-12 text-center text-slate-400">Loading website details...</div>
      </CustomerShell>
    );
  }

  if (!website) {
    return (
      <CustomerShell>
        <Card className="p-12 text-center space-y-4">
          <p className="text-red-600 font-semibold">Website not found</p>
          <Link href="/build/websites">
            <Button variant="outline">Back to Websites</Button>
          </Link>
        </Card>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <div className="space-y-8">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/build/websites" className="text-xs font-semibold text-blue-600 hover:underline">
                ← All Websites
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{website.name}</h1>
              <Badge variant={website.isPublished ? 'success' : website.status === 'READY' ? 'primary' : 'outline'}>
                {website.isPublished ? 'PUBLISHED' : website.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {website.description || 'Modern responsive digital landing page architecture.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/build/websites/${website.id}/preview`}>
              <Button variant="outline">👁️ Live Preview</Button>
            </Link>
            <Link href={`/build/websites/${website.id}/editor`}>
              <Button variant="primary">✏️ Open Visual Editor</Button>
            </Link>
          </div>
        </div>

        {/* Status Callout if Published */}
        {website.isPublished && website.publishedSubdomain && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Live Platform Subdomain</div>
                <a
                  href={`https://${website.publishedSubdomain}.sites.aeonexus.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-emerald-700 hover:underline"
                >
                  https://{website.publishedSubdomain}.sites.aeonexus.com ↗
                </a>
              </div>
            </div>
            <Link href={`/build/websites/${website.id}/settings`}>
              <Button size="sm" variant="outline">Manage Subdomain</Button>
            </Link>
          </div>
        )}

        {/* Management Tabs / Fast Navigation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <Link href={`/build/websites/${website.id}/editor`} className="block">
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer bg-white">
              <span className="text-2xl block mb-2">🎨</span>
              <span className="font-bold text-xs text-slate-800 block">Visual Editor</span>
              <span className="text-[10px] text-slate-500">Edit sections & copy</span>
            </Card>
          </Link>
          <Link href={`/build/websites/${website.id}/pages`} className="block">
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer bg-white">
              <span className="text-2xl block mb-2">📄</span>
              <span className="font-bold text-xs text-slate-800 block">Pages ({website.pages?.length || 0})</span>
              <span className="text-[10px] text-slate-500">Routes & SEO meta</span>
            </Card>
          </Link>
          <Link href={`/build/websites/${website.id}/design`} className="block">
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer bg-white">
              <span className="text-2xl block mb-2">🎭</span>
              <span className="font-bold text-xs text-slate-800 block">Theme & Style</span>
              <span className="text-[10px] text-slate-500">Colors & fonts</span>
            </Card>
          </Link>
          <Link href={`/build/websites/${website.id}/assets`} className="block">
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer bg-white">
              <span className="text-2xl block mb-2">🖼️</span>
              <span className="font-bold text-xs text-slate-800 block">Assets & Media</span>
              <span className="text-[10px] text-slate-500">Images & files</span>
            </Card>
          </Link>
          <Link href={`/build/websites/${website.id}/settings`} className="block">
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer bg-white">
              <span className="text-2xl block mb-2">⚙️</span>
              <span className="font-bold text-xs text-slate-800 block">Settings & Publish</span>
              <span className="text-[10px] text-slate-500">Subdomains & versions</span>
            </Card>
          </Link>
        </div>

        {/* Website Pages Overview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Website Pages</h2>
            <Link href={`/build/websites/${website.id}/pages`} className="text-xs font-semibold text-blue-600 hover:underline">
              Manage All Pages →
            </Link>
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-slate-100">
              {website.pages && website.pages.length > 0 ? (
                website.pages.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{p.title}</span>
                        {p.isHome && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            HOME
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-400">{p.slug}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.sections?.length || 0} visual sections
                      </p>
                    </div>
                    <Link href={`/build/websites/${website.id}/editor?pageId=${p.id}`}>
                      <Button size="sm" variant="outline">Edit Page</Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">No pages found</div>
              )}
            </div>
          </Card>
        </div>

        {/* Publication & Version History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-sm text-slate-900 mb-4">Version Snapshots ({website.versions?.length || 0})</h3>
            <div className="space-y-3">
              {website.versions && website.versions.length > 0 ? (
                website.versions.slice(0, 5).map((v) => (
                  <div key={v.id} className="p-3 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">v{v.versionNumber}.0 — {v.title}</div>
                      <div className="text-slate-500 text-[10px]">{v.changeSummary || 'Snapshot'}</div>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No previous version snapshots saved.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-sm text-slate-900 mb-4">Theme Configuration</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Primary Color:</span>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: website.theme?.primaryColor }} />
                  <span className="font-mono font-semibold">{website.theme?.primaryColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Secondary Color:</span>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: website.theme?.secondaryColor }} />
                  <span className="font-mono font-semibold">{website.theme?.secondaryColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Typography:</span>
                <span className="font-semibold">{website.theme?.headingFont || 'Inter'} / {website.theme?.bodyFont || 'Inter'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Button Style:</span>
                <span className="font-semibold">{website.theme?.buttonStyle || 'ROUNDED'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </CustomerShell>
  );
}
