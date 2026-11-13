'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Badge } from '@aeo-nexus/ui';
import { ResearchFindingDto } from '@aeo-nexus/contracts';

export default function MarketTrendsPage() {
  const [trends, setTrends] = useState<ResearchFindingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/market-trends`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTrends(data))
      .catch((err) => console.error('Failed to load market trends:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = trends.filter((t) => {
    if (filter === 'ALL') return true;
    return t.category === filter;
  });

  return (
    <CustomerShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Link href="/discover" className="text-gray-400 hover:text-gray-600 text-sm">
              ← Discover
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Market & Industry Trends</h1>
          <p className="text-sm text-gray-500">
            Synthesized industry signals, buyer shifts, emerging technologies, and threat vectors gathered across your research studies.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {['ALL', 'TREND', 'MARKET_DEMAND', 'THREAT'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filter === cat
                  ? 'bg-[#3563F6] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading market trends...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">📈</div>
            <h3 className="text-base font-semibold text-gray-900">No trend signals recorded yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              Launch an AI research study focusing on market opportunities and industry trends to populate this view.
            </p>
            <Link href="/discover/research/new?objective=TRENDS" className="inline-block mt-4 text-xs font-semibold text-[#3563F6]">
              Launch Trends Study →
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((trend) => (
              <Card key={trend.id} className="p-5 border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {trend.category.replace('_', ' ')}
                  </span>
                  <Badge variant={trend.confidenceLevel === 'HIGH' ? 'success' : 'primary'}>
                    {trend.confidenceLevel}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-gray-900">{trend.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{trend.description}</p>

                {trend.evidenceDetails && (
                  <div className="p-2.5 bg-gray-50 rounded text-xs text-gray-700 border border-gray-100">
                    <span className="font-semibold text-gray-900">Signal Evidence:</span> {trend.evidenceDetails}
                  </div>
                )}

                {(trend.risks || trend.recommendations) && (
                  <div className="pt-2 border-t border-gray-100 text-xs space-y-1">
                    {trend.risks && (
                      <div className="text-red-700">
                        <span className="font-semibold">Risk:</span> {trend.risks}
                      </div>
                    )}
                    {trend.recommendations && (
                      <div className="text-emerald-700">
                        <span className="font-semibold">Recommendation:</span> {trend.recommendations}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>Detected: {new Date(trend.createdAt).toLocaleDateString()}</span>
                  <Link href={`/discover/research/${trend.researchId}`} className="text-[#3563F6] hover:underline">
                    View Study →
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
