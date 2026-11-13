'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { BusinessGoalDto } from '@aeo-nexus/contracts';

export default function GoalsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<BusinessGoalDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<BusinessGoalDto | null>(null);
  const [newProgressValue, setNewProgressValue] = useState<number>(0);
  const [progressNote, setProgressNote] = useState('');
  const [submittingProgress, setSubmittingProgress] = useState(false);

  const loadGoals = (wsId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/goals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGoals(data))
      .catch((err) => console.error('Failed to load goals:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    loadGoals(wsId);
  }, []);

  const handleRecordProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    setSubmittingProgress(true);
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/goals/${selectedGoal.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newValue: Number(newProgressValue),
          note: progressNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSelectedGoal(null);
        setProgressNote('');
        loadGoals(workspaceId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingProgress(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Business Goals & Key Results</h1>
            <p className="text-sm text-gray-500">
              Track quantitative metrics and qualitative business milestones with historical verification audit logs.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading business goals...</div>
        ) : goals.length === 0 ? (
          <Card className="py-16 text-center">
            <span className="text-4xl">🎯</span>
            <h3 className="text-base font-bold text-gray-900 mt-3">No Business Goals Configured</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Goals are automatically created and calibrated when you generate a strategic plan.
            </p>
            <Link href="/plan/strategies/new">
              <Button variant="primary" size="sm">
                Generate Plan
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((g) => (
              <Card key={g.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {g.category}
                    </span>
                    <Badge variant={g.status === 'ACHIEVED' ? 'success' : g.status === 'IN_PROGRESS' ? 'primary' : 'outline'}>
                      {g.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{g.title}</h3>
                    {g.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{g.description}</p>}
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span>Current: {g.currentValue} {g.unit}</span>
                      <span>Target: {g.targetValue} {g.unit}</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, g.progressPercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{g.progressPercent}% Achieved</span>
                      <span>Cadence: {g.measurementFrequency}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    Target: {g.targetDate ? new Date(g.targetDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedGoal(g);
                      setNewProgressValue(g.currentValue);
                    }}
                  >
                    + Log Progress
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Progress Update Modal */}
        {selectedGoal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-gray-900">Record Progress</h3>
                <button onClick={() => setSelectedGoal(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>

              <div>
                <p className="font-semibold text-xs text-gray-800">{selectedGoal.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Target: {selectedGoal.targetValue} {selectedGoal.unit}
                </p>
              </div>

              <form onSubmit={handleRecordProgress} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Measured Value ({selectedGoal.unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newProgressValue}
                    onChange={(e) => setNewProgressValue(Number(e.target.value))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Measurement Verification Note
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Verified via Q1 Google Analytics and Perplexity citation audit."
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" type="button" size="sm" onClick={() => setSelectedGoal(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" size="sm" disabled={submittingProgress}>
                    {submittingProgress ? 'Saving...' : 'Save Record'}
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
