'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@aeo-nexus/ui';
import { AssetDto } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../lib/api';

function FilesListContent() {
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get('folderId') || undefined;

  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const list = await client.getAssets(workspaceId, {
        folderId: folderIdParam,
        search: search.trim() || undefined,
      });
      setAssets(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [folderIdParam]);

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.deleteAsset(workspaceId, assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete asset');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter files by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-xl w-64 focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
          />
          <Button size="sm" variant="outline" onClick={loadAssets}>
            Filter
          </Button>
        </div>
        {folderIdParam && (
          <Link href="/assets/files" className="text-xs text-[#3563F6] hover:underline font-semibold">
            Clear folder filter
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Files Table */}
      <Card className="border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading files...</div>
          ) : assets.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 italic">
              No files found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Folder</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <Link href={`/assets/${a.id}`} className="hover:text-[#3563F6] flex items-center gap-2">
                          <span>📄</span>
                          <span className="truncate max-w-xs">{a.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {a.folder ? a.folder.name : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono">
                        {formatBytes(a.sizeBytes)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {a.uploadedBy.firstName} {a.uploadedBy.lastName}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3563F6] hover:underline font-semibold"
                        >
                          Open
                        </a>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-red-600 hover:underline font-semibold ml-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AssetsFilesPage() {
  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Files Directory
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse, download, and manage uploaded business assets.
            </p>
          </div>
          <Link href="/assets">
            <Button variant="outline">← Back to Explorer</Button>
          </Link>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 text-sm font-semibold">
          <Link
            href="/assets"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Explorer
          </Link>
          <Link
            href="/assets/files"
            className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
          >
            Files
          </Link>
          <Link
            href="/assets/folders"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Folders
          </Link>
          <Link
            href="/assets/knowledge"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Knowledge Base
          </Link>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading files...</div>}>
          <FilesListContent />
        </Suspense>
      </div>
    </CustomerShell>
  );
}
