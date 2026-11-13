'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardContent } from '@aeo-nexus/ui';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    setStatus('verifying');
    try {
      const res = await fetch('http://localhost:4000/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message || json?.message || 'Verification failed');
      }

      setStatus('success');
      setMessage(json.data?.message || 'Your email address has been successfully verified.');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Invalid or expired token.');
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendStatus(null);
    try {
      const res = await fetch('http://localhost:4000/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      const json = await res.json();
      setResendStatus(json.data?.message || 'A new verification link has been sent if eligible.');
    } catch {
      setResendStatus('Failed to resend. Please try again later.');
    }
  };

  return (
    <Card className="border border-slate-200/80 shadow-sm bg-white">
      <CardHeader className="text-center pb-2">
        <h2 className="text-xl font-bold text-slate-900">Email Verification</h2>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {status === 'verifying' && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#3563F6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600">Verifying your email token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <p className="text-sm text-slate-700 font-medium">{message}</p>
            <Link href="/login">
              <Button className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                Log In to Workspace
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2">
            <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
              {message}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">Request New Verification Link</h3>
              <form onSubmit={handleResend} className="space-y-3">
                {resendStatus && (
                  <div className="p-2 text-xs rounded bg-blue-50 text-blue-700">
                    {resendStatus}
                  </div>
                )}
                <Input
                  type="email"
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full bg-[#3563F6] hover:bg-[#284ecc] text-white">
                  Resend Verification Email
                </Button>
              </form>
            </div>
          </div>
        )}

        {status === 'idle' && !token && (
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-slate-600">
              No verification token was provided in the URL. If you received an email link, please make sure you copied the full address.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3563F6] text-white font-bold text-xl mb-3 shadow-md">
            AN
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AEO Nexus</h1>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading verification details...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}

