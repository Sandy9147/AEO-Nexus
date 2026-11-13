'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingNav } from '../../../components/onboarding/onboarding-nav';
import { Card, CardHeader, CardTitle, CardDescription, Button, Input } from '@aeo-nexus/ui';

const INDUSTRIES = [
  'Enterprise Software & SaaS',
  'E-Commerce & Retail',
  'Healthcare & Life Sciences',
  'Financial Services & Fintech',
  'Professional Services & Consulting',
  'Marketing & Advertising Agency',
  'Manufacturing & Logistics',
  'Real Estate & Construction',
  'Education & EdTech',
  'Other Commercial Sector',
];

const SIZES = [
  '1-10 employees (Early Stage)',
  '11-50 employees (Growth Stage)',
  '51-200 employees (Scale-up)',
  '201-1000 employees (Mid-Market)',
  '1000+ employees (Enterprise)',
];

export default function OnboardingBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [country, setCountry] = useState('United States');
  const [businessSize, setBusinessSize] = useState(SIZES[0]);
  const [description, setDescription] = useState('');

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

    const loadExisting = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspaces/${wsId}/business-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': wsId,
          },
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const p = json.data;
          setBusinessName(p.businessName || '');
          setWebsite(p.website || '');
          if (p.industry) setIndustry(p.industry);
          if (p.country) setCountry(p.country);
          if (p.businessSize) setBusinessSize(p.businessSize);
          if (p.description) setDescription(p.description);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadExisting();
  }, [router, API_BASE]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (businessName.trim().length < 2) {
      setError('Business name must be at least 2 characters');
      return;
    }

    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');

    if (!token || !wsId) {
      router.replace('/login');
      return;
    }

    try {
      setSaving(true);
      // 1. Save Business Profile
      const saveRes = await fetch(`${API_BASE}/workspaces/${wsId}/business-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          website: website.trim() || null,
          industry,
          country: country.trim(),
          businessSize,
          description: description.trim() || null,
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok || saveJson.success === false) {
        throw new Error(saveJson.error?.message || 'Failed to save business profile');
      }

      // 2. Advance onboarding step to goals
      await fetch(`${API_BASE}/workspaces/${wsId}/onboarding/step`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify({
          step: 'goals',
        }),
      });

      router.push('/onboarding/goals');
    } catch (err: any) {
      setError(err.message || 'Error saving business context');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="inline-block animate-spin text-2xl text-[#3563F6]">⟳</div>
          <p className="text-xs text-slate-500">Loading business context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-4 sm:px-6 antialiased">
      <div className="max-w-2xl mx-auto">
        <OnboardingNav currentStep="business" />

        <Card className="border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-6">
          <CardHeader className="p-0 space-y-1">
            <CardTitle className="text-xl text-slate-900">Step 1: Business Context</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Provide the structural details of your company to calibrate search graphs, market analysis, and AI reasoning.
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Business / Company Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Acme Innovations Corp"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Official Website URL
              </label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Industry Vertical <span className="text-rose-500">*</span>
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Country of Incorporation <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. United States, United Kingdom"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Organization Size <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessSize}
                onChange={(e) => setBusinessSize(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              >
                {SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Short Business Description
              </label>
              <textarea
                rows={3}
                placeholder="What does your company do and what primary products or services do you provide?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Step 1 of 4 • Progress automatically saved
              </span>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Next: Strategic Goals →'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

