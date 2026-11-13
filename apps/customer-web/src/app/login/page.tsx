'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '@aeo-nexus/ui';

export default function LoginPage() {
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
        throw new Error(json?.error?.message || json?.message || 'Invalid email or password');
      }

      // Store access token in memory / sessionStorage
      if (json.data?.tokens?.accessToken) {
        sessionStorage.setItem('accessToken', json.data.tokens.accessToken);
        sessionStorage.setItem('user', JSON.stringify(json.data.user));
      }

      if (json.data?.activeWorkspaces && json.data.activeWorkspaces.length > 0) {
        router.push('/workspaces');
      } else {
        router.push('/onboarding');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3563F6] text-white font-bold text-xl mb-3 shadow-md">
            AN
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to AEO Nexus</h1>
          <p className="text-sm text-slate-500 mt-1">Customer Business Operating System</p>
        </div>

        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Welcome back</h2>
            <p className="text-xs text-slate-500">Enter your credentials to access your workspaces</p>
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
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#3563F6] hover:text-[#284ecc] font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-xs text-slate-500 mt-2">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-[#3563F6] hover:underline font-semibold">
                  Create one now
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

