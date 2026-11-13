'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@aeo-nexus/ui';
import { AssetFolderDto } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../lib/api';

export default function AssetsFoldersPage() {
  const [folders, setFolders] = useState<AssetFolderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Folder Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const list = await client.getFolders(workspaceId);
      setFolders(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const created = await client.createFolder(workspaceId, { name: name.trim() });
      setFolders((prev) => [...prev, created]);
      setShowModal(false);
      setName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.deleteFolder(workspaceId, folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete folder');
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Folders
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Organize your workspace files and media assets by department or campaign.
            </p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium"
          >
            + New Folder
          </Button>
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
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Files
          </Link>
          <Link
            href="/assets/folders"
            className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
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

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Folders Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="p-12 bg-white border border-gray-100 rounded-2xl text-center text-xs text-gray-400 italic">
            No folders created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {folders.map((f) => (
              <Card key={f.id} className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/assets/files?folderId=${f.id}`} className="flex items-center gap-2.5 min-w-0 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#3563F6] truncate">
                        {f.name}
                      </h4>
                      <p className="text-[11px] text-gray-400">{f.assetsCount} files</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="text-gray-400 hover:text-red-600 text-xs font-bold p-1"
                    title="Delete folder"
                  >
                    ✕
                  </button>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Created {new Date(f.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={`/assets/files?folderId=${f.id}`}
                    className="text-[#3563F6] font-semibold hover:underline"
                  >
                    Open files →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: New Folder */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Create Folder</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Folder name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-[#3563F6] text-white"
                  >
                    {submitting ? 'Creating...' : 'Create Folder'}
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
