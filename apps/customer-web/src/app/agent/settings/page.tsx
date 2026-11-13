'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { getApiClient } from '../../../lib/api';
import {
  AiWorkspaceConfigDto,
  AiProviderStatusDto,
  AiUsageSummaryDto,
  AiApprovalDto,
} from '@aeo-nexus/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export default function AgentSettingsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [config, setConfig] = useState<AiWorkspaceConfigDto | null>(null);
  const [providers, setProviders] = useState<AiProviderStatusDto[]>([]);
  const [usage, setUsage] = useState<AiUsageSummaryDto | null>(null);
  const [approvals, setApprovals] = useState<AiApprovalDto[]>([]);

  const [providerInput, setProviderInput] = useState('mock');
  const [modelInput, setModelInput] = useState('mock-agent-fast');
  const [tokenBudgetInput, setTokenBudgetInput] = useState(1000000);
  const [costBudgetInput, setCostBudgetInput] = useState(50);
  const [requireApprovalInput, setRequireApprovalInput] = useState(true);
  const [customInstructionsInput, setCustomInstructionsInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!wsId) return;
    setWorkspaceId(wsId);
    loadData(wsId);
  }, []);

  const loadData = async (wsId: string) => {
    try {
      setLoading(true);
      const api = getApiClient();
      const [cfg, provs, usg, apprs] = await Promise.all([
        api.getAiWorkspaceConfig(wsId),
        api.getAiProviderStatus(wsId),
        api.getAiUsageSummary(wsId).catch(() => null),
        api.getAiApprovals(wsId).catch(() => []),
      ]);

      setConfig(cfg);
      setProviders(provs);
      setUsage(usg);
      setApprovals(apprs);

      setProviderInput(cfg.defaultProvider);
      setModelInput(cfg.defaultModel);
      setTokenBudgetInput(cfg.monthlyTokenBudget);
      setCostBudgetInput(cfg.monthlyCostBudget);
      setRequireApprovalInput(cfg.requireApprovalForSensitive);
      setCustomInstructionsInput(cfg.customSystemInstructions || '');
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    try {
      setSaving(true);
      setStatusMsg(null);
      const api = getApiClient();
      const updated = await api.updateAiWorkspaceConfig(workspaceId, {
        defaultProvider: providerInput,
        defaultModel: modelInput,
        monthlyTokenBudget: Number(tokenBudgetInput),
        monthlyCostBudget: Number(costBudgetInput),
        requireApprovalForSensitive: requireApprovalInput,
        customSystemInstructions: customInstructionsInput.trim() || null,
      });

      setConfig(updated);
      setStatusMsg({ type: 'success', text: 'AI Workspace configurations saved successfully.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: `Failed to save configurations: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReviewApproval = async (approvalId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!workspaceId) return;
    try {
      const api = getApiClient();
      await api.reviewAiApproval(workspaceId, approvalId, {
        status,
        reviewNotes: `Human review via AI settings panel (${status.toLowerCase()})`,
      });
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, status: status as any } : a)),
      );
    } catch (err) {
      alert(`Approval review failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (loading) {
    return (
      <CustomerShell>
        <div className="p-12 text-center text-sm text-gray-400">Loading AI settings and provider status...</div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href="/agent" className="hover:text-[#3563F6]">
                AI Business Agent
              </Link>
              <span>/</span>
              <span>Settings</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Agent Configuration</h1>
            <p className="text-sm text-gray-500">Configure default LLM models, provider credentials, approval policies, and cost budgets</p>
          </div>
          <Link href="/agent">
            <Button variant="outline" size="sm">
              ← Back to Agent
            </Button>
          </Link>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-sm ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Usage & Metering Overview */}
        {usage && (
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-gray-900">Current Month Usage & Budget</CardTitle>
              <CardDescription>
                Tokens and expenditure computed using exact published model pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Total Tokens Used</span>
                  <span className="text-lg font-bold text-gray-900">{usage.totalTokens.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 block">
                    of {usage.monthlyTokenBudget.toLocaleString()} limit
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Cost Incurred</span>
                  <span className="text-lg font-bold text-gray-900">${usage.totalCostUsd.toFixed(4)}</span>
                  <span className="text-[10px] text-gray-400 block">of ${usage.monthlyCostBudget.toFixed(2)} budget</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Remaining Tokens</span>
                  <span className="text-lg font-bold text-emerald-600">{usage.tokenBudgetRemaining.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Remaining Budget</span>
                  <span className="text-lg font-bold text-emerald-600">${usage.costBudgetRemaining.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Status */}
        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-gray-900">AI Provider Adapters</CardTitle>
            <CardDescription>
              AEO Nexus supports a provider-independent architecture. Only configured providers with server-side keys are enabled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border ${
                    p.isConfigured ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                    <Badge variant={p.isConfigured ? 'success' : 'outline'} className="text-[10px]">
                      {p.isConfigured ? 'Configured & Active' : 'Unconfigured'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {p.isConfigured
                      ? `${p.availableModels.length} models ready for inference.`
                      : `Set ${p.id.toUpperCase()}_API_KEY on the backend to activate.`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-gray-900">Workspace Model & Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Provider</label>
                  <select
                    value={providerInput}
                    onChange={(e) => {
                      setProviderInput(e.target.value);
                      if (e.target.value === 'gemini') setModelInput('gemini-1.5-flash');
                      else if (e.target.value === 'openai') setModelInput('gpt-4o-mini');
                      else if (e.target.value === 'anthropic') setModelInput('claude-3-5-haiku');
                      else setModelInput('mock-agent-fast');
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3563F6]"
                  >
                    <option value="mock">AEO Nexus Embedded Agent (Sandbox Default)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Model</label>
                  <select
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3563F6]"
                  >
                    <option value="mock-agent-fast">mock-agent-fast ($0.00 / 1M)</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash ($0.075 / 1M in)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro ($1.25 / 1M in)</option>
                    <option value="gpt-4o-mini">gpt-4o-mini ($0.15 / 1M in)</option>
                    <option value="gpt-4o">gpt-4o ($2.50 / 1M in)</option>
                    <option value="claude-3-5-haiku">claude-3-5-haiku ($0.80 / 1M in)</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet ($3.00 / 1M in)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Token Budget</label>
                  <input
                    type="number"
                    min={1000}
                    step={10000}
                    value={tokenBudgetInput}
                    onChange={(e) => setTokenBudgetInput(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3563F6]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Requests halt once limit is exceeded</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Cost Budget ($ USD)</label>
                  <input
                    type="number"
                    min={1}
                    step={5}
                    value={costBudgetInput}
                    onChange={(e) => setCostBudgetInput(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3563F6]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Hard limit on total API cost</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApprovalInput}
                    onChange={(e) => setRequireApprovalInput(e.target.checked)}
                    className="rounded text-[#3563F6] focus:ring-[#3563F6]"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Require explicit human approval for sensitive actions
                  </span>
                </label>
                <p className="text-xs text-gray-500 pl-6 mt-0.5">
                  When enabled, actions that publish content, delete data, modify business settings, or spend funds require owner/admin confirmation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Workspace Directives
                </label>
                <textarea
                  value={customInstructionsInput}
                  onChange={(e) => setCustomInstructionsInput(e.target.value)}
                  placeholder="e.g., Always format recommendations with actionable bullet points. Prioritize Answer Engine citation readiness over generic SEO keywords..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3563F6] resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#3563F6] hover:bg-[#2851d8] text-white px-6"
                >
                  {saving ? 'Saving...' : 'Save AI Configurations'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Approvals Review Section */}
        <div id="approvals" className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Workspace Action Approvals</h2>
          {approvals.length === 0 ? (
            <Card className="p-8 text-center bg-gray-50/50">
              <span className="text-2xl mb-1 block">✅</span>
              <p className="text-sm text-gray-700 font-medium">No pending approval requests</p>
              <p className="text-xs text-gray-400 mt-0.5">Actions requiring human review will appear here.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvals.map((appr) => (
                <div key={appr.id} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{appr.title}</h4>
                      <p className="text-xs text-gray-500">{appr.description}</p>
                    </div>
                    <Badge variant={appr.status === 'APPROVED' ? 'success' : appr.status === 'REJECTED' ? 'outline' : 'warning'}>
                      {appr.status}
                    </Badge>
                  </div>
                  {appr.status === 'PENDING' && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3"
                        onClick={() => handleReviewApproval(appr.id, 'APPROVED')}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7 px-3"
                        onClick={() => handleReviewApproval(appr.id, 'REJECTED')}
                      >
                        ✕ Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}
