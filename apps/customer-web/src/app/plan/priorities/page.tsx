'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { StrategicInitiativeDto } from '@aeo-nexus/contracts';

export default function PrioritiesPage() {
  const [loading, setLoading] = useState(true);
  const [initiatives, setInitiatives] = useState<StrategicInitiativeDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadInitiatives = (wsId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/plan/initiatives`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setInitiatives(data))
      .catch((err) => console.error('Failed to load initiatives:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    loadInitiatives(wsId);
  }, []);

  const handleConvert = async (init: StrategicInitiativeDto) => {
    setConvertingId(init.id);
    setMessage(null);
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/plan/initiatives/${init.id}/convert-to-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectName: init.name,
          createInitialTasks: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`Successfully converted "${data.projectName}" into an active Project with ${data.tasksCreated} initial tasks!`);
        loadInitiatives(workspaceId);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setMessage(`Conversion failed: ${errJson.message || 'Unknown error'}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setConvertingId(null);
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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Initiatives & Priorities</h1>
            <p className="text-sm text-gray-500">
              Ranked strategic initiatives evaluated across Impact, Effort, Risk, and Technical Dependencies.
            </p>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-blue-600 font-bold ml-4">✕</button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading initiatives...</div>
        ) : initiatives.length === 0 ? (
          <Card className="py-16 text-center">
            <span className="text-4xl">🚀</span>
            <h3 className="text-base font-bold text-gray-900 mt-3">No Initiatives Defined</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Initiatives are formulated automatically based on Discover market research and your strategic plan.
            </p>
            <Link href="/plan/strategies/new">
              <Button variant="primary" size="sm">
                Generate Plan
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {initiatives.map((init) => (
              <Card key={init.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-gray-900">{init.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      init.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      init.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {init.priority}
                    </span>
                    <span className="text-xs text-gray-400">
                      Status: {init.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    {init.description || init.strategicRationale}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                      Impact: {init.expectedImpact}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                      Effort: {init.estimatedEffort}
                    </span>
                    {init.estimatedCost && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                        Budget: {init.estimatedCost}
                      </span>
                    )}
                    {init.dependencies && init.dependencies.length > 0 && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        🔗 {init.dependencies.length} Dependencies
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {init.projectId ? (
                    <div className="text-right">
                      <span className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-semibold border border-green-200 block">
                        ✓ In Active Engineering
                      </span>
                      <Link href={`/projects`} className="text-[11px] text-blue-600 hover:underline mt-1 block">
                        Open Project →
                      </Link>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={convertingId === init.id}
                      onClick={() => handleConvert(init)}
                      className="text-xs whitespace-nowrap"
                    >
                      {convertingId === init.id ? 'Converting...' : '⚡ Convert to Project'}
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
