'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { StrategicRoadmapDto } from '@aeo-nexus/contracts';

export default function RoadmapsPage() {
  const [loading, setLoading] = useState(true);
  const [roadmaps, setRoadmaps] = useState<StrategicRoadmapDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [viewMode, setViewMode] = useState<'phases' | 'list'>('phases');

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);

    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/roadmaps`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRoadmaps(data))
      .catch((err) => console.error('Failed to load roadmaps:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/plan" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Plan Overview
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Strategic Roadmaps</h1>
            <p className="text-sm text-gray-500">
              Multi-phase execution roadmaps, milestone scheduling, and progressive delivery horizons.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('phases')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                viewMode === 'phases' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Phases View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                viewMode === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Milestones View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading roadmaps...</div>
        ) : roadmaps.length === 0 ? (
          <Card className="py-16 text-center">
            <span className="text-4xl">🗺️</span>
            <h3 className="text-base font-bold text-gray-900 mt-3">No Roadmaps Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Generate a strategic plan to automatically construct multi-phase execution roadmaps.
            </p>
            <Link href="/plan/strategies/new">
              <Button variant="primary" size="sm">
                Generate Plan
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-8">
            {roadmaps.map((r) => (
              <Card key={r.id} className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{r.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{r.description || 'Execution roadmap'}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {r.startDate && new Date(r.startDate).toLocaleDateString()} — {r.endDate && new Date(r.endDate).toLocaleDateString()}
                  </div>
                </div>

                {viewMode === 'phases' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {r.phases.map((ph) => (
                      <div key={ph.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Phase {ph.phaseOrder}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {ph.status}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{ph.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ph.description}</p>
                        </div>

                        {/* Milestones in this phase */}
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                            Milestones ({ph.milestones?.length || 0})
                          </span>
                          {ph.milestones && ph.milestones.length > 0 ? (
                            ph.milestones.map((m) => (
                              <div key={m.id} className="p-2 bg-white rounded border border-gray-200 text-xs space-y-1">
                                <div className="flex items-center justify-between font-medium text-gray-800">
                                  <span>{m.title}</span>
                                  {m.isOverdue ? (
                                    <span className="text-[10px] text-red-600 font-bold">Overdue</span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">
                                      {new Date(m.targetDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {m.successCriteria && (
                                  <p className="text-[10px] text-gray-500 line-clamp-1">{m.successCriteria}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No milestones assigned</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 text-xs">
                    {r.phases.flatMap((ph) => ph.milestones || []).map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{m.title}</span>
                            {m.isOverdue && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500">{m.description || m.successCriteria}</p>
                        </div>
                        <span className="text-gray-400">
                          Target: {new Date(m.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

