'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, Button } from '@aeo-nexus/ui';

function NewWebsiteWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'BUSINESS_WEBSITE';

  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [name, setName] = useState('');
  const [websiteType, setWebsiteType] = useState(initialType);
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3563F6');
  const [secondaryColor, setSecondaryColor] = useState('#6554E8');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [plans, setPlans] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/strategies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data.map((p: any) => ({ id: p.id, title: p.title })));
        }
      })
      .catch((err) => console.error('Failed to load plans:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Website name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      if (mode === 'AI') {
        const payload = {
          name: name.trim(),
          websiteType,
          businessDescription: description.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          targetMarket: targetMarket.trim() || undefined,
          additionalInstructions: additionalInstructions.trim() || undefined,
          brandColors: {
            primary: primaryColor,
            secondary: secondaryColor,
          },
          planId: selectedPlanId || undefined,
        };

        const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to start AI website generation');
        }

        const created = await res.json();
        router.push(`/build/websites/${created.id}`);
      } else {
        const payload = {
          name: name.trim(),
          websiteType,
          description: description.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          targetMarket: targetMarket.trim() || undefined,
          planId: selectedPlanId || undefined,
        };

        const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to create website');
        }

        const created = await res.json();
        router.push(`/build/websites/${created.id}/editor`);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/build/websites" className="text-xs font-semibold text-blue-600 hover:underline">
              ← Websites Directory
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Website</h1>
          <p className="text-sm text-slate-600 mt-1">
            Launch an AI-generated website architecture or start from a blank canvas.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setMode('AI')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              mode === 'AI'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="text-2xl mb-2">✨</div>
            <div className="font-bold text-slate-900 text-sm">AI Autonomous Builder (Recommended)</div>
            <div className="text-xs text-slate-600 mt-1">
              Generate a multi-page website with copy, hero sections, and themes from your business profile or plan.
            </div>
          </div>
          <div
            onClick={() => setMode('MANUAL')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              mode === 'MANUAL'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="text-2xl mb-2">🛠️</div>
            <div className="font-bold text-slate-900 text-sm">Blank Starter</div>
            <div className="text-xs text-slate-600 mt-1">
              Start with a minimal Home page and assemble sections from our visual library at your own pace.
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Website Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Cloud Platform"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Website Type
                </label>
                <select
                  value={websiteType}
                  onChange={(e) => setWebsiteType(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="BUSINESS_WEBSITE">Business Website</option>
                  <option value="SAAS_LANDING">SaaS Landing Page</option>
                  <option value="AGENCY_PORTFOLIO">Agency & Portfolio</option>
                  <option value="CONSULTING">Consulting / Advisory</option>
                  <option value="PRODUCT_LAUNCH">Product Launch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Link Strategic Plan (Optional)
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">None (Use workspace profile)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Business & Product Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe what your business or product does, your unique advantage, and what actions visitors should take..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  placeholder="e.g. CMOs, Founders, Agency Leaders"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Target Market / Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. North America B2B SaaS"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {mode === 'AI' && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-700">{primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Secondary Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-700">{secondaryColor}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Additional AI Directives (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Emphasize Answer Engine Optimization, include transparent tier pricing, keep tone professional..."
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3">
              <Link href="/build/websites">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Processing...' : mode === 'AI' ? '✨ Generate Website with AI' : 'Create Blank Starter'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </CustomerShell>
  );
}

export default function NewWebsitePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading wizard...</div>}>
      <NewWebsiteWizard />
    </Suspense>
  );
}
