'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingNav } from '../../../components/onboarding/onboarding-nav';
import { Card, CardHeader, CardTitle, CardDescription, Button, Input } from '@aeo-nexus/ui';

const PRESET_COLORS = [
  { name: 'Nexus Royal Blue', hex: '#3563F6' },
  { name: 'Nexus Violet', hex: '#6554E8' },
  { name: 'Emerald Growth', hex: '#16A36A' },
  { name: 'Obsidian Slate', hex: '#0F172A' },
  { name: 'Crimson Power', hex: '#E11D48' },
  { name: 'Amber Glow', hex: '#D97706' },
];

const VOICE_OPTIONS = [
  {
    title: 'Professional & Authoritative',
    desc: 'Clear, trustworthy, and data-backed tone suitable for enterprise buyers.',
  },
  {
    title: 'Friendly & Accessible',
    desc: 'Approachable, warm, and conversational tone focused on simplicity.',
  },
  {
    title: 'Bold & Futuristic',
    desc: 'High energy, disruptive, visionary voice for tech innovators.',
  },
  {
    title: 'Direct & Pragmatic',
    desc: 'Concise, action-oriented, and focused strictly on measurable results.',
  },
];

export default function OnboardingBrandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState('#3563F6');
  const [secondaryColor, setSecondaryColor] = useState('#6554E8');
  const [brandVoice, setBrandVoice] = useState(VOICE_OPTIONS[0].title);
  const [logoUrl, setLogoUrl] = useState('');
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

    const loadBrand = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspaces/${wsId}/brand-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': wsId,
          },
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const b = json.data;
          if (b.primaryColor) setPrimaryColor(b.primaryColor);
          if (b.secondaryColor) setSecondaryColor(b.secondaryColor);
          if (b.brandVoice) setBrandVoice(b.brandVoice);
          if (b.logoUrl) setLogoUrl(b.logoUrl);
          if (b.description) setDescription(b.description);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadBrand();
  }, [router, API_BASE]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');

    if (!token || !wsId) {
      router.replace('/login');
      return;
    }

    try {
      setSaving(true);
      // 1. Save Brand Profile
      const brandRes = await fetch(`${API_BASE}/workspaces/${wsId}/brand-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          brandVoice,
          logoUrl: logoUrl.trim() || null,
          description: description.trim() || null,
        }),
      });

      const brandJson = await brandRes.json();
      if (!brandRes.ok || brandJson.success === false) {
        throw new Error(brandJson.error?.message || 'Failed to save brand profile');
      }

      // 2. Mark onboarding complete in backend
      await fetch(`${API_BASE}/workspaces/${wsId}/onboarding/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });

      router.push('/onboarding/complete');
    } catch (err: any) {
      setError(err.message || 'Error finalizing brand setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="inline-block animate-spin text-2xl text-[#3563F6]">⟳</div>
          <p className="text-xs text-slate-500">Loading brand preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-4 sm:px-6 antialiased">
      <div className="max-w-2xl mx-auto">
        <OnboardingNav currentStep="brand" />

        <Card className="border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-6">
          <CardHeader className="p-0 space-y-1">
            <CardTitle className="text-xl text-slate-900">Step 3: Brand Identity</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Establish your visual palette and editorial voice. Every marketing output, generated asset, and document will automatically reflect these tokens.
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Color Palettes */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">
                Primary Brand Color
              </label>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="font-mono text-xs text-slate-700 font-medium">
                    {primaryColor}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setPrimaryColor(c.hex)}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-medium border transition ${
                        primaryColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1.5"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Accent */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Secondary Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-8 w-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
                <span className="font-mono text-xs text-slate-700 font-medium">
                  {secondaryColor}
                </span>
              </div>
            </div>

            {/* Brand Voice */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Editorial Voice & Tone
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {VOICE_OPTIONS.map((opt) => {
                  const isSelected = brandVoice === opt.title;
                  return (
                    <div
                      key={opt.title}
                      onClick={() => setBrandVoice(opt.title)}
                      className={`p-3 rounded-lg border cursor-pointer transition select-none ${
                        isSelected
                          ? 'border-[#3563F6] bg-[#EAF0FF]/60 ring-1 ring-[#3563F6]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">{opt.title}</span>
                        {isSelected && <span className="text-xs text-[#3563F6] font-bold">✓</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Logo Asset URL (Optional)
              </label>
              <Input
                type="url"
                placeholder="https://your-domain.com/assets/logo.svg"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-400">
                S3 / Cloud storage bucket upload support configured in workspace integrations.
              </p>
            </div>

            {/* Brand Mission Statement */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Brand Mission / Value Proposition
              </label>
              <textarea
                rows={2}
                placeholder="What single promise does your brand deliver to your clients?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push('/onboarding/goals')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                ← Back to Strategic Goals
              </button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Finalizing Setup...' : 'Complete Onboarding & Launch →'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

