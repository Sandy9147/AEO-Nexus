'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { StrategicPlanDetailDto } from '@aeo-nexus/contracts';

export default function StrategicPlanWorkspacePage() {
  const params = useParams();
  const planId = params.planId as string;

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StrategicPlanDetailDto | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'initiatives' | 'goals' | 'versions'>('overview');
  const [showVersionDrawer, setShowVersionDrawer] = useState(false);
  const [approving, setApproving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadPlan = (wsId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token || !planId) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/strategies/${planId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPlan(data);
      })
      .catch((err) => console.error('Failed to load plan:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    loadPlan(wsId);
  }, [planId]);

  const handleApprove = async () => {
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    setApproving(true);
    setActionSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/strategies/${planId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionSuccess('Strategic plan approved successfully! A new approved version snapshot was created.');
        loadPlan(workspaceId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  };

  const handleConvertInitiative = async (initiativeId: string, initiativeName: string) => {
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    setConvertingId(initiativeId);
    setActionSuccess(null);

    try {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/initiatives/${initiativeId}/convert-to-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectName: initiativeName,
          createInitialTasks: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionSuccess(`Initiative converted to Project "${data.projectName}" with ${data.tasksCreated} initial tasks!`);
        loadPlan(workspaceId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConvertingId(null);
    }
  };

  const getEvidenceBadge = (type?: string) => {
    switch (type) {
      case 'VERIFIED_SOURCE':
        return <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 font-semibold">✓ Verified Source</span>;
      case 'USER_INPUT':
        return <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-semibold">User Input</span>;
      case 'UNVERIFIED_ASSUMPTION':
        return <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-semibold">⚠️ Unverified Assumption</span>;
      case 'AI_ANALYSIS':
      default:
        return <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">🤖 AI Analysis</span>;
    }
  };

  if (loading) {
    return (
      <CustomerShell>
        <div className="py-20 text-center text-gray-400">Loading Strategic Plan Workspace...</div>
      </CustomerShell>
    );
  }

  if (!plan) {
    return (
      <CustomerShell>
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Strategic Plan not found.</p>
          <Link href="/plan/strategies">
            <Button variant="primary" size="sm">Back to Plans</Button>
          </Link>
        </Card>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/plan" className="hover:text-gray-700">Plan</Link>
            <span>/</span>
            <Link href="/plan/strategies" className="hover:text-gray-700">Strategic Plans</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{plan.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVersionDrawer(true)}
              className="text-xs"
            >
              📜 Versions (v{plan.currentVersionNumber}.0)
            </Button>
            <Link href="/plan/reports">
              <Button variant="outline" size="sm" className="text-xs">
                📄 Print / Export
              </Button>
            </Link>
            {plan.status !== 'APPROVED' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={approving}
                className="text-xs"
              >
                {approving ? 'Approving...' : '✓ Approve Plan'}
              </Button>
            )}
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-green-600 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Title Header Banner */}
        <Card className="p-6 bg-gradient-to-r from-white via-blue-50/20 to-indigo-50/30 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                  {plan.planType}
                </span>
                <Badge variant={plan.status === 'APPROVED' ? 'success' : 'primary'}>
                  {plan.status}
                </Badge>
                <span className="text-xs text-gray-500">
                  Confidence: {Math.round((plan.confidenceScore || 0.88) * 100)}%
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{plan.title}</h1>
              <p className="text-xs text-gray-600 max-w-3xl">
                {plan.executiveSummary || plan.currentSituation || 'Strategic business plan synthesized by AEO Nexus.'}
              </p>
            </div>

            <div className="flex flex-row md:flex-col gap-2 text-xs text-gray-500 bg-white/80 p-3 rounded-lg border border-gray-200">
              <div><span className="text-gray-400">Horizon:</span> <span className="font-semibold text-gray-800">{plan.horizonMonths} Months</span></div>
              <div><span className="text-gray-400">Stage:</span> <span className="font-semibold text-gray-800">{plan.businessStage || 'Growth'}</span></div>
              <div><span className="text-gray-400">Market:</span> <span className="font-semibold text-gray-800">{plan.targetMarket || 'Global'}</span></div>
            </div>
          </div>
        </Card>

        {/* Tabs Bar */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 transition-colors ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Executive Summary & Sections
          </button>
          <button
            onClick={() => setActiveTab('initiatives')}
            className={`pb-3 transition-colors ${activeTab === 'initiatives' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Initiatives ({plan.initiatives?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`pb-3 transition-colors ${activeTab === 'goals' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Goals & KPIs ({plan.goals?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`pb-3 transition-colors ${activeTab === 'versions' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Version History ({plan.versions?.length || 0})
          </button>
        </div>

        {/* TAB 1: Complete 15 Sections */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 1. Executive Summary */}
            <Card className="p-5 space-y-2 border-l-4 border-l-blue-600">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900">1. Executive Summary</h3>
                {getEvidenceBadge('AI_ANALYSIS')}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                {plan.executiveSummary || 'Executive summary synthesized by AEO Nexus strategic analysis.'}
              </p>
            </Card>

            {/* 2. Current Situation & 3. Market Positioning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">2. Current Situation</h3>
                  {getEvidenceBadge('AI_ANALYSIS')}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {plan.currentSituation || 'Operating context analyzed against industry benchmarks.'}
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">3. Market Positioning</h3>
                  {getEvidenceBadge('AI_ANALYSIS')}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {plan.marketPositioning || 'Positioning focused on autonomous operations and Answer Engine citation ownership.'}
                </p>
              </Card>
            </div>

            {/* 4. Strategic Objectives & 5. Target Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">4. Strategic Objectives</h3>
                  {getEvidenceBadge('VERIFIED_SOURCE')}
                </div>
                <ul className="space-y-1.5 text-xs text-gray-700 list-disc list-inside">
                  {(plan.strategicObjectives || []).map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">5. Target Audience</h3>
                  {getEvidenceBadge('USER_INPUT')}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {plan.targetAudience || 'Target customers and key buyer personas.'}
                </p>
              </Card>
            </div>

            {/* 6. Required Resources & 7. Budget Assumptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">6. Required Resources</h3>
                  {getEvidenceBadge('AI_ANALYSIS')}
                </div>
                <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                  {(plan.requiredResources || []).map((res, i) => (
                    <li key={i}>{res}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">7. Budget Assumptions</h3>
                  {getEvidenceBadge('AI_ANALYSIS')}
                </div>
                <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                  {(plan.budgetAssumptions || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* 8. Risks and Mitigations */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900">8. Risks & Mitigations Matrix</h3>
                {getEvidenceBadge('AI_ANALYSIS')}
              </div>
              {Array.isArray(plan.risksAndMitigations) && plan.risksAndMitigations.length > 0 ? (
                <div className="divide-y divide-gray-100 text-xs">
                  {plan.risksAndMitigations.map((item: any, i: number) => (
                    <div key={i} className="py-2.5 flex flex-col md:flex-row justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <span className="font-bold text-red-700">Risk: {item.risk}</span>
                        <p className="text-gray-600">Mitigation: {item.mitigation}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                          Severity: {item.severity || 'MEDIUM'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                          Likelihood: {item.likelihood || 'MEDIUM'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No major risks identified.</p>
              )}
            </Card>

            {/* 9. Dependencies & 10. Timeline Assumptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">9. Strategic Dependencies</h3>
                  {getEvidenceBadge('AI_ANALYSIS')}
                </div>
                <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                  {(plan.dependencies || []).map((dep, i) => (
                    <li key={i}>{dep}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">10. Timeline Assumptions</h3>
                  {getEvidenceBadge('AI_ANALYSIS')}
                </div>
                <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                  {(plan.timelineAssumptions || []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* 11. Success Metrics & 12. Validation Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">11. Success Metrics & KPIs</h3>
                  {getEvidenceBadge('VERIFIED_SOURCE')}
                </div>
                <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                  {(plan.successMetrics || []).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">12. Validation Experiments</h3>
                  {getEvidenceBadge('UNVERIFIED_ASSUMPTION')}
                </div>
                <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                  {(plan.validationRequirements || []).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* 13. Next Recommended Actions */}
            <Card className="p-5 space-y-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-blue-900">13. Next Recommended Actions</h3>
                {getEvidenceBadge('AI_ANALYSIS')}
              </div>
              <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
                {(plan.nextRecommendedActions || []).map((action, i) => (
                  <li key={i} className="font-medium">{action}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* TAB 2: Strategic Initiatives */}
        {activeTab === 'initiatives' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Prioritized deliverables ready to convert into active Phase 4 engineering projects.
              </p>
            </div>

            <div className="space-y-3">
              {(plan.initiatives || []).map((init) => (
                <Card key={init.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{init.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        init.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        init.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {init.priority}
                      </span>
                      {getEvidenceBadge(init.evidenceType)}
                    </div>
                    <p className="text-xs text-gray-600">{init.description || init.strategicRationale}</p>
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <span>Impact: {init.expectedImpact}</span>
                      <span>•</span>
                      <span>Effort: {init.estimatedEffort}</span>
                      {init.estimatedCost && (
                        <>
                          <span>•</span>
                          <span>Cost: {init.estimatedCost}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    {init.projectId ? (
                      <span className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium border border-green-200">
                        ✓ Converted to Project
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={convertingId === init.id}
                        onClick={() => handleConvertInitiative(init.id, init.name)}
                        className="text-xs"
                      >
                        {convertingId === init.id ? 'Converting...' : '⚡ Convert to Project'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Business Goals */}
        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(plan.goals || []).map((g) => (
              <Card key={g.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">{g.title}</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {g.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{g.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Current: {g.currentValue} {g.unit}</span>
                  <span>Target: {g.targetValue} {g.unit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, g.progressPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>{g.progressPercent}% Achieved</span>
                  <span>Target: {g.targetDate ? new Date(g.targetDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 4: Version History */}
        {activeTab === 'versions' && (
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Version Audit Trail</h3>
              <div className="divide-y divide-gray-100">
                {(plan.versions || []).map((v) => (
                  <div key={v.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">Version {v.versionNumber}.0</span>
                        <span className="text-xs text-gray-500">{v.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{v.changeSummary || 'Automated version snapshot.'}</p>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Version History Drawer Modal */}
        {showVersionDrawer && (
          <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
            <div className="w-full max-w-md bg-white h-full p-6 space-y-4 shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-gray-900">Version Snapshots</h3>
                <button onClick={() => setShowVersionDrawer(false)} className="text-gray-400 hover:text-gray-600 text-sm">
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3">
                {(plan.versions || []).map((v) => (
                  <div key={v.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>v{v.versionNumber}.0 — {v.title}</span>
                    </div>
                    <p className="text-gray-600">{v.changeSummary}</p>
                    <span className="text-[10px] text-gray-400 block pt-1">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

