'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '@aeo-nexus/ui';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate clean slug
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('http://localhost:4000/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, slug }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message || json?.message || 'Failed to create workspace');
      }

      sessionStorage.setItem('activeWorkspaceId', json.data.id);
      sessionStorage.setItem('activeWorkspaceName', json.data.name);

      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3563F6] text-white font-bold text-xl mb-3 shadow-md">
            AN
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Setup your Organization</h1>
          <p className="text-sm text-slate-500 mt-1">Initial workspace onboarding</p>
        </div>

        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Create New Workspace</h2>
            <p className="text-xs text-slate-500">
              Workspaces isolate members, workflows, AI agents, and corporate assets.
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="name">
                  Workspace Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Acme Global Inc."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="slug">
                  Workspace URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-slate-400 bg-slate-50 border border-r-0 border-slate-200 px-3 py-2 rounded-l-md font-mono">
                    aeonexus.com/
                  </span>
                  <Input
                    id="slug"
                    type="text"
                    placeholder="acme-global"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    required
                    className="rounded-l-none font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Lowercase alphanumeric characters and dashes only</p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                {loading ? 'Creating...' : 'Initialize Workspace'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

