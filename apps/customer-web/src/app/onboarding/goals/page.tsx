'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingNav } from '../../../components/onboarding/onboarding-nav';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@aeo-nexus/ui';

interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const AVAILABLE_GOALS: GoalOption[] = [
  {
    id: 'improve_visibility',
    title: 'Improve Online Visibility',
    description: 'Rank higher in search engines and get cited in conversational AI answers.',
    icon: '🔍',
  },
  {
    id: 'generate_leads',
    title: 'Generate Qualified Leads',
    description: 'Capture prospective buyer interest and automate qualification pipelines.',
    icon: '🎯',
  },
  {
    id: 'create_content',
    title: 'Create Authority Content',
    description: 'Produce high-converting blog posts, whitepapers, and brand articles.',
    icon: '✍️',
  },
  {
    id: 'build_website',
    title: 'Build or Modernize Website',
    description: 'Design fast, conversion-focused digital properties for your business.',
    icon: '💻',
  },
  {
    id: 'automate_tasks',
    title: 'Automate Business Tasks',
    description: 'Eliminate repetitive manual operations through event-driven workflows.',
    icon: '⚡',
  },
  {
    id: 'improve_brand',
    title: 'Improve Brand Presence',
    description: 'Establish a memorable, professional corporate visual and editorial identity.',
    icon: '🌟',
  },
];

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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

    const loadGoals = async () => {
      try {
        const res = await fetch(`${API_BASE}/workspaces/${wsId}/onboarding`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': wsId,
          },
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          if (json.data.goals && Array.isArray(json.data.goals)) {
            setSelectedGoals(json.data.goals);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [router, API_BASE]);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleNext = async () => {
    if (selectedGoals.length === 0) {
      setError('Please select at least one strategic goal to guide your workspace');
      return;
    }

    setError(null);
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');

    if (!token || !wsId) {
      router.replace('/login');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/onboarding/step`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify({
          step: 'brand',
          goals: selectedGoals,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'Failed to record goals');
      }

      router.push('/onboarding/brand');
    } catch (err: any) {
      setError(err.message || 'Error advancing to brand setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="inline-block animate-spin text-2xl text-[#3563F6]">⟳</div>
          <p className="text-xs text-slate-500">Loading strategic priorities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-4 sm:px-6 antialiased">
      <div className="max-w-2xl mx-auto">
        <OnboardingNav currentStep="goals" />

        <Card className="border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-6">
          <CardHeader className="p-0 space-y-1">
            <CardTitle className="text-xl text-slate-900">Step 2: Strategic Goals</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select what your business aims to achieve. These priorities direct which tools and autonomous agents are prioritized.
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {AVAILABLE_GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <div
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3563F6] bg-[#EAF0FF]/60 shadow-sm ring-1 ring-[#3563F6]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{goal.icon}</span>
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'border-[#3563F6] bg-[#3563F6] text-white font-bold'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{goal.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {goal.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push('/onboarding/business')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              ← Back to Business Context
            </button>
            <Button onClick={handleNext} variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Next: Brand Identity →'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

