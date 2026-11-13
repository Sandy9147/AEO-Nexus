'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@aeo-nexus/ui';
import { AssetDto } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../lib/api';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<AssetDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAsset = async () => {
      try {
        setLoading(true);
        const workspaceId = localStorage.getItem('aeo_active_workspace_id');
        if (!workspaceId) return;

        const client = getApiClient();
        const a = await client.getAsset(workspaceId, assetId);
        setAsset(a);
      } catch (err: any) {
        setError(err.message || 'Failed to load asset details');
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      loadAsset();
    }
  }, [assetId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this asset?')) return;
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.deleteAsset(workspaceId, assetId);
      router.push('/assets/files');
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
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link href="/assets" className="text-[#3563F6] hover:underline">
            Assets
          </Link>
          <span>/</span>
          <Link href="/assets/files" className="text-[#3563F6] hover:underline">
            Files
          </Link>
          <span>/</span>
          <span className="text-gray-900">{asset?.name || 'Asset'}</span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        ) : asset ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                  {asset.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Stored securely with presigned S3/R2 direct download access.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#3563F6] hover:bg-blue-700 text-white font-medium text-sm rounded-xl inline-block"
                >
                  Download / View Asset ↗
                </a>
                <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200">
                  Delete
                </Button>
              </div>
            </div>

            <Card className="border border-gray-200/80 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">Asset Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Folder</span>
                  <span className="font-semibold text-gray-900">
                    {asset.folder ? asset.folder.name : 'Root (None)'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">File Size</span>
                  <span className="text-gray-900 font-mono">{formatBytes(asset.sizeBytes)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">MIME Type</span>
                  <span className="text-gray-900 font-mono">{asset.mimeType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Storage Key</span>
                  <span className="text-gray-900 font-mono text-[11px] truncate max-w-md">
                    {asset.storageKey}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Uploaded By</span>
                  <span className="text-gray-900">
                    {asset.uploadedBy.firstName} {asset.uploadedBy.lastName} ({asset.uploadedBy.email})
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 font-medium">Uploaded At</span>
                  <span className="text-gray-900">
                    {new Date(asset.createdAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </CustomerShell>
  );
}
