'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { getApiClient } from '../../../../lib/api';
import {
  AiConversationDetailDto,
  AiMessageDto,
  AiApprovalDto,
} from '@aeo-nexus/contracts';
import { Button, Badge, Card } from '@aeo-nexus/ui';

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AiConversationDetailDto | null>(null);
  const [messages, setMessages] = useState<AiMessageDto[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<AiApprovalDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!wsId || !conversationId) return;
    setWorkspaceId(wsId);
    loadConversation(wsId, conversationId);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const loadConversation = async (wsId: string, convId: string) => {
    try {
      setLoading(true);
      const api = getApiClient();
      const [conv, approvals] = await Promise.all([
        api.getAiConversation(wsId, convId),
        api.getAiApprovals(wsId, 'PENDING').catch(() => []),
      ]);
      setConversation(conv);
      setMessages(conv.messages || []);
      setTitleInput(conv.title);
      // Filter approvals relevant to this conversation or workspace
      setPendingApprovals(approvals.filter((a) => a.conversationId === convId || !a.conversationId));
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workspaceId || !conversationId || !inputText.trim() || isSending) return;

    const userContent = inputText.trim();
    setInputText('');

    // Optimistically add user message
    const tempUserMsg: AiMessageDto = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSending(true);

    try {
      const api = getApiClient();
      const res = await api.sendAiMessage(workspaceId, conversationId, {
        content: userContent,
      });

      // Replace messages with updated list including real assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.message,
        res.assistantMessage,
      ]);

      // Refresh approvals if any tool triggered an approval request
      const updatedApprovals = await api.getAiApprovals(workspaceId, 'PENDING');
      setPendingApprovals(updatedApprovals.filter((a) => a.conversationId === conversationId || !a.conversationId));
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMsg: AiMessageDto = {
        id: `err-${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: `⚠️ Failed to send message: ${err instanceof Error ? err.message : String(err)}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRename = async () => {
    if (!workspaceId || !conversationId || !titleInput.trim()) return;
    try {
      const api = getApiClient();
      const updated = await api.updateAiConversation(workspaceId, conversationId, {
        title: titleInput.trim(),
      });
      setConversation((prev) => (prev ? { ...prev, title: updated.title } : null));
      setIsRenaming(false);
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleReviewApproval = async (approvalId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!workspaceId) return;
    try {
      const api = getApiClient();
      await api.reviewAiApproval(workspaceId, approvalId, {
        status,
        reviewNotes: `Human review via conversation chat (${status.toLowerCase()})`,
      });
      setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    } catch (err) {
      alert(`Approval review failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (loading) {
    return (
      <CustomerShell>
        <div className="p-12 text-center text-sm text-gray-400">Loading conversation dialogue...</div>
      </CustomerShell>
    );
  }

  if (!conversation) {
    return (
      <CustomerShell>
        <div className="p-12 text-center">
          <p className="text-gray-700">Conversation not found.</p>
          <Link href="/agent/conversations">
            <Button className="mt-4" size="sm">Back to Conversations</Button>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/agent/conversations"
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 text-sm"
              title="Back"
            >
              ←
            </Link>
            <div>
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="border border-gray-200 rounded px-2 py-0.5 text-sm font-semibold focus:outline-none focus:border-[#3563F6]"
                  />
                  <Button size="sm" onClick={handleRename} className="h-7 px-2 text-xs">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsRenaming(false)} className="h-7 px-2 text-xs">Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 text-sm">{conversation.title}</h2>
                  <button
                    onClick={() => setIsRenaming(true)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                    title="Rename"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Model: {conversation.model}</span>
                <span>•</span>
                <span>Provider: {conversation.provider}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/agent/runs">
              <Button variant="outline" size="sm" className="text-xs h-8">
                📊 View Runs
              </Button>
            </Link>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#F7F9FC]/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3563F6] flex items-center justify-center text-2xl mb-3 shadow-inner">
                🤖
              </div>
              <h3 className="font-semibold text-gray-800 text-base">AEO Nexus Business Agent Ready</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Ask about our business goals, brand voice, open tasks, knowledge documents, or ask to draft new deliverables.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex-shrink-0 flex items-center justify-center text-white text-xs shadow-sm">
                      🤖
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[85%] md:max-w-[75%]`}>
                    {/* Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-[#3563F6] text-white rounded-tr-none'
                          : 'bg-white border border-gray-100 text-gray-900 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Token tally footer */}
                      {msg.tokensUsed && !isUser && (
                        <div className="mt-3 pt-2 border-t border-gray-50 text-[10px] text-gray-400 flex items-center justify-between">
                          <span>Tokens: {msg.tokensUsed.toLocaleString()}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Citations block */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs space-y-1.5">
                        <span className="font-semibold text-blue-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          📚 Verified Knowledge Citations ({msg.citations.length})
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {msg.citations.map((c, i) => (
                            <Link
                              key={i}
                              href={`/assets/knowledge/${c.documentId}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 rounded-md text-[11px] text-blue-800 hover:bg-blue-50 transition-colors shadow-xs"
                              title={c.snippet || c.title}
                            >
                              <span>📄</span>
                              <span className="font-medium line-clamp-1">{c.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tool executions block */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-2">
                        <span className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          🛠️ Tools Invoked ({msg.toolCalls.length})
                        </span>
                        <div className="space-y-1.5">
                          {msg.toolCalls.map((tool) => (
                            <div
                              key={tool.id}
                              className="p-2 bg-white border border-gray-100 rounded-lg flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-800 font-semibold">{tool.toolName}</span>
                                <Badge
                                  variant={
                                    tool.status === 'REQUIRES_APPROVAL'
                                      ? 'warning'
                                      : tool.status === 'SUCCESS'
                                      ? 'success'
                                      : 'outline'
                                  }
                                  className="text-[9px] px-1.5 py-0"
                                >
                                  {tool.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-700 text-xs font-semibold">
                      You
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Pending Approvals Card in Stream */}
          {pendingApprovals.length > 0 && (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <Card key={approval.id} className="border-amber-200 bg-amber-50/50 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <h4 className="font-bold text-sm text-amber-950">{approval.title}</h4>
                        <Badge variant="warning" className="text-[10px]">Action Approval Required</Badge>
                      </div>
                      <p className="text-xs text-amber-900">{approval.description}</p>
                      {approval.payload && (
                        <pre className="text-[10px] bg-white border border-amber-200 rounded p-2 text-gray-700 overflow-x-auto mt-2">
                          {JSON.stringify(approval.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                        onClick={() => handleReviewApproval(approval.id, 'APPROVED')}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8 px-3"
                        onClick={() => handleReviewApproval(approval.id, 'REJECTED')}
                      >
                        ✕ Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Streaming Indicator */}
          {isSending && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex-shrink-0 flex items-center justify-center text-white text-xs shadow-sm animate-pulse">
                🤖
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-2xl text-xs text-gray-500 shadow-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#3563F6] animate-ping" />
                <span>Agent is reasoning and querying workspace tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask your agent or instruct it to perform a task..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]/20 focus:border-[#3563F6] disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="bg-[#3563F6] hover:bg-[#2851d8] text-white px-5 rounded-xl text-sm font-medium shadow-sm"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </CustomerShell>
  );
}

