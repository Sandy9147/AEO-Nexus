'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { StrategyReviewDto, StrategicPlanDto } from '@aeo-nexus/contracts';

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<StrategyReviewDto[]>([]);
  const [plans, setPlans] = useState<StrategicPlanDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New review form
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [period, setPeriod] = useState('MONTHLY');
  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [adjustments, setAdjustments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = (wsId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    Promise.all([
      fetch(`${apiUrl}/workspaces/${wsId}/plan/reviews`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      fetch(`${apiUrl}/workspaces/${wsId}/plan/strategies`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
    ])
      .then(([revs, plns]) => {
        setReviews(revs);
        setPlans(plns);
        if (plns.length > 0 && !selectedPlanId) setSelectedPlanId(plns[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    loadData(wsId);
  }, []);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !summary.trim()) return;

    setSubmitting(true);
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          period,
          summary: summary.trim(),
          blockersIdentified: blockers.split('\n').filter((b) => b.trim()),
          strategicAdjustments: adjustments.split('\n').filter((a) => a.trim()),
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setSummary('');
        setBlockers('');
        setAdjustments('');
        loadData(workspaceId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/plan" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Plan Overview
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Strategy Reviews & Governance</h1>
            <p className="text-sm text-gray-500">
              Conduct periodic reviews to re-evaluate assumptions, record strategic adjustments, and unblock execution.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            disabled={plans.length === 0}
          >
            + Conduct Review
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading strategy reviews...</div>
        ) : reviews.length === 0 ? (
          <Card className="py-16 text-center">
            <span className="text-4xl">🔄</span>
            <h3 className="text-base font-bold text-gray-900 mt-3">No Strategy Reviews Conducted</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Regular reviews maintain strategic alignment between market research and engineering deliverables.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowModal(true)}
              disabled={plans.length === 0}
            >
              Start First Review
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((rv) => (
              <Card key={rv.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {rv.period} Review
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      Conducted on {new Date(rv.reviewDate).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="success">{rv.status}</Badge>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                  {rv.summary}
                </p>

                {rv.blockersIdentified && rv.blockersIdentified.length > 0 && (
                  <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 text-xs">
                    <span className="font-bold text-red-800 block mb-1">Blockers Identified:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-red-700">
                      {rv.blockersIdentified.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {rv.strategicAdjustments && rv.strategicAdjustments.length > 0 && (
                  <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 text-xs">
                    <span className="font-bold text-indigo-900 block mb-1">Strategic Adjustments:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-indigo-800">
                      {rv.strategicAdjustments.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Create Review Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base text-gray-900">Conduct Strategy Review</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreateReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Strategic Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Review Period
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="WEEKLY">Weekly Sprint Review</option>
                    <option value="MONTHLY">Monthly Cadence Review</option>
                    <option value="QUARTERLY">Quarterly Strategy Rebalancing</option>
                    <option value="ANNUALLY">Annual Business Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Review Summary & Executive Synthesis *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide overview of overall progress, citation metrics, and goal pacing..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Blockers Identified (One per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Rate limiting on test crawlers&#10;Delayed customer feedback on schema"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Strategic Adjustments (One per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Shift engineering focus to Perplexity schema injection&#10;Allocate additional compute budget"
                    value={adjustments}
                    onChange={(e) => setAdjustments(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" type="button" size="sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
