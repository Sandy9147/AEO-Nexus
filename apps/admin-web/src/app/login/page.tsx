'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardContent, CardFooter, Badge } from '@aeo-nexus/ui';

export default function AdminLoginPage() {
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
        throw new Error(json?.error?.message || json?.message || 'Invalid admin credentials');
      }

      const platformRole = json.data?.user?.platformRole;
      if (
        !platformRole ||
        (platformRole !== 'PLATFORM_ADMIN' &&
          platformRole !== 'PLATFORM_SUPER_ADMIN' &&
          platformRole !== 'SUPPORT_AGENT' &&
          platformRole !== 'BILLING_OPERATOR')
      ) {
        throw new Error(
          'Access Denied: Your account does not possess Platform Administrative privileges.',
        );
      }

      if (json.data?.tokens?.accessToken) {
        sessionStorage.setItem('accessToken', json.data.tokens.accessToken);
        sessionStorage.setItem('user', JSON.stringify(json.data.user));
      }

      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Platform login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 text-blue-400 border border-slate-700 font-mono font-bold text-xl mb-3 shadow-lg">
            ⚡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Administration</h1>
          <p className="text-sm text-slate-400 mt-1">AEO Nexus Internal Operations</p>
        </div>

        <Card className="border border-slate-800 bg-slate-850 shadow-xl bg-slate-800/90 text-white">
          <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <h2 className="text-lg font-semibold text-white">Staff Login</h2>
              <p className="text-xs text-slate-400">Strict platform authorization required</p>
            </div>
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Platform Ops</Badge>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-red-950/80 border border-red-800 text-red-300 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
                  Operator Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@aeonexus.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                {loading ? 'Authenticating...' : 'Authorize Platform Console'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

