'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '@aeo-nexus/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      setMessage(
        json.data?.message || 'If an account exists with that email, reset instructions have been sent.',
      );
      setSubmitted(true);
    } catch {
      setMessage('If an account exists with that email, reset instructions have been sent.');
      setSubmitted(true);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recover Account</h1>
          <p className="text-sm text-slate-500 mt-1">AEO Nexus Password Reset</p>
        </div>

        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Forgot your password?</h2>
            <p className="text-xs text-slate-500">
              Enter the email associated with your account and we&apos;ll send you a reset link.
            </p>
          </CardHeader>

          {submitted ? (
            <CardContent className="space-y-4 py-6 text-center">
              <div className="w-12 h-12 bg-blue-100 text-[#3563F6] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✉
              </div>
              <h3 className="text-base font-semibold text-slate-900">Check your inbox</h3>
              <p className="text-sm text-slate-600">{message}</p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email">
                    Registered Email Address
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
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={loading} className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                </Button>

                <div className="text-center text-xs text-slate-500 mt-2">
                  Remember your password?{' '}
                  <Link href="/login" className="text-[#3563F6] hover:underline font-semibold">
                    Sign in
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

