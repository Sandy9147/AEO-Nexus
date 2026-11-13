'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardContent, Badge } from '@aeo-nexus/ui';
import { WorkspaceSummary } from '@aeo-nexus/contracts';

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('http://localhost:4000/workspaces', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message || 'Failed to load workspaces');
      }

      setWorkspaces(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = (workspace: WorkspaceSummary) => {
    sessionStorage.setItem('activeWorkspaceId', workspace.id);
    sessionStorage.setItem('activeWorkspaceName', workspace.name);
    router.push('/');
  };

  const handleLogout = async () => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch('http://localhost:4000/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Ignore network failure during logout
      }
    }
    sessionStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3563F6] text-white flex items-center justify-center font-bold">
              AN
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Select Workspace</h1>
              <p className="text-xs text-slate-500">Choose the organization context to manage</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
          >
            Sign Out
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#3563F6] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading your organizations...</p>
            </div>
          ) : workspaces.length === 0 ? (
            <Card className="border border-slate-200 bg-white text-center py-8">
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">You don&apos;t have any active workspaces yet.</p>
                <Link href="/onboarding">
                  <Button className="bg-[#3563F6] hover:bg-[#284ecc] text-white text-xs">
                    Create Your First Workspace
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            workspaces.map((ws) => (
              <Card
                key={ws.id}
                className="border border-slate-200/90 bg-white hover:border-[#3563F6] transition cursor-pointer shadow-sm"
                onClick={() => selectWorkspace(ws)}
              >
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{ws.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">slug: {ws.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ws.role === 'WORKSPACE_OWNER' ? 'primary' : 'outline'}>
                      {ws.role.replace('WORKSPACE_', '')}
                    </Badge>
                    <span className="text-slate-400 text-sm">→</span>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {workspaces.length > 0 && (
          <div className="text-center">
            <Link href="/onboarding">
              <Button variant="outline" className="w-full border-dashed text-slate-600 hover:text-slate-900">
                + Create Another Workspace
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

