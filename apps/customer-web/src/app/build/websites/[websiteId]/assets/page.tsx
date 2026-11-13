'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../../components/layout/customer-shell';
import { Card, Button } from '@aeo-nexus/ui';

export default function WebsiteAssetsPage() {
  const params = useParams();
  const websiteId = params.websiteId as string;

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/assets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAssets(data);
      })
      .catch((err) => console.error('Failed to load assets:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <CustomerShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/build/websites/${websiteId}`} className="text-xs font-semibold text-blue-600 hover:underline">
                ← Website Hub
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assets & Media Library</h1>
            <p className="text-sm text-slate-600 mt-1">
              Integrate images, logos, and illustrations directly into your website sections.
            </p>
          </div>
          <Link href="/assets">
            <Button variant="outline">Manage Workspace Assets →</Button>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading assets...</div>
        ) : assets.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <span className="text-4xl block">🖼️</span>
            <p className="font-bold text-slate-700">No media assets in workspace yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload brand logos, hero images, and graphics in the workspace Assets manager to use them across your website.
            </p>
            <Link href="/assets">
              <Button variant="primary">Upload Asset</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="p-3 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="aspect-video rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden mb-2">
                  {asset.thumbnailUrl || asset.url ? (
                    <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-slate-400">📁</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 truncate">{asset.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{asset.mimeType || 'Image asset'}</p>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(asset.url || `/assets/${asset.id}`)}
                    className="text-[10px] font-semibold text-blue-600 hover:underline"
                  >
                    {copiedUrl === (asset.url || `/assets/${asset.id}`) ? '✓ Copied' : 'Copy URL'}
                  </button>
                  <Link href={`/build/websites/${websiteId}/editor`} className="text-[10px] text-slate-500 hover:text-slate-800">
                    Use in Editor →
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

