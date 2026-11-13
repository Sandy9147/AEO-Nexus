'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { StrategicPlanDto } from '@aeo-nexus/contracts';

export default function PlanReportsPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StrategicPlanDto[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StrategicPlanDto | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);

    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/strategies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setPlans(data);
        if (data.length > 0) setSelectedPlan(data[0]);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <CustomerShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/plan" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Plan Overview
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Executive Reports & Plan Briefs</h1>
            <p className="text-sm text-gray-500">
              Clean, printable executive business plans suitable for leadership presentations and board reviews.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              🖨️ Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* Plan Selector */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 print:hidden">
          <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            Select Plan to View:
          </label>
          <select
            value={selectedPlan?.id || ''}
            onChange={(e) => {
              const found = plans.find((p) => p.id === e.target.value);
              if (found) setSelectedPlan(found);
            }}
            className="w-full max-w-md text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (v{p.currentVersionNumber}.0)
              </option>
            ))}
          </select>
        </div>

        {/* Printable Document Body */}
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading plan report...</div>
        ) : !selectedPlan ? (
          <Card className="py-16 text-center">
            <p className="text-gray-500">No strategic plans available to report.</p>
          </Card>
        ) : (
          <div className="bg-white p-8 md:p-12 rounded-xl border border-gray-200 shadow-sm space-y-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="border-b-2 border-gray-900 pb-6 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  AEO Nexus Executive Brief
                </span>
                <h1 className="text-3xl font-black text-gray-900 mt-2">{selectedPlan.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Plan Type: {selectedPlan.planType} • Target Horizon: {selectedPlan.horizonMonths} Months
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-1">
                <div>Status: <span className="font-bold text-gray-800">{selectedPlan.status}</span></div>
                <div>Version: <span className="font-bold text-gray-800">v{selectedPlan.currentVersionNumber}.0</span></div>
                <div>Generated: {new Date(selectedPlan.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                Executive Summary
              </h2>
              <p className="text-sm text-gray-800 leading-relaxed">
                {selectedPlan.executiveSummary || 'Executive summary formulated through AI synthesis and workspace contextualization.'}
              </p>
            </div>

            {/* Current Situation & Market Positioning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                  Current Situation
                </h2>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {selectedPlan.currentSituation || 'Operating context established.'}
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                  Market Positioning
                </h2>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {selectedPlan.marketPositioning || 'Positioning verified.'}
                </p>
              </div>
            </div>

            {/* Strategic Objectives */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                Core Strategic Objectives
              </h2>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                {(selectedPlan.strategicObjectives || []).map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* Resource & Budget Assumptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                  Required Resources
                </h2>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                  {(selectedPlan.requiredResources || []).map((res, i) => (
                    <li key={i}>{res}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                  Budget Assumptions
                </h2>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                  {(selectedPlan.budgetAssumptions || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Success Metrics */}
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs border-b pb-1">
                Measurable Success Metrics
              </h2>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                {(selectedPlan.successMetrics || []).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>

            {/* Next Recommended Actions */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Immediate Next Actions
              </h2>
              <ul className="list-decimal list-inside space-y-1 text-xs text-gray-700">
                {(selectedPlan.nextRecommendedActions || []).map((a, i) => (
                  <li key={i} className="font-medium">{a}</li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t text-center text-[10px] text-gray-400">
              Generated by AEO Nexus Business Operating System • Confidential & Proprietary
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

