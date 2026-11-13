'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { AEOResearchQuestionDto } from '@aeo-nexus/contracts';

export default function AEOResearchPage() {
  const [questions, setQuestions] = useState<AEOResearchQuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    topic: '',
    queryQuestion: '',
    targetIndustry: '',
    expectedPersona: '',
  });

  const fetchQuestions = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/aeo-research`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQuestions(data))
      .catch((err) => console.error('Failed to load AEO questions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/aeo-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newQuestion),
      });
      setShowAddModal(false);
      setNewQuestion({
        topic: '',
        queryQuestion: '',
        targetIndustry: '',
        expectedPersona: '',
      });
      fetchQuestions();
    } catch (err) {
      console.error('Failed to create AEO question:', err);
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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Answer Engine Optimization (AEO) Research</h1>
            <p className="text-sm text-gray-500">
              Audit the queries your prospective customers ask AI search systems (ChatGPT, Perplexity, Gemini) and track citation share.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add Query Question
          </Button>
        </div>

        {/* Governance Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
          <span>🤖</span>
          <span>
            <strong>AEO Measurement Standard:</strong> Live AI search visibility metrics require actual query executions against supported LLM providers. Unmeasured or synthetic evaluations are clearly flagged to prevent misleading visibility scores.
          </span>
        </div>

        {/* Questions Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading AEO research questions...</div>
        ) : questions.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="text-base font-semibold text-gray-900">No AEO queries tracked yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              Add target customer queries or run an AEO Discovery research study to audit your brand's presence in generative search.
            </p>
            <Link href="/discover/research/new?objective=AEO_DISCOVERY" className="inline-block mt-4 text-xs font-semibold text-[#3563F6]">
              Launch AEO Discovery Study →
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id} className="p-5 border border-gray-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{q.topic}</span>
                    {q.targetIndustry && <span className="text-xs text-gray-500">• {q.targetIndustry}</span>}
                  </div>
                  {q.expectedPersona && (
                    <span className="text-xs text-gray-500 font-medium">Persona: {q.expectedPersona}</span>
                  )}
                </div>

                <div className="text-base font-bold text-gray-900">
                  Customer Prompt: <span className="text-[#3563F6]">"{q.queryQuestion}"</span>
                </div>

                {q.results && q.results.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-700">Answer Engine Findings:</div>
                    {q.results.map((r) => (
                      <div key={r.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1.5 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              Brand Mentioned: {r.brandMentioned ? '✅ Yes' : '❌ No'}
                            </span>
                            {r.brandRank && (
                              <Badge variant="primary">Rank #{r.brandRank}</Badge>
                            )}
                            <Badge variant={r.isActualMeasurement ? 'success' : 'outline'}>
                              {r.isActualMeasurement ? 'Live Measured' : 'Simulated Audit'}
                            </Badge>
                          </div>
                          <span className="text-gray-400 text-[11px]">{r.provider} / {r.model}</span>
                        </div>

                        {r.rawAnswerExcerpt && (
                          <p className="text-gray-600 italic">"{r.rawAnswerExcerpt}"</p>
                        )}

                        {r.competitorsMentioned.length > 0 && (
                          <div className="text-[11px] text-gray-500">
                            Competitors Cited: <span className="font-medium text-gray-700">{r.competitorsMentioned.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pt-2 text-xs text-gray-400 italic">
                    No LLM evaluation runs executed yet for this question.
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Add AEO Query Question</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Search Topic *</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.topic}
                    onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. Answer Engine Optimization"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Customer Query Question *</label>
                  <textarea
                    required
                    rows={2}
                    value={newQuestion.queryQuestion}
                    onChange={(e) => setNewQuestion({ ...newQuestion, queryQuestion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. What are the best software platforms for automated business workflows in 2026?"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Target Industry</label>
                  <input
                    type="text"
                    value={newQuestion.targetIndustry}
                    onChange={(e) => setNewQuestion({ ...newQuestion, targetIndustry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. B2B SaaS"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-900 mb-1">Expected Persona</label>
                  <input
                    type="text"
                    value={newQuestion.expectedPersona}
                    onChange={(e) => setNewQuestion({ ...newQuestion, expectedPersona: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs"
                    placeholder="e.g. CMO, Head of Growth"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Save Question
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
