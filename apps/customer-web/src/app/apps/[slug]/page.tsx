'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { AppCatalogItemDto } from '@aeo-nexus/contracts';

export default function AppSlugPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [app, setApp] = useState<AppCatalogItemDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!slug) return;

    const fetchApp = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/apps/catalog/${slug}`);
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error?.message || 'Tool not found in catalog');
        }
        setApp(json.data);
      } catch (err: any) {
        setError(err.message || 'Unable to load tool specifications');
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [slug, API_BASE]);

  return (
    <CustomerShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <Link href="/apps">
            <Button variant="outline" size="sm" className="text-xs">
              ← Back to All Apps
            </Button>
          </Link>
          {app?.status && (
            <Badge variant={app.status === 'functional' ? 'success' : 'outline'}>
              {app.status === 'functional' ? 'Active In Workspace' : 'Roadmap Architecture'}
            </Badge>
          )}
        </div>

        {loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin text-2xl text-[#3563F6] mb-3">⟳</div>
            <p className="text-sm font-medium text-slate-600">Loading module architecture...</p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <div className="font-semibold mb-1">Application Not Found</div>
            <p>{error}</p>
            <Link href="/apps">
              <Button size="sm" variant="outline" className="mt-3 bg-white text-xs">
                Browse Active Catalog
              </Button>
            </Link>
          </div>
        )}

        {!loading && !error && app && (
          <Card className="border-slate-200 bg-white shadow-sm space-y-6">
            <CardHeader className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#EAF0FF] text-[#3563F6] text-xl flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {app.category}
                  </span>
                  <CardTitle className="text-2xl font-bold text-slate-900 mt-0.5">
                    {app.name}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm text-slate-600 leading-relaxed pt-2">
                {app.longDescription}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Core Architecture & Capabilities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {app.features.map((feat, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-slate-100 bg-[#F7F9FC] flex items-start gap-2.5 text-xs text-slate-800 font-medium"
                    >
                      <span className="text-[#3563F6] font-bold text-sm">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">slug: {app.slug}</span>
                {app.status === 'functional' && app.launchUrl ? (
                  <Link href={app.launchUrl}>
                    <Button variant="primary">
                      Launch In Active Workspace →
                    </Button>
                  </Link>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                    Scheduled for delivery in upcoming phase
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerShell>
  );
}

