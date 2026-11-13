'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

interface ComingSoonViewProps {
  moduleName: string;
  category: string;
  targetPhase: string;
  description: string;
  plannedFeatures: string[];
}

export function ComingSoonView({
  moduleName,
  category,
  targetPhase,
  description,
  plannedFeatures,
}: ComingSoonViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              {category}
            </span>
            <span className="text-slate-300">•</span>
            <Badge variant="warning">{targetPhase}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{moduleName}</h1>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            ← Return to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF0FF] text-[#3563F6] font-bold text-lg mb-2">
            🚀
          </div>
          <CardTitle className="text-xl text-slate-900">Module Under Active Engineering</CardTitle>
          <CardDescription className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Planned Capabilities & Architecture
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plannedFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-[#F7F9FC]"
                >
                  <span className="text-[#3563F6] font-bold text-sm">✓</span>
                  <span className="text-xs font-medium text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-[#EAF0FF]/60 p-4 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">Need immediate assistance with your workspace?</p>
              <p className="text-slate-500 mt-0.5">Explore configured tools or configure team permissions.</p>
            </div>
            <Link href="/apps">
              <Button size="sm" variant="primary">
                Browse Active Apps
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

