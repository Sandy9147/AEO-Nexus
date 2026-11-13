'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { WebsiteDetailDto } from '@aeo-nexus/contracts';

export default function WebsitePagesManagerPage() {
  const params = useParams();
  const websiteId = params.websiteId as string;

  const [website, setWebsite] = useState<WebsiteDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newSeoTitle, setNewSeoTitle] = useState('');
  const [newSeoDesc, setNewSeoDesc] = useState('');
  const [isHome, setIsHome] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWebsite = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
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
      .catch((err) => console.error('Failed to load website pages:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWebsite();
  }, [websiteId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) return;

    setError(null);
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim(),
          seoTitle: newSeoTitle.trim() || undefined,
          seoDescription: newSeoDesc.trim() || undefined,
          isHome,
          pageOrder: (website?.pages?.length || 0),
          sections: [
            {
              id: `sec_hero_${Date.now()}`,
              type: 'HERO',
              order: 0,
              content: {
                headline: newTitle.trim(),
                subheadline: `Welcome to the ${newTitle.trim()} page.`,
              },
            },
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create page');
      }

      setIsAddOpen(false);
      setNewTitle('');
      setNewSlug('');
      setNewSeoTitle('');
      setNewSeoDesc('');
      setIsHome(false);
      fetchWebsite();
    } catch (err: any) {
      setError(err.message || 'Error creating page');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/pages/${pageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchWebsite();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to delete page');
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/build/websites/${websiteId}`} className="text-xs font-semibold text-blue-600 hover:underline">
                ← {website?.name || 'Website Hub'}
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pages Manager</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage website navigation routes, page orders, and search engine metadata.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsAddOpen(true)}>
            + Add New Page
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading pages...</div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-slate-100">
              {website?.pages && website.pages.length > 0 ? (
                website.pages.map((p, idx) => (
                  <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                        <span className="font-bold text-slate-900 text-sm">{p.title}</span>
                        {p.isHome && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            HOME
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {p.slug}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        SEO: <span className="text-slate-700">{p.seoTitle || p.title}</span> • {p.sections?.length || 0} sections
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/build/websites/${websiteId}/editor?pageId=${p.id}`}>
                        <Button size="sm" variant="primary">Visual Editor</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeletePage(p.id)}
                        disabled={website.pages.length <= 1}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">No pages found</div>
              )}
            </div>
          </Card>
        )}

        {/* Add Page Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="font-bold text-base text-slate-900 mb-1">Create Website Page</h3>
              <p className="text-xs text-slate-500 mb-4">Add a new route with initial responsive sections.</p>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreatePage} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Page Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Services"
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      if (!newSlug) {
                        setNewSlug(`/${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Page Slug (URL) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. /services"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Comprehensive B2B Services | Acme"
                    value={newSeoTitle}
                    onChange={(e) => setNewSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">SEO Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description for search engines and answer engines..."
                    value={newSeoDesc}
                    onChange={(e) => setNewSeoDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isHome"
                    checked={isHome}
                    onChange={(e) => setIsHome(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isHome" className="text-slate-700 font-medium">Set as Home Page (/)</label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Create Page
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

