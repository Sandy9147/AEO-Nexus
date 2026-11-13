'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardContent, CardFooter, Badge } from '@aeo-nexus/ui';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
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
        throw new Error(json?.error?.message || json?.message || 'Invalid superadmin credentials');
      }

      const platformRole = json.data?.user?.platformRole;
      if (platformRole !== 'PLATFORM_SUPER_ADMIN') {
        throw new Error(
          'Security Violation: This terminal is strictly reserved for Platform Super Administrators.',
        );
      }

      if (json.data?.tokens?.accessToken) {
        sessionStorage.setItem('accessToken', json.data.tokens.accessToken);
        sessionStorage.setItem('user', JSON.stringify(json.data.user));
      }

      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Superadmin access denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-950 text-violet-400 border border-violet-800 font-mono font-bold text-xl mb-3 shadow-2xl">
            ⬢
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Superadmin Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">Global Root Configuration Plane</p>
        </div>

        <Card className="border border-violet-900/60 bg-slate-900/90 shadow-2xl text-white">
          <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <h2 className="text-lg font-semibold text-white">Root Authentication</h2>
              <p className="text-xs text-slate-400">Hardware token / TOTP MFA ready</p>
            </div>
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40">Tier 0 Root</Badge>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-lg bg-red-950/90 border border-red-800 text-red-300 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
                  Superadmin Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="root@aeonexus.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password">
                  Root Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300" htmlFor="mfa">
                    MFA Security Token (Optional in Dev)
                  </label>
                  <span className="text-[10px] text-violet-400 font-mono">TOTP / FIDO2</span>
                </div>
                <Input
                  id="mfa"
                  type="text"
                  placeholder="000 000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white placeholder-slate-600 font-mono tracking-widest text-center"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full bg-[#6554E8] hover:bg-[#5242d4] text-white">
                {loading ? 'Verifying Credentials...' : 'Authenticate Superadmin'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

