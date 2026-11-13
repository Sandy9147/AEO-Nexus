'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, Button } from '@aeo-nexus/ui';

export default function NewStrategicPlanPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [planType, setPlanType] = useState('BUSINESS_LAUNCH');
  const [businessStage, setBusinessStage] = useState('GROWTH');
  const [targetMarket, setTargetMarket] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [budgetRange, setBudgetRange] = useState('$10,000 - $50,000');
  const [timeline, setTimeline] = useState('6 months');
  const [teamSize, setTeamSize] = useState('3-10 people');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Discover research projects available to link
  const [researchList, setResearchList] = useState<Array<{ id: string; topic: string }>>([]);
  const [selectedResearchId, setSelectedResearchId] = useState<string>('');

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);

    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/discover/research`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setResearchList(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Plan Title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/strategies/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          planType,
          businessStage,
          targetMarket: targetMarket.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          budgetRange,
          timeline,
          teamSize,
          researchId: selectedResearchId || undefined,
          additionalInstructions: additionalInstructions.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to generate strategic plan.');
      }

      const plan = await res.json();
      router.push(`/plan/strategies/${plan.id}`);
    } catch (err: any) {
      setError(err.message || 'Error occurred while creating strategic plan.');
      setSubmitting(false);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/plan/strategies" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back to Strategic Plans
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Generate Strategic Business Plan</h1>
          <p className="text-sm text-gray-500">
            Provide strategic business goals and context. Our AI Business Agent will synthesize your workspace data, Discover research, and competitive intelligence into an actionable 15-section plan.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            {/* Step 1: Core Parameters */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <span>1.</span> Business Parameters
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plan Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 Answer Engine Visibility & Organic Growth Strategy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Plan Type
                  </label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="BUSINESS_LAUNCH">New Business Launch</option>
                    <option value="MARKET_EXPANSION">Market Expansion</option>
                    <option value="AEO_STRATEGY">Answer Engine Optimization (AEO)</option>
                    <option value="PRODUCT_PIVOT">Product Pivot & Repositioning</option>
                    <option value="OPERATIONAL_SCALING">Operational Scaling</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Current Business Stage
                  </label>
                  <select
                    value={businessStage}
                    onChange={(e) => setBusinessStage(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="EARLY_STAGE">Early Stage (Pre-revenue / MVP)</option>
                    <option value="GROWTH">Growth (Product-Market Fit)</option>
                    <option value="ESTABLISHED">Established (Scaling ARR)</option>
                    <option value="ENTERPRISE">Enterprise (Multi-team / Global)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Target Audience & Market */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <span>2.</span> Target Audience & Market Positioning
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Market / Geography
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. North America, Global B2B SaaS"
                    value={targetMarket}
                    onChange={(e) => setTargetMarket(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ideal Customer Persona
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CMOs, Growth Marketers, SaaS Founders"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Budget Range
                  </label>
                  <input
                    type="text"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Execution Horizon
                  </label>
                  <input
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Allocated Team Size
                  </label>
                  <input
                    type="text"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Link Discover Research */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <span>3.</span> Connect Discover Research Intelligence (Optional)
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Connect Discover Research Study
                </label>
                <select
                  value={selectedResearchId}
                  onChange={(e) => setSelectedResearchId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- No linked research study (Use workspace context only) --</option>
                  {researchList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.topic}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  When linked, market findings, competitor insights, and audience personas will directly inform strategic initiatives and roadmap milestones.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Specific Strategic Directives or Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Emphasize organic Answer Engine citations over paid ad spend. Prioritize building an automated schema crawler in Phase 1."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <Link href="/plan/strategies">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Generating Plan with AI...' : '✨ Generate Strategic Plan'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </CustomerShell>
  );
}
