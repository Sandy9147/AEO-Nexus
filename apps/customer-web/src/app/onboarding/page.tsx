'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardTitle, CardDescription, Button } from '@aeo-nexus/ui';

export default function OnboardingLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');

    if (!token) {
      router.replace('/login');
      return;
    }

    if (!wsId) {
      router.replace('/workspaces');
      return;
    }

    const checkProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspaces/${wsId}/onboarding`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': wsId,
          },
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const step = json.data.step || 'business';
          if (step === 'complete') {
            setLoading(false);
          } else {
            router.replace(`/onboarding/${step}`);
          }
        } else {
          router.replace('/onboarding/business');
        }
      } catch {
        router.replace('/onboarding/business');
      }
    };

    checkProgress();
  }, [router, API_BASE]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-block animate-spin text-2xl text-[#3563F6]">⟳</div>
          <p className="text-sm font-medium text-slate-600">Restoring onboarding progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-200 bg-white shadow-lg p-6 space-y-4 text-center">
        <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 text-2xl flex items-center justify-center mx-auto">
          ✓
        </div>
        <CardTitle className="text-xl text-slate-900">Onboarding Already Completed</CardTitle>
        <CardDescription className="text-xs text-slate-500 leading-relaxed">
          Your active workspace profile and brand context have already been configured and synced with the central engine.
        </CardDescription>
        <div className="pt-4 flex flex-col gap-2">
          <Link href="/dashboard">
            <Button variant="primary" className="w-full">
              Go to Dashboard →
            </Button>
          </Link>
          <Link href="/onboarding/business">
            <Button variant="outline" className="w-full text-xs">
              Review or Edit Business Profile
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
