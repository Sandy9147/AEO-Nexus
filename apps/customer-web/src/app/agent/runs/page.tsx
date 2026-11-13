'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { getApiClient } from '../../../lib/api';
import { AiRunDto } from '@aeo-nexus/contracts';
import { Card, Button, Badge } from '@aeo-nexus/ui';

export default function RunsListPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [runs, setRuns] = useState<AiRunDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!wsId) return;
    setWorkspaceId(wsId);
    loadRuns(wsId);
  }, []);

  const loadRuns = async (wsId: string) => {
    try {
      setLoading(true);
      const api = getApiClient();
      const list = await api.getAiRuns(wsId);
      setRuns(list);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href="/agent" className="hover:text-[#3563F6]">
                AI Business Agent
              </Link>
              <span>/</span>
              <span>Runs & Telemetry</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Execution Runs</h1>
            <p className="text-sm text-gray-500">Audit trail of autonomous agent inferences, tool executions, and token metrics</p>
          </div>
          <Link href="/agent">
            <Button variant="outline" size="sm">
              ← Back to Agent
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading execution runs...</div>
        ) : runs.length === 0 ? (
          <Card className="p-12 text-center bg-gray-50/50">
            <span className="text-3xl mb-2 block">📊</span>
            <h3 className="font-semibold text-gray-800 text-sm">No execution runs recorded</h3>
            <p className="text-xs text-gray-500 mt-1">Initiate a conversation with your agent to view execution telemetry.</p>
          </Card>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Prompt / Task</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Model & Provider</th>
                  <th className="py-3 px-4">Tokens & Cost</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-medium text-gray-900 line-clamp-1">{run.prompt}</span>
                      <span className="text-[11px] text-gray-400 font-mono">ID: {run.id.substring(0, 8)}...</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          run.status === 'COMPLETED'
                            ? 'success'
                            : run.status === 'REQUIRES_APPROVAL'
                            ? 'warning'
                            : run.status === 'FAILED'
                            ? 'outline'
                            : 'primary'
                        }
                        className="text-[10px]"
                      >
                        {run.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-gray-800">{run.model}</div>
                      <div className="text-[11px] text-gray-400 capitalize">{run.provider}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <div>{run.totalTokens.toLocaleString()} tokens</div>
                      <div className="text-[11px] text-gray-400">${run.costUsd.toFixed(4)}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/agent/runs/${run.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                          Inspect →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
