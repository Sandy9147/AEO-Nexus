'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { WebsiteDetailDto, RESERVED_SUBDOMAINS } from '@aeo-nexus/contracts';

export default function WebsiteSettingsPage() {
  const params = useParams();
  const websiteId = params.websiteId as string;
  const router = useRouter();

  const [website, setWebsite] = useState<WebsiteDetailDto | null>(null);
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchWebsite = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token || !websiteId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WebsiteDetailDto | null) => {
        if (data) {
          setWebsite(data);
          setSubdomain(data.publishedSubdomain || data.slug || '');
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWebsite();
  }, [websiteId]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubdomain = subdomain.trim().toLowerCase();

    if (RESERVED_SUBDOMAINS.includes(cleanSubdomain)) {
      setMessage({ text: `Subdomain "${cleanSubdomain}" is reserved by the platform.`, type: 'error' });
      return;
    }

    const regex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
    if (!regex.test(cleanSubdomain)) {
      setMessage({
        text: 'Subdomain must be 3-63 characters, contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.',
        type: 'error',
      });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subdomain: cleanSubdomain }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to publish website');
      }

      setMessage({ text: `Website successfully published to https://${cleanSubdomain}.sites.aeonexus.com`, type: 'success' });
      fetchWebsite();
    } catch (err: any) {
      setMessage({ text: err.message || 'Publishing error', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Are you sure you want to unpublish this website? It will no longer be accessible on the public subdomain.')) return;

    setActionLoading(true);
    setMessage(null);

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to unpublish website');
      }

      setMessage({ text: 'Website has been unpublished.', type: 'success' });
      fetchWebsite();
    } catch (err: any) {
      setMessage({ text: err.message || 'Unpublish error', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Are you sure you want to restore Version ${versionNumber}? This will revert current drafts to this snapshot.`)) return;

    setActionLoading(true);
    setMessage(null);

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to restore version');
      }

      setMessage({ text: `Version ${versionNumber} restored successfully!`, type: 'success' });
      fetchWebsite();
    } catch (err: any) {
      setMessage({ text: err.message || 'Restore error', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!confirm('Are you sure you want to permanently delete this website? This action cannot be undone.')) return;

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        router.push('/build/websites');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to delete website');
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/build/websites/${websiteId}`} className="text-xs font-semibold text-blue-600 hover:underline">
              ← {website?.name || 'Website Hub'}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Publishing</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your hosted platform subdomain, publication versions, and lifecycle status.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold border ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            {/* Subdomain Publishing Card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    AEO Nexus Hosted Subdomain
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deploy your website directly to an enterprise edge-cached platform subdomain.
                  </p>
                </div>
                <Badge variant={website?.isPublished ? 'success' : 'outline'}>
                  {website?.isPublished ? 'LIVE' : 'UNPUBLISHED'}
                </Badge>
              </div>

              <form onSubmit={handlePublish} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Choose Your Platform Subdomain
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="acme-cloud"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 font-mono w-48 sm:w-64"
                    />
                    <span className="px-3 py-2 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-xs text-slate-500 font-mono">
                      .sites.aeonexus.com
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Lowercase alphanumeric characters and hyphens only (3-63 characters).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="submit" variant="primary" disabled={actionLoading}>
                    {actionLoading ? 'Publishing...' : website?.isPublished ? 'Update Publication' : '🚀 Publish Website'}
                  </Button>
                  {website?.isPublished && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-amber-700 hover:bg-amber-50"
                      onClick={handleUnpublish}
                      disabled={actionLoading}
                    >
                      Unpublish
                    </Button>
                  )}
                  {website?.isPublished && website.publishedSubdomain && (
                    <a
                      href={`https://${website.publishedSubdomain}.sites.aeonexus.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Visit Live Site ↗
                    </a>
                  )}
                </div>
              </form>
            </Card>

            {/* Custom Domain Roadmap Callout */}
            <Card className="p-6 bg-slate-50/70 border-dashed">
              <div className="flex items-start gap-3">
                <span className="text-xl">🌐</span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Custom Domain Connection (Roadmap)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Custom domain DNS mapping (e.g., <code className="font-mono">www.yourcompany.com</code>) with automated TLS certificates is scheduled for Enterprise rollout. Hosted subdomains on <code className="font-mono">.sites.aeonexus.com</code> are live and fully active.
                  </p>
                </div>
              </div>
            </Card>

            {/* Version Snapshots & Rollback */}
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Version Snapshots & History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every publish and manual save creates an immutable version snapshot. Restore any prior version instantly.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {website?.versions && website.versions.length > 0 ? (
                  website.versions.map((v) => (
                    <div key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">v{v.versionNumber}.0 — {v.title}</span>
                          {website.currentVersionNumber === v.versionNumber && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {v.changeSummary || 'Version snapshot'} • {new Date(v.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        {website.currentVersionNumber !== v.versionNumber && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreVersion(v.id, v.versionNumber)}
                            disabled={actionLoading}
                          >
                            Restore This Version
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4">No previous version snapshots available.</p>
                )}
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-red-200 bg-red-50/20 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-700">Danger Zone</h2>
              <p className="text-xs text-slate-600">
                Permanently delete this website project, pages, and all associated snapshots.
              </p>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleDeleteWebsite}
                >
                  Delete Website Project
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

