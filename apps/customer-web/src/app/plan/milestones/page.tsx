'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { RoadmapMilestoneDto } from '@aeo-nexus/contracts';

export default function MilestonesPage() {
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<RoadmapMilestoneDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'UPCOMING'>('ALL');

  const loadMilestones = (wsId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/milestones`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMilestones(data))
      .catch((err) => console.error('Failed to load milestones:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    loadMilestones(wsId);
  }, []);

  const handleMarkComplete = async (mId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/milestones/${mId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      loadMilestones(workspaceId);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = milestones.filter((m) => {
    if (filter === 'OVERDUE') return m.isOverdue;
    if (filter === 'UPCOMING') return !m.isOverdue && m.status !== 'COMPLETED';
    return true;
  });

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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Milestones & Delivery Deadlines</h1>
            <p className="text-sm text-gray-500">
              Granular milestone tracking with automated overdue alerting and objective success criteria.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'UPCOMING', 'OVERDUE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                  filter === f
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading milestones...</div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center">
            <span className="text-4xl">🚩</span>
            <h3 className="text-base font-bold text-gray-900 mt-3">No Milestones Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              All milestones completed or none match the selected filter.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => (
              <Card
                key={m.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 ${
                  m.status === 'COMPLETED'
                    ? 'border-l-green-500'
                    : m.isOverdue
                    ? 'border-l-red-500'
                    : 'border-l-blue-500'
                }`}
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{m.title}</span>
                    {m.status === 'COMPLETED' ? (
                      <Badge variant="success">Completed</Badge>
                    ) : m.isOverdue ? (
                      <Badge variant="warning">Overdue</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                  {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
                  {m.successCriteria && (
                    <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                      <span className="font-semibold">Criteria: </span>{m.successCriteria}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="text-gray-400 block text-[10px]">Target Date</span>
                    <span className={`font-semibold ${m.isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {new Date(m.targetDate).toLocaleDateString()}
                    </span>
                  </div>

                  {m.status !== 'COMPLETED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleMarkComplete(m.id)}
                    >
                      ✓ Mark Complete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

