'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '@aeo-nexus/ui';

export default function PublicRegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'Registration failed');
      }

      setRegistered(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during account registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="primary">Start Operating</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Create Your AEO Nexus Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Initialize your central identity and set up your first tenant workspace.
          </p>
        </div>

        <Card className="border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {registered ? (
            <div className="text-center py-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl flex items-center justify-center mx-auto">
                ✉️
              </div>
              <CardTitle className="text-lg text-slate-900">Verification Email Dispatched</CardTitle>
              <CardDescription className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                We sent a secure email verification link to <span className="font-semibold text-slate-800">{email}</span>. Click the link in your email to activate your account and access your workspace.
              </CardDescription>
              <div className="pt-2">
                <a href="http://localhost:3001/login">
                  <Button variant="primary" size="sm" className="text-xs">
                    Proceed to Customer Login →
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Elena"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Rostova"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Work Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="elena@company.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="text-xs"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full text-xs" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Register Workspace Account →'}
                </Button>
              </div>

              <div className="text-center pt-2 text-xs text-slate-500">
                Already registered?{' '}
                <Link href="/login" className="text-[#3563F6] font-semibold hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}

