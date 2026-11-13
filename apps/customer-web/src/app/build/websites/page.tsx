'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { WebsiteProjectDto } from '@aeo-nexus/contracts';

export default function WebsitesListPage() {
  const [websites, setWebsites] = useState<WebsiteProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
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
    fetch(`${apiUrl}/workspaces/${wsId}/build/websites?status=${filter}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setWebsites(data))
      .catch((err) => console.error('Failed to fetch websites:', err))
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = websites.filter((site) =>
    site.name.toLowerCase().includes(search.toLowerCase()) ||
    (site.description && site.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <CustomerShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Websites Directory</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage your landing pages, microsites, and multi-page business websites.
            </p>
          </div>
          <Link href="/build/websites/new">
            <Button variant="primary">✨ Create / Generate Website</Button>
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            {['ALL', 'PUBLISHED', 'READY', 'DRAFT'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search websites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Websites Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading websites...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <span className="text-3xl block">🔍</span>
            <p className="font-semibold text-slate-700">No websites found</p>
            <p className="text-xs text-slate-500">Try adjusting your filter or search query.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((site) => (
              <Card key={site.id} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {site.websiteType}
                    </span>
                    <Badge variant={site.isPublished ? 'success' : 'outline'}>
                      {site.isPublished ? 'PUBLISHED' : site.status}
                    </Badge>
                  </div>
                  <Link href={`/build/websites/${site.id}`} className="text-lg font-bold text-slate-900 hover:text-blue-600">
                    {site.name}
                  </Link>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 mb-4">
                    {site.description || 'No description provided.'}
                  </p>
                  <div className="text-xs text-slate-600 space-y-1 mb-6">
                    <div>📄 Pages: <span className="font-semibold">{site.pagesCount ?? 1}</span></div>
                    <div>🏷️ Version: <span className="font-semibold">v{site.currentVersionNumber}.0</span></div>
                    {site.isPublished && site.publishedSubdomain && (
                      <div className="text-emerald-700 font-semibold truncate">
                        🌐 {site.publishedSubdomain}.sites.aeonexus.com
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Link href={`/build/websites/${site.id}/editor`} className="flex-1">
                    <Button size="sm" variant="primary" className="w-full">Editor</Button>
                  </Link>
                  <Link href={`/build/websites/${site.id}`}>
                    <Button size="sm" variant="outline">Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

