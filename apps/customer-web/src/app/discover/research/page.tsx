'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { ResearchProjectDto } from '@aeo-nexus/contracts';

export default function DiscoverResearchListPage() {
  const [researchList, setResearchList] = useState<ResearchProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchResearch = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/discover/research`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setResearchList(data))
      .catch((err) => console.error('Failed to load research:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResearch();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this research study?')) return;

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/research/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchResearch();
    } catch (err) {
      console.error('Failed to delete research:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'RUNNING':
        return <Badge variant="primary">Running</Badge>;
      case 'FAILED':
        return <Badge variant="warning">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="secondary">Queued</Badge>;
    }
  };

  const filtered = researchList.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.industry && r.industry.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <CustomerShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/discover" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Discover
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Research Studies</h1>
            <p className="text-sm text-gray-500">
              Manage your AI market discovery studies, competitor benchmarks, and opportunity evaluations.
            </p>
          </div>
          <Link href="/discover/research/new">
            <Button variant="primary" size="sm">
              + New Research Study
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search research studies by title, topic, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
          />
          <div className="flex items-center gap-1 overflow-x-auto">
            {['ALL', 'COMPLETED', 'RUNNING', 'PENDING', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === st
                    ? 'bg-[#3563F6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading research studies...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="text-base font-semibold text-gray-900">No research studies found</h3>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new AI research study to analyze your market.'}
            </p>
            <Link href="/discover/research/new" className="inline-block mt-4">
              <Button variant="primary" size="sm">Launch New Study</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((item) => (
              <Link key={item.id} href={`/discover/research/${item.id}`} className="block group">
                <Card className="p-5 border border-gray-200 hover:border-[#3563F6] transition shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 group-hover:text-[#3563F6] text-base">
                          {item.title}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        Topic: <span className="font-medium text-gray-800">{item.topic}</span>
                        {item.industry && ` • Industry: ${item.industry}`}
                        {item.targetCountry && ` • Country: ${item.targetCountry}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Confidence: {Math.round(item.confidenceScore * 100)}%</span>
                        <span>•</span>
                        <span>Tokens: {item.tokensUsed.toLocaleString()}</span>
                        <span>•</span>
                        <span>{item.findingsCount ?? 0} Findings</span>
                        <span>•</span>
                        <span>{item.opportunitiesCount ?? 0} Opportunities</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <span className="text-xs text-[#3563F6] font-medium group-hover:underline">
                        View Study →
                      </span>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition"
                        title="Delete Study"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
