'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { getApiClient } from '../../../../lib/api';
import { AiRunDetailDto } from '@aeo-nexus/contracts';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@aeo-nexus/ui';

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [run, setRun] = useState<AiRunDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!wsId || !runId) return;
    setWorkspaceId(wsId);
    loadRun(wsId, runId);
  }, [runId]);

  const loadRun = async (wsId: string, id: string) => {
    try {
      setLoading(true);
      const api = getApiClient();
      const data = await api.getAiRun(wsId, id);
      setRun(data);
    } catch (err) {
      console.error('Failed to load run:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CustomerShell>
        <div className="p-12 text-center text-sm text-gray-400">Loading execution run telemetry...</div>
      </CustomerShell>
    );
  }

  if (!run) {
    return (
      <CustomerShell>
        <div className="p-12 text-center">
          <p className="text-gray-700">Execution run not found.</p>
          <Link href="/agent/runs">
            <Button className="mt-4" size="sm">Back to Runs</Button>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href="/agent" className="hover:text-[#3563F6]">
                AI Business Agent
              </Link>
              <span>/</span>
              <Link href="/agent/runs" className="hover:text-[#3563F6]">
                Runs
              </Link>
              <span>/</span>
              <span className="font-mono">{run.id.substring(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Run Execution Trace</h1>
            <p className="text-sm text-gray-500">Step-by-step audit of reasoning, tool calls, and model telemetry</p>
          </div>
          <Link href="/agent/runs">
            <Button variant="outline" size="sm">
              ← Back to Runs
            </Button>
          </Link>
        </div>

        {/* Overview Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Status</span>
            <div className="mt-1">
              <Badge
                variant={
                  run.status === 'COMPLETED'
                    ? 'success'
                    : run.status === 'REQUIRES_APPROVAL'
                    ? 'warning'
                    : 'outline'
                }
              >
                {run.status}
              </Badge>
            </div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Model</span>
            <div className="font-semibold text-sm text-gray-900 mt-1">{run.model}</div>
            <span className="text-[10px] text-gray-400 uppercase">{run.provider}</span>
          </Card>
          <Card className="p-4 bg-white border border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Tokens Used</span>
            <div className="font-semibold text-sm text-gray-900 mt-1">{run.totalTokens.toLocaleString()}</div>
            <span className="text-[10px] text-gray-400 font-mono">
              In: {run.promptTokens} | Out: {run.completionTokens}
            </span>
          </Card>
          <Card className="p-4 bg-white border border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Estimated Cost</span>
            <div className="font-semibold text-sm text-gray-900 mt-1">${run.costUsd.toFixed(5)}</div>
            <span className="text-[10px] text-gray-400">Published model rates</span>
          </Card>
        </div>

        {/* Prompt Card */}
        <Card className="border border-gray-200">
          <CardHeader className="p-4 pb-2 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Input Prompt</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-sm text-gray-900 whitespace-pre-wrap font-mono bg-white">
            {run.prompt}
          </CardContent>
        </Card>

        {/* Execution Steps Timeline */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900">Execution Timeline & Steps</h2>
          {run.steps && run.steps.length > 0 ? (
            <div className="space-y-3">
              {run.steps.map((step, idx) => (
                <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-[#3563F6] font-bold text-xs flex items-center justify-center">
                        {step.stepNumber}
                      </span>
                      <span className="font-semibold text-xs text-gray-900 font-mono">{step.type}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700 pl-8">{step.description}</p>
                  {Boolean(step.output) && (
                    <div className="pl-8 pt-1">
                      <pre className="text-[10px] bg-gray-50 border border-gray-200 rounded p-2 text-gray-700 overflow-x-auto">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No multi-step telemetry logged for this run.</p>
          )}
        </div>

        {/* Approvals in this Run */}
        {run.approvals && run.approvals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">Linked Human Approvals</h2>
            {run.approvals.map((approval) => (
              <Card key={approval.id} className="p-4 border-amber-200 bg-amber-50/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-amber-950">{approval.title}</h4>
                    <p className="text-xs text-amber-800">{approval.description}</p>
                  </div>
                  <Badge variant={approval.status === 'APPROVED' ? 'success' : approval.status === 'REJECTED' ? 'outline' : 'warning'}>
                    {approval.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
