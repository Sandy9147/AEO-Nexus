'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomerShell } from '../../components/layout/customer-shell';
import { getApiClient } from '../../lib/api';
import {
  AiConversationDto,
  AiApprovalDto,
  AiPromptTemplateDto,
  AiWorkspaceConfigDto,
} from '@aeo-nexus/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export default function AgentHubPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversationDto[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<AiApprovalDto[]>([]);
  const [templates, setTemplates] = useState<AiPromptTemplateDto[]>([]);
  const [config, setConfig] = useState<AiWorkspaceConfigDto | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const [convs, approvals, tmpls, cfg] = await Promise.all([
        api.getAiConversations(wsId).catch(() => []),
        api.getAiApprovals(wsId, 'PENDING').catch(() => []),
        api.getAiPromptTemplates(wsId).catch(() => []),
        api.getAiWorkspaceConfig(wsId).catch(() => null),
      ]);
      setConversations(convs);
      setPendingApprovals(approvals);
      setTemplates(tmpls);
      setConfig(cfg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (customPrompt?: string) => {
    if (!workspaceId) return;
    const initialText = customPrompt || promptInput;
    if (!initialText.trim()) return;

    try {
      setIsStarting(true);
      const api = getApiClient();
      const newConv = await api.createAiConversation(workspaceId, {
        title: initialText.substring(0, 35) + (initialText.length > 35 ? '...' : ''),
        initialMessage: initialText,
      });

      // Send the initial message immediately so the agent starts reasoning
      await api.sendAiMessage(workspaceId, newConv.id, {
        content: initialText,
      });

      router.push(`/agent/conversations/${newConv.id}`);
    } catch (err) {
      console.error('Failed to initialize conversation:', err);
      setIsStarting(false);
    }
  };

  return (
    <CustomerShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex items-center justify-center text-white text-xl shadow-md">
                🤖
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Business Agent</h1>
                <p className="text-sm text-gray-500">Autonomous operational co-pilot for workspace deliverables & strategy</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/agent/conversations">
              <Button variant="outline" size="sm">
                💬 All Conversations ({conversations.length})
              </Button>
            </Link>
            <Link href="/agent/settings">
              <Button variant="outline" size="sm">
                ⚙️ AI Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Pending Approvals Notice */}
        {pendingApprovals.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-amber-900 text-sm">
                  {pendingApprovals.length} Action{pendingApprovals.length > 1 ? 's' : ''} Requiring Human Approval
                </h4>
                <p className="text-xs text-amber-700">
                  The AI agent has staged operations that require your explicit verification before execution.
                </p>
              </div>
            </div>
            <Link href="/agent/settings#approvals">
              <Button size="sm" variant="secondary" className="bg-amber-600 text-white hover:bg-amber-700">
                Review Approvals
              </Button>
            </Link>
          </div>
        )}

        {/* Main Prompt Input Launcher */}
        <Card className="border-indigo-100 shadow-md bg-gradient-to-br from-white to-indigo-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Ask your Business Agent anything
              </CardTitle>
              <Badge variant="primary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                Model: {config?.defaultModel || 'mock-agent-fast'}
              </Badge>
            </div>
            <CardDescription>
              Direct access to your verified business profile, brand guidelines, active projects, tasks, and knowledge vault.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStartConversation();
                  }
                }}
                placeholder="e.g., Audit our active projects and tell me what tasks are due this week, or draft an AEO brief for our core product..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 p-4 text-sm focus:border-[#3563F6] focus:outline-none focus:ring-2 focus:ring-[#3563F6]/20 resize-none shadow-inner"
              />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-400">Press Enter to send, Shift+Enter for new line</span>
                <Button
                  onClick={() => handleStartConversation()}
                  disabled={isStarting || !promptInput.trim()}
                  className="bg-[#3563F6] hover:bg-[#2851d8] text-white px-5"
                >
                  {isStarting ? 'Initiating Agent...' : 'Send to Agent →'}
                </Button>
              </div>
            </div>

            {/* Quick Prompt Cards */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Recommended Prompts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.slice(0, 4).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleStartConversation(tmpl.templateText)}
                    className="text-left p-3 rounded-lg border border-gray-100 bg-white hover:border-[#3563F6] hover:bg-blue-50/30 transition-colors shadow-sm group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs text-gray-900 group-hover:text-[#3563F6]">
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Conversations</h2>
            <Link href="/agent/conversations" className="text-sm font-medium text-[#3563F6] hover:underline">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <Card className="p-8 text-center bg-gray-50/50">
              <span className="text-3xl mb-2 block">💬</span>
              <p className="font-medium text-gray-700 text-sm">No conversations yet</p>
              <p className="text-xs text-gray-500 mt-1">Start by typing your first prompt above to launch your AI co-pilot.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {conversations.slice(0, 6).map((conv) => (
                <Link key={conv.id} href={`/agent/conversations/${conv.id}`}>
                  <Card className="hover:border-[#3563F6] transition-all cursor-pointer h-full hover:shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] text-gray-500">
                          {conv.provider}
                        </Badge>
                        <span className="text-[11px] text-gray-400">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-1 mt-1">
                        {conv.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <p className="text-xs text-gray-500">
                        {conv.messagesCount} message{conv.messagesCount !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}
