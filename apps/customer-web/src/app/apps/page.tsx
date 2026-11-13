'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input } from '@aeo-nexus/ui';
import { AppCatalogItemDto, AppCategory } from '@aeo-nexus/contracts';

const CATEGORIES: AppCategory[] = [
  'All',
  'Marketing',
  'Operations',
  'AI & Automation',
  'Content',
  'Analytics',
  'Commerce',
];

export default function AppsCatalogPage() {
  const [apps, setApps] = useState<AppCatalogItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToolModal, setActiveToolModal] = useState<AppCatalogItemDto | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (selectedCategory !== 'All') params.set('category', selectedCategory);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`${API_BASE}/apps/catalog?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || json.success === false) {
          throw new Error(json.error?.message || 'Failed to fetch application catalog');
        }

        setApps(json.data);
      } catch (err: any) {
        setError(err.message || 'Unable to connect to tools catalog');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchCatalog, 150);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, API_BASE]);

  return (
    <CustomerShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nexus Suite
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-emerald-600">Central Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Apps & Tools Catalog
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Explore the centralized suite of operational modules, brand systems, and roadmap AI capabilities. Functional tools can be launched directly into your active workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="text-xs">
                ← Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#3563F6] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <Input
              type="text"
              placeholder="Search tools, features, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-white"
            />
          </div>
        </div>

        {loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin text-2xl text-[#3563F6] mb-3">⟳</div>
            <p className="text-sm font-medium text-slate-600">Loading catalog applications...</p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <div className="font-semibold mb-1">Catalog Service Error</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && apps.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="text-base font-semibold text-slate-800">No applications found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              We couldn&apos;t find any tools matching &quot;{searchQuery}&quot; in the &apos;{selectedCategory}&apos; category.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Catalog Grid */}
        {!loading && !error && apps.length > 0 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <Card
                  key={app.id}
                  className="border-slate-200 bg-white shadow-sm flex flex-col justify-between hover:border-[#3563F6]/50 transition duration-150"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-[#EAF0FF] text-[#3563F6] font-bold text-sm flex items-center justify-center shrink-0">
                          {app.icon === 'Building2' && '🏢'}
                          {app.icon === 'Palette' && '🎨'}
                          {app.icon === 'Users' && '👥'}
                          {app.icon === 'ShieldCheck' && '🛡️'}
                          {app.icon === 'Bot' && '🤖'}
                          {app.icon === 'Sparkles' && '✨'}
                          {app.icon === 'PenTool' && '✍️'}
                          {app.icon === 'Zap' && '⚡'}
                          {app.icon === 'BarChart3' && '📊'}
                          {app.icon === 'Briefcase' && '💼'}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                            {app.name}
                          </CardTitle>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            {app.category}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={app.status === 'functional' ? 'success' : 'outline'}
                        className="text-[10px] shrink-0"
                      >
                        {app.status === 'functional' ? 'Active' : 'Coming Soon'}
                      </Badge>
                    </div>

                    <CardDescription className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {app.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {app.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="text-[#3563F6] font-bold text-xs">✓</span>
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveToolModal(app)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                      >
                        Details
                      </button>

                      {app.status === 'functional' && app.launchUrl ? (
                        <Link href={app.launchUrl}>
                          <Button size="sm" variant="primary" className="text-xs h-8">
                            Launch Tool →
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/apps/${app.slug}`}>
                          <Button size="sm" variant="outline" className="text-xs h-8 text-slate-500">
                            Roadmap View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tool Details Modal */}
        {activeToolModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {activeToolModal.category}
                  </span>
                  <Badge variant={activeToolModal.status === 'functional' ? 'success' : 'outline'}>
                    {activeToolModal.status === 'functional' ? 'Functional Tool' : 'Roadmap Feature'}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveToolModal(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">{activeToolModal.name}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {activeToolModal.longDescription}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Key Capabilities
                </h4>
                <div className="space-y-1.5">
                  {activeToolModal.features.map((ft, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="text-[#3563F6] font-bold">✓</span>
                      <span>{ft}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setActiveToolModal(null)}>
                  Close
                </Button>
                {activeToolModal.status === 'functional' && activeToolModal.launchUrl ? (
                  <Link href={activeToolModal.launchUrl}>
                    <Button variant="primary" size="sm">
                      Launch In Workspace
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/apps/${activeToolModal.slug}`}>
                    <Button variant="outline" size="sm">
                      View Architecture Spec
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

