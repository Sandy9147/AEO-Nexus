'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { StrategicPlanDto } from '@aeo-nexus/contracts';

export default function StrategiesListPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StrategicPlanDto[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [workspaceId, setWorkspaceId] = useState('');

  const loadPlans = (wsId: string, status?: string, searchQuery?: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    let url = `${apiUrl}/workspaces/${wsId}/plan/strategies?`;
    if (status && status !== 'ALL') url += `status=${status}&`;
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPlans(data))
      .catch((err) => console.error('Failed to load plans:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    setWorkspaceId(wsId);
    loadPlans(wsId, statusFilter, search);
  }, []);

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    loadPlans(workspaceId, status, search);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    loadPlans(workspaceId, statusFilter, e.target.value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
        return <Badge variant="success">{status}</Badge>;
      case 'READY_FOR_REVIEW':
        return <Badge variant="primary">Ready For Review</Badge>;
      case 'GENERATING':
        return <Badge variant="primary">Generating...</Badge>;
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'ARCHIVED':
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Strategic Business Plans</h1>
            <p className="text-sm text-gray-500">
              Formally structured, AI-generated, and human-approved business plans with evidence attribution.
            </p>
          </div>
          <Link href="/plan/strategies/new">
            <Button variant="primary" size="sm">
              + Generate New Plan
            </Button>
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {['ALL', 'READY_FOR_REVIEW', 'APPROVED', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                onClick={() => handleFilterChange(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search plans by title or market..."
              value={search}
              onChange={handleSearchChange}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading strategic plans...</div>
        ) : plans.length === 0 ? (
          <Card className="py-16 text-center">
            <span className="text-4xl">📋</span>
            <h3 className="text-base font-bold text-gray-900 mt-3">No Strategic Plans Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Get started by launching our AI Business Strategy Generator.
            </p>
            <Link href="/plan/strategies/new">
              <Button variant="primary" size="sm">
                Create First Plan
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <Card key={p.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                      {p.planType}
                    </span>
                    {getStatusBadge(p.status)}
                  </div>

                  <div>
                    <Link href={`/plan/strategies/${p.id}`} className="font-bold text-gray-900 hover:text-blue-600 text-base">
                      {p.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {p.executiveSummary || p.currentSituation || 'Strategic plan draft generated by AEO Nexus.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Horizon</span>
                      <span className="font-medium text-gray-700">{p.horizonMonths} Months</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Version</span>
                      <span className="font-medium text-gray-700">v{p.currentVersionNumber}.0</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Confidence</span>
                      <span className="font-medium text-gray-700">{Math.round((p.confidenceScore || 0.85) * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Stage</span>
                      <span className="font-medium text-gray-700">{p.businessStage || 'Growth'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                  <Link href={`/plan/strategies/${p.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Open Workspace →
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
