'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { AudienceProfileDto } from '@aeo-nexus/contracts';

export default function AudiencePage() {
  const [profiles, setProfiles] = useState<AudienceProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfile, setNewProfile] = useState({
    segmentName: '',
    idealCustomerProfile: '',
    demographics: '',
    painPoints: '',
    needs: '',
    buyingMotivations: '',
    objections: '',
  });

  const fetchProfiles = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/audience`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProfiles(data))
      .catch((err) => console.error('Failed to load audience profiles:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/audience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          segmentName: newProfile.segmentName,
          idealCustomerProfile: newProfile.idealCustomerProfile,
          demographics: newProfile.demographics,
          painPoints: newProfile.painPoints.split(',').map((s) => s.trim()).filter(Boolean),
          needs: newProfile.needs.split(',').map((s) => s.trim()).filter(Boolean),
          buyingMotivations: newProfile.buyingMotivations.split(',').map((s) => s.trim()).filter(Boolean),
          objections: newProfile.objections.split(',').map((s) => s.trim()).filter(Boolean),
          isAiGenerated: false,
        }),
      });
      setShowAddModal(false);
      setNewProfile({
        segmentName: '',
        idealCustomerProfile: '',
        demographics: '',
        painPoints: '',
        needs: '',
        buyingMotivations: '',
        objections: '',
      });
      fetchProfiles();
    } catch (err) {
      console.error('Failed to create audience profile:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this audience profile?')) return;
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/audience/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProfiles();
    } catch (err) {
      console.error('Failed to delete audience profile:', err);
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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Audience & Ideal Customer Profiles (ICP)</h1>
            <p className="text-sm text-gray-500">
              Map target customer segments, acute friction points, buying motivations, and journey friction.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add ICP Profile
          </Button>
        </div>

        {/* Data Integrity Alert */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2">
          <span>👥</span>
          <span>
            <strong>Transparency Notice:</strong> All AI-generated customer personas are clearly identified to prevent synthetic personas from being mistaken for verified customer interviews or surveyed panels.
          </span>
        </div>

        {/* Profiles Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading audience profiles...</div>
        ) : profiles.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-base font-semibold text-gray-900">No audience profiles recorded yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              Run an AI research study or add an ideal customer profile manually.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profiles.map((profile) => (
              <Card key={profile.id} className="p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{profile.segmentName}</h3>
                      {profile.demographics && (
                        <p className="text-xs text-gray-500 mt-0.5">{profile.demographics}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={profile.isAiGenerated ? 'warning' : 'success'}>
                        {profile.isAiGenerated ? 'AI Generated Persona' : 'Surveyed ICP'}
                      </Badge>
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="text-gray-400 hover:text-red-600 transition text-sm"
                        title="Delete Profile"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {profile.idealCustomerProfile && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-700 mt-3 leading-relaxed">
                      <span className="font-semibold block mb-0.5 text-gray-900">Ideal Customer Profile:</span>
                      {profile.idealCustomerProfile}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                    <div>
                      <span className="font-semibold text-red-800 block mb-1">Pain Points & Friction:</span>
                      <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                        {profile.painPoints.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-800 block mb-1">Buying Motivations:</span>
                      <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                        {profile.buyingMotivations.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {profile.objections.length > 0 && (
                    <div className="mt-3 text-xs">
                      <span className="font-semibold text-amber-800 block mb-1">Key Objections:</span>
                      <div className="flex flex-wrap gap-1">
                        {profile.objections.map((o, idx) => (
                          <span key={idx} className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                            "{o}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                  Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
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
                <h3 className="text-lg font-bold text-gray-900">Add Customer Audience Profile</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Segment Name *</label>
                  <input
                    type="text"
                    required
                    value={newProfile.segmentName}
                    onChange={(e) => setNewProfile({ ...newProfile, segmentName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. Early-stage B2B Founders"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Demographics / Firmographics</label>
                  <input
                    type="text"
                    value={newProfile.demographics}
                    onChange={(e) => setNewProfile({ ...newProfile, demographics: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="Seed to Series A startups, 5-50 employees, North America"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Ideal Customer Profile (ICP) Narrative</label>
                  <textarea
                    rows={2}
                    value={newProfile.idealCustomerProfile}
                    onChange={(e) => setNewProfile({ ...newProfile, idealCustomerProfile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Pain Points (comma separated)</label>
                  <input
                    type="text"
                    value={newProfile.painPoints}
                    onChange={(e) => setNewProfile({ ...newProfile, painPoints: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="Declining search traffic, High customer acquisition cost, Fragmented tools"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Buying Motivations (comma separated)</label>
                  <input
                    type="text"
                    value={newProfile.buyingMotivations}
                    onChange={(e) => setNewProfile({ ...newProfile, buyingMotivations: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="Growth predictability, Automation of manual tasks, Executive time savings"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Objections (comma separated)</label>
                  <input
                    type="text"
                    value={newProfile.objections}
                    onChange={(e) => setNewProfile({ ...newProfile, objections: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="Implementation time, Tool fatigue, Budget constraints"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Save Profile
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
