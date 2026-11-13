'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { MarketOpportunityDto } from '@aeo-nexus/contracts';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<MarketOpportunityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOpp, setNewOpp] = useState({
    title: '',
    description: '',
    customerProblem: '',
    marketDemandEvidence: '',
    differentiation: '',
    suggestedExperiment: '',
    confidenceLevel: 'MEDIUM',
  });

  const fetchOpportunities = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/opportunities`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setOpportunities(data))
      .catch((err) => console.error('Failed to load opportunities:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/opportunities/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOpportunities();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newOpp,
          evidenceType: 'USER_INPUT',
        }),
      });
      setShowAddModal(false);
      setNewOpp({
        title: '',
        description: '',
        customerProblem: '',
        marketDemandEvidence: '',
        differentiation: '',
        suggestedExperiment: '',
        confidenceLevel: 'MEDIUM',
      });
      fetchOpportunities();
    } catch (err) {
      console.error('Failed to create opportunity:', err);
    }
  };

  const filtered = opportunities.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Market Opportunity Engine</h1>
            <p className="text-sm text-gray-500">
              Track, score, and validate high-probability market opportunities backed by customer demand signals and experiments.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add Opportunity
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {['ALL', 'DISCOVERED', 'VALIDATING', 'PURSUED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === st
                  ? 'bg-[#3563F6] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st} ({st === 'ALL' ? opportunities.length : opportunities.filter((o) => o.status === st).length})
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading market opportunities...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">💡</div>
            <h3 className="text-base font-semibold text-gray-900">No opportunities recorded</h3>
            <p className="text-xs text-gray-500 mt-1">
              Launch a Discover Research study or add an opportunity manually to validate product demand.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((opp) => (
              <Card key={opp.id} className="p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">{opp.title}</h3>
                    <Badge variant={opp.confidenceLevel === 'HIGH' ? 'success' : 'primary'}>
                      {opp.confidenceLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{opp.description}</p>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="p-2.5 bg-red-50/70 rounded border border-red-100">
                      <span className="font-semibold text-red-900">Problem:</span> {opp.customerProblem}
                    </div>
                    <div className="p-2.5 bg-blue-50/70 rounded border border-blue-100">
                      <span className="font-semibold text-blue-900">Demand Evidence:</span> {opp.marketDemandEvidence}
                    </div>
                    <div className="p-2.5 bg-emerald-50/70 rounded border border-emerald-100">
                      <span className="font-semibold text-emerald-900">Differentiation:</span> {opp.differentiation}
                    </div>
                    <div className="p-2.5 bg-purple-50/70 rounded border border-purple-100">
                      <span className="font-semibold text-purple-900">Validation Experiment:</span> {opp.suggestedExperiment}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Status: <span className="font-semibold text-gray-800">{opp.status}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {opp.status !== 'VALIDATING' && (
                      <button
                        onClick={() => handleStatusChange(opp.id, 'VALIDATING')}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium text-[11px]"
                      >
                        Start Validating
                      </button>
                    )}
                    {opp.status !== 'PURSUED' && (
                      <button
                        onClick={() => handleStatusChange(opp.id, 'PURSUED')}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-medium text-[11px]"
                      >
                        Pursue
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Add Market Opportunity</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Opportunity Title *</label>
                  <input
                    type="text"
                    required
                    value={newOpp.title}
                    onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. Turnkey Answer Engine Diagnostic API"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Overview Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={newOpp.description}
                    onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Customer Problem *</label>
                  <textarea
                    required
                    rows={2}
                    value={newOpp.customerProblem}
                    onChange={(e) => setNewOpp({ ...newOpp, customerProblem: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Market Demand Evidence *</label>
                  <textarea
                    required
                    rows={2}
                    value={newOpp.marketDemandEvidence}
                    onChange={(e) => setNewOpp({ ...newOpp, marketDemandEvidence: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Differentiation Advantage *</label>
                  <input
                    type="text"
                    required
                    value={newOpp.differentiation}
                    onChange={(e) => setNewOpp({ ...newOpp, differentiation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Suggested Validation Experiment *</label>
                  <input
                    type="text"
                    required
                    value={newOpp.suggestedExperiment}
                    onChange={(e) => setNewOpp({ ...newOpp, suggestedExperiment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Save Opportunity
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

