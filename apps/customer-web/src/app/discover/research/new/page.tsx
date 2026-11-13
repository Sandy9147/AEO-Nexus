'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, Button } from '@aeo-nexus/ui';

export default function NewResearchPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    topic: '',
    industry: '',
    targetCountry: 'Global',
    targetAudience: '',
    businessDescription: '',
    objective: 'COMPREHENSIVE',
    additionalInstructions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.topic.trim()) {
      setError('Please provide both a research title and topic.');
      return;
    }

    setSubmitting(true);
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/discover/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to initialize research study.');
      }

      const created = await res.json();
      router.push(`/discover/research/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/discover/research" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back to Research Studies
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">New AI Research Study</h1>
          <p className="text-sm text-gray-500">
            Launch an autonomous market discovery run. The agent synthesizes your workspace brand profile, queries knowledge docs, benchmarks competitors, and extracts market opportunities.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <Card className="p-6 border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Study Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Answer Engine Visibility & Competitive Opportunity Audit"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Research Topic & Primary Inquiry *
              </label>
              <textarea
                placeholder="Describe the core business opportunity, market question, or capability you want to evaluate..."
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Industry / Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. B2B SaaS / MarTech / FinTech"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Target Geographic Market
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States, Global, EMEA"
                  value={form.targetCountry}
                  onChange={(e) => setForm({ ...form, targetCountry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Target Audience Segment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-market Founders & Heads of Growth"
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Research Objective Focus
                </label>
                <select
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6] bg-white"
                >
                  <option value="COMPREHENSIVE">Comprehensive (All Dimensions)</option>
                  <option value="MARKET_OPPORTUNITY">Market Opportunity & Validation</option>
                  <option value="COMPETITOR_ANALYSIS">Competitor Benchmarking</option>
                  <option value="AUDIENCE_DISCOVERY">Audience Personas & ICP</option>
                  <option value="TRENDS">Emerging Industry Trends</option>
                  <option value="AEO_DISCOVERY">Answer Engine Optimization (AEO)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Business & Product Context (Optional)
              </label>
              <textarea
                placeholder="Specific product features or value propositions you want the AI to evaluate against the market..."
                value={form.businessDescription}
                onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Custom Research Directives (Optional)
              </label>
              <textarea
                placeholder="Any special parameters, focus areas, or constraints for this research run..."
                value={form.additionalInstructions}
                onChange={(e) => setForm({ ...form, additionalInstructions: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Link href="/discover/research">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Initializing Study...' : '🚀 Launch Autonomous Research'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </CustomerShell>
  );
}
