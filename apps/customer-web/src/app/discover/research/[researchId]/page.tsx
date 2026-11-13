'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, Button, Badge } from '@aeo-nexus/ui';
import { ResearchDetailDto } from '@aeo-nexus/contracts';

export default function ResearchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const researchId = params.researchId as string;

  const [study, setStudy] = useState<ResearchDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'findings' | 'opportunities' | 'competitors' | 'audience' | 'aeo' | 'sources'>('summary');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = () => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/workspaces/${wsId}/discover/research/${researchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStudy(data);
      })
      .catch((err) => console.error('Failed to load research study:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [researchId]);

  // Auto-refresh if running or pending
  useEffect(() => {
    if (study?.status === 'PENDING' || study?.status === 'RUNNING') {
      const timer = setInterval(() => {
        fetchDetail();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [study?.status]);

  const handleRerun = async () => {
    setActionLoading(true);
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/research/${researchId}/rerun`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDetail();
    } catch (err) {
      console.error('Failed to rerun study:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/research/${researchId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDetail();
    } catch (err) {
      console.error('Failed to cancel study:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this research study?')) return;
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/workspaces/${wsId}/discover/research/${researchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/discover/research');
    } catch (err) {
      console.error('Failed to delete study:', err);
    }
  };

  const getStatusBadge = (status?: string) => {
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

  const getEvidenceBadge = (ev: string) => {
    switch (ev) {
      case 'VERIFIED_SOURCE':
        return <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">Verified Source</span>;
      case 'USER_INPUT':
        return <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">User Provided</span>;
      case 'UNVERIFIED_ASSUMPTION':
        return <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">Unverified Assumption</span>;
      case 'AI_ANALYSIS':
      default:
        return <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">AI Analysis</span>;
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-6">
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/discover/research" className="text-gray-400 hover:text-gray-600 text-sm">
              ← All Research Studies
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-gray-900">{study?.title || 'Research Study'}</h1>
              {getStatusBadge(study?.status)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Topic: <span className="font-medium text-gray-700">{study?.topic}</span>
              {study?.industry && ` • Industry: ${study.industry}`}
              {study?.targetCountry && ` • Region: ${study.targetCountry}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition"
            >
              🖨️ Export / Print
            </button>
            {(study?.status === 'PENDING' || study?.status === 'RUNNING') && (
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={actionLoading}>
                Cancel
              </Button>
            )}
            {study?.status === 'COMPLETED' && (
              <Button variant="outline" size="sm" onClick={handleRerun} disabled={actionLoading}>
                🔄 Rerun Study
              </Button>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 transition text-sm"
              title="Delete Study"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Running Banner */}
        {study?.status === 'RUNNING' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <div className="animate-spin text-xl">⚡</div>
            <div className="text-sm text-blue-900">
              <span className="font-semibold">Autonomous Research in Progress...</span> The agent is synthesizing workspace context, evaluating published documents, and querying market signals. This page refreshes automatically.
            </div>
          </div>
        )}

        {/* Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">Confidence Score</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {study ? `${Math.round(study.confidenceScore * 100)}%` : '—'}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Evidence & signal grounded</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">Tokens Consumed</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {study ? study.tokensUsed.toLocaleString() : '—'}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Prompt & completion</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">Opportunities Discovered</div>
            <div className="text-xl font-bold text-blue-600 mt-1">
              {study ? study.opportunities.length : '—'}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Actionable validation tests</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">Competitors Analyzed</div>
            <div className="text-xl font-bold text-purple-600 mt-1">
              {study ? study.competitors.length : '—'}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Benchmarked rivals</div>
          </Card>
        </div>

        {/* Tab Controls */}
        <div className="flex overflow-x-auto gap-2 border-b border-gray-200">
          {[
            { id: 'summary', label: 'Executive Summary', icon: '📄' },
            { id: 'findings', label: `Findings (${study?.findings.length ?? 0})`, icon: '🔍' },
            { id: 'opportunities', label: `Opportunities (${study?.opportunities.length ?? 0})`, icon: '💡' },
            { id: 'competitors', label: `Competitors (${study?.competitors.length ?? 0})`, icon: '⚔️' },
            { id: 'audience', label: `Audience & ICP (${study?.audienceProfiles.length ?? 0})`, icon: '👥' },
            { id: 'aeo', label: `AEO Questions (${study?.aeoQuestions.length ?? 0})`, icon: '🤖' },
            { id: 'sources', label: `Sources (${study?.sources.length ?? 0})`, icon: '📚' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#3563F6] text-[#3563F6]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading research study details...</div>
        ) : (
          <div className="space-y-6">
            {/* 1. Summary */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <Card className="p-6 border border-gray-200">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Executive Summary</h2>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {study?.executiveSummary || 'No executive summary generated yet.'}
                  </div>
                </Card>

                <Card className="p-6 border border-gray-200">
                  <h2 className="text-base font-bold text-gray-900 mb-2">Research Methodology</h2>
                  <p className="text-xs text-gray-500 mb-3">
                    Multi-signal contextual AI research synthesized across your authorized business profile, published knowledge base documents, and structured competitive benchmarking.
                  </p>
                  <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {study?.methodology || 'Generative LLM synthesis with bounded context injection.'}
                  </div>
                </Card>
              </div>
            )}

            {/* 2. Findings */}
            {activeTab === 'findings' && (
              <div className="space-y-4">
                {study?.findings.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No findings recorded for this study.</p>
                ) : (
                  study?.findings.map((finding) => (
                    <Card key={finding.id} className="p-5 border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {finding.category.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-bold text-gray-900">• {finding.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getEvidenceBadge(finding.evidenceType)}
                          <Badge variant={finding.confidenceLevel === 'HIGH' ? 'success' : 'primary'}>
                            {finding.confidenceLevel}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mt-2 leading-relaxed">{finding.description}</p>

                      {finding.evidenceDetails && (
                        <div className="mt-3 p-2.5 bg-gray-50 rounded text-xs text-gray-600 border border-gray-100">
                          <span className="font-semibold text-gray-800">Evidence / Data:</span> {finding.evidenceDetails}
                        </div>
                      )}

                      {(finding.risks || finding.recommendations) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100 text-xs">
                          {finding.risks && (
                            <div className="text-red-700">
                              <span className="font-semibold">Risks:</span> {finding.risks}
                            </div>
                          )}
                          {finding.recommendations && (
                            <div className="text-emerald-700">
                              <span className="font-semibold">Recommendation:</span> {finding.recommendations}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 3. Opportunities */}
            {activeTab === 'opportunities' && (
              <div className="space-y-4">
                {study?.opportunities.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No market opportunities recorded.</p>
                ) : (
                  study?.opportunities.map((opp) => (
                    <Card key={opp.id} className="p-6 border border-gray-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">{opp.title}</span>
                            <Badge variant={opp.confidenceLevel === 'HIGH' ? 'success' : 'primary'}>
                              {opp.confidenceLevel} Confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{opp.description}</p>
                        </div>
                        {getEvidenceBadge(opp.evidenceType)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-gray-100">
                        <div>
                          <span className="font-semibold text-gray-900 block mb-1">Customer Problem:</span>
                          <p className="text-gray-700 bg-red-50/50 p-2.5 rounded border border-red-100">{opp.customerProblem}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block mb-1">Market Demand Evidence:</span>
                          <p className="text-gray-700 bg-blue-50/50 p-2.5 rounded border border-blue-100">{opp.marketDemandEvidence}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-gray-900 block mb-1">Differentiation Advantage:</span>
                          <p className="text-gray-700 bg-emerald-50/50 p-2.5 rounded border border-emerald-100">{opp.differentiation}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block mb-1">Suggested Validation Experiment:</span>
                          <p className="text-gray-700 bg-purple-50/50 p-2.5 rounded border border-purple-100 font-medium">{opp.suggestedExperiment}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 4. Competitors */}
            {activeTab === 'competitors' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {study?.competitors.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center col-span-2">No competitor records generated.</p>
                ) : (
                  study?.competitors.map((comp) => (
                    <Card key={comp.id} className="p-5 border border-gray-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{comp.name}</h3>
                          {comp.website && (
                            <a href={comp.website} target="_blank" rel="noreferrer" className="text-xs text-[#3563F6] hover:underline">
                              {comp.website} ↗
                            </a>
                          )}
                        </div>
                        {getEvidenceBadge(comp.evidenceType)}
                      </div>

                      {comp.description && <p className="text-xs text-gray-600">{comp.description}</p>}
                      {comp.positioning && (
                        <div className="text-xs text-gray-700">
                          <span className="font-semibold">Positioning:</span> {comp.positioning}
                        </div>
                      )}

                      {comp.strengths.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-emerald-800 block mb-1">Strengths:</span>
                          <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                            {comp.strengths.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {comp.weaknesses.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-red-800 block mb-1">Weaknesses & Gaps:</span>
                          <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                            {comp.weaknesses.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {comp.differentiationOpportunities && (
                        <div className="p-2.5 bg-blue-50 text-blue-900 text-xs rounded border border-blue-100">
                          <span className="font-semibold">Our Differentiation Opportunity:</span> {comp.differentiationOpportunities}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 5. Audience */}
            {activeTab === 'audience' && (
              <div className="space-y-4">
                {study?.audienceProfiles.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No audience personas created.</p>
                ) : (
                  study?.audienceProfiles.map((aud) => (
                    <Card key={aud.id} className="p-6 border border-gray-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{aud.segmentName}</h3>
                          <p className="text-xs text-gray-500">{aud.demographics}</p>
                        </div>
                        <Badge variant="warning">
                          {aud.isAiGenerated ? 'AI Generated Persona' : 'Surveyed ICP'}
                        </Badge>
                      </div>

                      {aud.idealCustomerProfile && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="font-semibold block mb-0.5">Ideal Customer Profile:</span>
                          {aud.idealCustomerProfile}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-red-700 block mb-1">Core Pain Points:</span>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {aud.painPoints.map((p, idx) => (
                              <li key={idx}>{p}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-semibold text-emerald-700 block mb-1">Buying Motivations:</span>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {aud.buyingMotivations.map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-semibold text-amber-700 block mb-1">Objections & Friction:</span>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {aud.objections.map((o, idx) => (
                              <li key={idx}>{o}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 6. AEO Questions */}
            {activeTab === 'aeo' && (
              <div className="space-y-4">
                {study?.aeoQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No Answer Engine questions recorded.</p>
                ) : (
                  study?.aeoQuestions.map((q) => (
                    <Card key={q.id} className="p-5 border border-gray-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{q.topic}</span>
                        <span className="text-xs text-gray-400">Persona: {q.expectedPersona || 'General'}</span>
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        Query: "{q.queryQuestion}"
                      </div>

                      {q.results && q.results.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          {q.results.map((r) => (
                            <div key={r.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-800">
                                  Brand Mentioned: {r.brandMentioned ? '✅ Yes' : '❌ No'}
                                  {r.brandRank && ` (Rank #${r.brandRank})`}
                                </span>
                                <span className="text-gray-400">{r.provider} ({r.model})</span>
                              </div>
                              {r.rawAnswerExcerpt && (
                                <p className="text-gray-600 italic">"{r.rawAnswerExcerpt}"</p>
                              )}
                              {r.competitorsMentioned.length > 0 && (
                                <div className="text-[10px] text-gray-500">
                                  Competitors Mentioned: {r.competitorsMentioned.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 7. Sources */}
            {activeTab === 'sources' && (
              <div className="space-y-3">
                {study?.sources.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No sources or citations recorded.</p>
                ) : (
                  study?.sources.map((src) => (
                    <Card key={src.id} className="p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">{src.title}</h4>
                        <Badge variant={src.isVerified ? 'success' : 'outline'}>
                          {src.sourceType.replace('_', ' ')}
                        </Badge>
                      </div>
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noreferrer" className="text-xs text-[#3563F6] hover:underline block mt-1">
                          {src.url} ↗
                        </a>
                      )}
                      {src.snippet && <p className="text-xs text-gray-600 mt-2">{src.snippet}</p>}
                      <div className="text-[10px] text-gray-400 mt-2">
                        Accessed: {new Date(src.accessTimestamp).toLocaleString()}
                        {src.publicationDate && ` • Published: ${src.publicationDate}`}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
