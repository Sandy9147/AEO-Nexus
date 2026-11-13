'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { AssetDto, AssetFolderDto, StorageConfigStatusDto } from '@aeo-nexus/contracts';
import { getApiClient } from '../../lib/api';

export default function AssetsPage() {
  const [folders, setFolders] = useState<AssetFolderDto[]>([]);
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageConfigStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New Folder Modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Upload Asset Metadata Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [savingAsset, setSavingAsset] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const [status, folderList, assetList] = await Promise.all([
        client.getStorageStatus(workspaceId),
        client.getFolders(workspaceId),
        client.getAssets(workspaceId, { search: searchQuery.trim() || undefined }),
      ]);

      setStorageStatus(status);
      setFolders(folderList);
      setAssets(assetList);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      setCreatingFolder(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const folder = await client.createFolder(workspaceId, {
        name: folderName.trim(),
      });

      setFolders((prev) => [...prev, folder]);
      setShowNewFolderModal(false);
      setFolderName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    if (!storageStatus?.isConfigured) {
      alert('Object storage (S3/Cloudflare R2) is not configured in this environment. File uploads are disabled until S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are provided.');
      return;
    }

    try {
      setSavingAsset(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const presigned = await client.requestPresignedUpload(workspaceId, {
        filename: assetName.trim(),
        contentType: 'application/octet-stream',
        sizeBytes: 1024,
        folderId: selectedFolderId || null,
      });

      const asset = await client.createAssetMetadata(workspaceId, {
        name: assetName.trim(),
        storageKey: presigned.key,
        url: presigned.downloadUrl,
        mimeType: 'application/octet-stream',
        sizeBytes: 1024,
        folderId: selectedFolderId || null,
      });

      setAssets((prev) => [asset, ...prev]);
      setShowUploadModal(false);
      setAssetName('');
    } catch (err: any) {
      alert(err.message || 'Failed to upload asset');
    } finally {
      setSavingAsset(false);
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
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Assets & Knowledge
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Centralized storage for brand assets, media collateral, and company knowledge base.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowNewFolderModal(true)}
            >
              + New Folder
            </Button>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium"
            >
              Upload Asset
            </Button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 text-sm font-semibold">
          <Link
            href="/assets"
            className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
          >
            Explorer
          </Link>
          <Link
            href="/assets/files"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
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

        {/* Storage Configuration Status Banner */}
        {storageStatus && !storageStatus.isConfigured && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-xs text-amber-900">
              <span className="font-bold">Object Storage Not Configured: </span>
              {storageStatus.warning || 'S3/R2 storage credentials are not set in environment variables. File binary uploads are disabled until S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are configured.'}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Folders Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Folders</h2>
            <Link href="/assets/folders" className="text-xs font-semibold text-[#3563F6] hover:underline">
              View all folders →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : folders.length === 0 ? (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl text-center text-xs text-gray-400 italic">
              No folders created yet. Click "+ New Folder" to organize your assets.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {folders.map((f) => (
                <Link
                  key={f.id}
                  href={`/assets/files?folderId=${f.id}`}
                  className="p-4 bg-white border border-gray-200/80 hover:border-blue-400 hover:shadow-xs rounded-2xl flex items-center gap-3 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate group-hover:text-[#3563F6]">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-gray-400">{f.assetsCount} items</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assets Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Recent Assets</h2>
            <Link href="/assets/files" className="text-xs font-semibold text-[#3563F6] hover:underline">
              View all files →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="p-8 bg-white border border-gray-100 rounded-2xl text-center text-xs text-gray-400 italic">
              No assets uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.slice(0, 9).map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="p-4 bg-white border border-gray-200/80 hover:border-blue-400 hover:shadow-xs rounded-2xl transition-all flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3563F6] flex items-center justify-center text-lg font-bold">
                    📄
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-[#3563F6]">
                      {asset.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatBytes(asset.sizeBytes)} • {asset.folder?.name || 'Root'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Uploaded {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Modal: New Folder */}
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Create Folder</h3>
              <form onSubmit={handleCreateFolder} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Folder name (e.g. Logos, Brand Guides)"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewFolderModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingFolder}
                    className="bg-[#3563F6] text-white"
                  >
                    {creatingFolder ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Upload Asset */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Upload New Asset</h3>

              {!storageStatus?.isConfigured && (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs">
                  ⚠️ Direct file uploads are disabled because object storage (S3/R2) is not configured on this server.
                </div>
              )}

              <form onSubmit={handleCreateAsset} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hero-Banner-2026.png"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Folder
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  >
                    <option value="">Root (No folder)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingAsset || !storageStatus?.isConfigured}
                    className="bg-[#3563F6] text-white"
                  >
                    {savingAsset ? 'Saving...' : 'Upload'}
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
