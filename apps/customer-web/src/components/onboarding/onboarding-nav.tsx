'use client';

import React from 'react';
import Link from 'next/link';

interface OnboardingNavProps {
  currentStep: 'business' | 'goals' | 'brand' | 'complete';
}

const STEPS = [
  { id: 'business', label: '1. Business Context', href: '/onboarding/business' },
  { id: 'goals', label: '2. Strategic Goals', href: '/onboarding/goals' },
  { id: 'brand', label: '3. Brand Identity', href: '/onboarding/brand' },
  { id: 'complete', label: '4. Workspace Ready', href: '/onboarding/complete' },
];

export function OnboardingNav({ currentStep }: OnboardingNavProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex items-center justify-center text-white font-bold text-xs">
            N
          </div>
          <span className="font-bold text-slate-900 text-sm">AEO Nexus Onboarding</span>
        </Link>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800">
          Save & Exit to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {STEPS.map((s, idx) => {
          const isDone = idx < currentIndex || currentStep === 'complete';
          const isCurrent = s.id === currentStep;

          return (
            <div
              key={s.id}
              className={`p-2.5 rounded-xl border text-xs font-medium transition ${
                isCurrent
                  ? 'border-[#3563F6] bg-[#EAF0FF]/80 text-[#3563F6] font-semibold'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{isDone ? '✓' : idx + 1}</span>
                <span className="truncate">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

