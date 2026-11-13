'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { CompetitorDto } from '@aeo-nexus/contracts';

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<CompetitorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newComp, setNewComp] = useState({
    name: '',
    website: '',
    industry: '',
    description: '',
    productsServices: '',
    positioning: '',
    pricingObservations: '',
    contentObservations: '',
    strengths: '',
    weaknesses: '',
    differentiationOpportunities: '',
    isVerified: false,
  });

  const fetchCompetitors = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/competitors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCompetitors(data))
      .catch((err) => console.error('Failed to load competitors:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/competitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newComp,
          strengths: newComp.strengths.split(',').map((s) => s.trim()).filter(Boolean),
          weaknesses: newComp.weaknesses.split(',').map((w) => w.trim()).filter(Boolean),
          evidenceType: 'USER_INPUT',
        }),
      });
      setShowAddModal(false);
      setNewComp({
        name: '',
        website: '',
        industry: '',
        description: '',
        productsServices: '',
        positioning: '',
        pricingObservations: '',
        contentObservations: '',
        strengths: '',
        weaknesses: '',
        differentiationOpportunities: '',
        isVerified: false,
      });
      fetchCompetitors();
    } catch (err) {
      console.error('Failed to create competitor:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this competitor profile?')) return;
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/competitors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompetitors();
    } catch (err) {
      console.error('Failed to delete competitor:', err);
    }
  };

  const getEvidenceBadge = (ev: string, verified: boolean) => {
    if (verified) {
      return <Badge variant="success">Verified Fact</Badge>;
    }
    switch (ev) {
      case 'USER_INPUT':
        return <Badge variant="primary">User Provided</Badge>;
      case 'UNVERIFIED_ASSUMPTION':
        return <Badge variant="warning">Assumption</Badge>;
      case 'AI_ANALYSIS':
      default:
        return <Badge variant="outline">AI Analysis</Badge>;
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Competitor Intelligence Matrix</h1>
            <p className="text-sm text-gray-500">
              Benchmark market rivals, analyze capabilities and positioning, and identify differentiation opportunities.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add Competitor
          </Button>
        </div>

        {/* Governance Notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
          <span>⚖️</span>
          <span>
            <strong>Data Integrity Standard:</strong> AEO Nexus strictly distinguishes between verified source facts and AI analysis. Unverified assumptions are clearly labeled, and financial or private metrics are never synthesized or fabricated.
          </span>
        </div>

        {/* Competitor Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading competitor matrix...</div>
        ) : competitors.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">⚔️</div>
            <h3 className="text-base font-semibold text-gray-900">No competitors tracked yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              Add a competitor manually or run an AI research study to benchmark your rivals.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {competitors.map((comp) => (
              <Card key={comp.id} className="p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{comp.name}</h3>
                      {comp.website && (
                        <a
                          href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#3563F6] hover:underline"
                        >
                          {comp.website} ↗
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getEvidenceBadge(comp.evidenceType, comp.isVerified)}
                      <button
                        onClick={() => handleDelete(comp.id)}
                        className="text-gray-400 hover:text-red-600 transition text-sm"
                        title="Delete Competitor"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {comp.description && (
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{comp.description}</p>
                  )}

                  {comp.positioning && (
                    <div className="text-xs text-gray-700 mt-2">
                      <span className="font-semibold">Positioning:</span> {comp.positioning}
                    </div>
                  )}

                  {comp.productsServices && (
                    <div className="text-xs text-gray-700 mt-1">
                      <span className="font-semibold">Products / Services:</span> {comp.productsServices}
                    </div>
                  )}

                  {comp.strengths.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-semibold text-emerald-800 block mb-1">Strengths:</span>
                      <div className="flex flex-wrap gap-1">
                        {comp.strengths.map((s, idx) => (
                          <span key={idx} className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                            + {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comp.weaknesses.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-red-800 block mb-1">Weaknesses & Gaps:</span>
                      <div className="flex flex-wrap gap-1">
                        {comp.weaknesses.map((w, idx) => (
                          <span key={idx} className="text-[11px] bg-red-50 text-red-800 px-2 py-0.5 rounded">
                            - {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comp.differentiationOpportunities && (
                    <div className="p-3 bg-blue-50 text-blue-900 text-xs rounded-lg border border-blue-100 mt-3">
                      <span className="font-semibold block mb-0.5">Differentiation Opportunity:</span>
                      {comp.differentiationOpportunities}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                  Last updated: {new Date(comp.updatedAt).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full p-6 bg-white space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Add Competitor Profile</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Competitor Name *</label>
                  <input
                    type="text"
                    required
                    value={newComp.name}
                    onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={newComp.website}
                    onChange={(e) => setNewComp({ ...newComp, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Industry / Category</label>
                  <input
                    type="text"
                    value={newComp.industry}
                    onChange={(e) => setNewComp({ ...newComp, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Overview Description</label>
                  <textarea
                    rows={2}
                    value={newComp.description}
                    onChange={(e) => setNewComp({ ...newComp, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Strengths (comma separated)</label>
                  <input
                    type="text"
                    value={newComp.strengths}
                    onChange={(e) => setNewComp({ ...newComp, strengths: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="Brand recognition, Mobile app, Fast onboarding"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Weaknesses (comma separated)</label>
                  <input
                    type="text"
                    value={newComp.weaknesses}
                    onChange={(e) => setNewComp({ ...newComp, weaknesses: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="High pricing, No AI agents, Rigid schemas"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Our Differentiation Opportunity</label>
                  <textarea
                    rows={2}
                    value={newComp.differentiationOpportunities}
                    onChange={(e) => setNewComp({ ...newComp, differentiationOpportunities: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Save Competitor
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
