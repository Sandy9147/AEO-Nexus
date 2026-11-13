'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OnboardingNav } from '../../../components/onboarding/onboarding-nav';
import { Card, CardTitle, CardDescription, Button } from '@aeo-nexus/ui';
import { DashboardSummaryDto } from '@aeo-nexus/contracts';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
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

    const loadData = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspaces/${wsId}/dashboard-summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': wsId,
          },
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setSummary(json.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, API_BASE]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-4 sm:px-6 antialiased">
      <div className="max-w-2xl mx-auto space-y-6">
        <OnboardingNav currentStep="complete" />

        <Card className="border-slate-200 bg-white shadow-lg p-6 sm:p-10 text-center space-y-6">
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-[#3563F6] to-[#6554E8] text-white flex items-center justify-center text-3xl mx-auto shadow-md">
            🎉
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Workspace Initialized!
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Your business context, strategic priorities, and brand tokens are officially registered with the central AEO Nexus engine.
            </CardDescription>
          </div>

          {!loading && summary && (
            <div className="bg-[#F7F9FC] rounded-2xl border border-slate-200/80 p-5 text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Workspace Configuration Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Organization</span>
                  <span className="font-semibold text-slate-800">
                    {summary.businessProfile?.businessName || summary.workspace.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Industry</span>
                  <span className="font-semibold text-slate-800">
                    {summary.businessProfile?.industry || 'Standard Sector'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Brand Colors</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="h-3 w-3 rounded-full border border-slate-300"
                      style={{ backgroundColor: summary.brandProfile?.primaryColor || '#3563F6' }}
                    />
                    <span
                      className="h-3 w-3 rounded-full border border-slate-300"
                      style={{ backgroundColor: summary.brandProfile?.secondaryColor || '#6554E8' }}
                    />
                    <span className="font-mono text-slate-600 text-[11px]">
                      {summary.brandProfile?.primaryColor || '#3563F6'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Editorial Tone</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {summary.brandProfile?.brandVoice || 'Professional'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full text-sm">
                Launch Workspace Dashboard →
              </Button>
            </Link>
            <Link href="/team" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full text-sm">
                Invite Team Members
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

