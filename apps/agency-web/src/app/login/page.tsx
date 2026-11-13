'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardContent, CardFooter, Badge } from '@aeo-nexus/ui';

export default function AgencyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message || json?.message || 'Invalid agency credentials');
      }

      if (json.data?.tokens?.accessToken) {
        sessionStorage.setItem('accessToken', json.data.tokens.accessToken);
        sessionStorage.setItem('user', JSON.stringify(json.data.user));
      }

      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#6554E8] text-white font-bold text-xl mb-3 shadow-md">
            AG
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agency Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-Client Partner Management Plane</p>
        </div>

        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Partner Access</h2>
              <p className="text-xs text-slate-500">Sign in to manage client workspaces and campaigns</p>
            </div>
            <Badge className="bg-[#EEF0FF] text-[#6554E8] border-[#6554E8]/20">Agency</Badge>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email">
                  Agency Partner Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="operator@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-[#6554E8] hover:bg-[#5242d4] text-white">
                {loading ? 'Authenticating...' : 'Sign In as Agency Partner'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

