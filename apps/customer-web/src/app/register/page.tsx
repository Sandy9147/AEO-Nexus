'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '@aeo-nexus/ui';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message || json?.message || 'Registration failed');
      }

      setSuccessMessage(
        json.data?.message || 'Registration successful! Please check your email to verify your account.',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your Account</h1>
          <p className="text-sm text-slate-500 mt-1">Get started with AEO Nexus</p>
        </div>

        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Registration</h2>
            <p className="text-xs text-slate-500">Enter your details to register as an organization owner</p>
          </CardHeader>

          {successMessage ? (
            <CardContent className="space-y-4 py-6 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="text-base font-semibold text-slate-900">Check your inbox</h3>
              <p className="text-sm text-slate-600">{successMessage}</p>
              <div className="pt-4">
                <Link href="/login">
                  <Button className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                    Proceed to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="firstName">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="lastName">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email">
                    Work Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="password">
                    Password (min. 8 characters)
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={loading} className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>

                <div className="text-center text-xs text-slate-500 mt-2">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#3563F6] hover:underline font-semibold">
                    Sign in here
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

