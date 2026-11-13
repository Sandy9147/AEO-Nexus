'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { ResearchProjectDto } from '@aeo-nexus/contracts';

export default function DiscoverReportsPage() {
  const [reports, setReports] = useState<ResearchProjectDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReports(data))
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/discover" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Discover
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Executive Research Reports</h1>
            <p className="text-sm text-gray-500">
              Export-ready strategic dossiers synthesizing market demand, competitive analysis, and validation experiments.
            </p>
          </div>
          <Link href="/discover/research/new">
            <Button variant="primary" size="sm">
              + Generate New Report
            </Button>
          </Link>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading executive reports...</div>
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="text-base font-semibold text-gray-900">No completed reports available</h3>
            <p className="text-xs text-gray-500 mt-1">
              Complete an AI research study to generate an executive-ready market intelligence report.
            </p>
            <Link href="/discover/research/new" className="inline-block mt-4">
              <Button variant="primary" size="sm">Launch Study</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <Card key={report.id} className="p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{report.title}</h2>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>Topic: {report.topic}</span>
                      <span>•</span>
                      <span>Completed: {report.completedAt ? new Date(report.completedAt).toLocaleDateString() : '—'}</span>
                      <span>•</span>
                      <span>Confidence: {Math.round(report.confidenceScore * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Completed</Badge>
                    <Link href={`/discover/research/${report.id}`}>
                      <Button variant="outline" size="sm">
                        Full Dossier →
                      </Button>
                    </Link>
                  </div>
                </div>

                {report.executiveSummary && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Executive Summary</div>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
                      {report.executiveSummary}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-500 block">Findings</span>
                    <span className="font-bold text-gray-900 text-sm">{report.findingsCount ?? 0}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-500 block">Opportunities</span>
                    <span className="font-bold text-blue-600 text-sm">{report.opportunitiesCount ?? 0}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-500 block">Competitors</span>
                    <span className="font-bold text-purple-600 text-sm">{report.competitorsCount ?? 0}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-500 block">Sources</span>
                    <span className="font-bold text-emerald-600 text-sm">{report.sourcesCount ?? 0}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

