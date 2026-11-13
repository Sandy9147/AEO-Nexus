'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { getApiClient } from '../../../lib/api';
import { AiConversationDto } from '@aeo-nexus/contracts';
import { Card, Button, Badge } from '@aeo-nexus/ui';

export default function ConversationsListPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversationDto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!wsId) return;
    setWorkspaceId(wsId);
    loadConversations(wsId);
  }, []);

  const loadConversations = async (wsId: string) => {
    try {
      setLoading(true);
      const api = getApiClient();
      const list = await api.getAiConversations(wsId);
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!workspaceId) return;
    try {
      setCreating(true);
      const api = getApiClient();
      const conv = await api.createAiConversation(workspaceId, {
        title: 'New Conversation',
      });
      router.push(`/agent/conversations/${conv.id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!workspaceId) return;
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const api = getApiClient();
      await api.deleteAiConversation(workspaceId, conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <CustomerShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href="/agent" className="hover:text-[#3563F6]">
                AI Business Agent
              </Link>
              <span>/</span>
              <span>Conversations</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Conversation Threads</h1>
            <p className="text-sm text-gray-500">History of all co-pilot dialogues and strategy sessions</p>
          </div>
          <Button
            onClick={handleCreateNew}
            disabled={creating}
            className="bg-[#3563F6] hover:bg-[#2851d8] text-white"
          >
            {creating ? 'Creating...' : '+ New Conversation'}
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations by title..."
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3563F6]/20 focus:border-[#3563F6]"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading conversation history...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-gray-50/50">
            <span className="text-3xl mb-2 block">💬</span>
            <h3 className="font-semibold text-gray-800 text-sm">No conversations found</h3>
            <p className="text-xs text-gray-500 mt-1">Start a new thread to collaborate with your AI business co-pilot.</p>
            <Button onClick={handleCreateNew} className="mt-4 bg-[#3563F6] text-white" size="sm">
              Start Conversation
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((conv) => (
              <Link key={conv.id} href={`/agent/conversations/${conv.id}`}>
                <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-[#3563F6] transition-all hover:shadow-sm flex items-center justify-between group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-[#3563F6]">
                        {conv.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-gray-500">
                        {conv.model}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{conv.messagesCount} message{conv.messagesCount !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Last active: {new Date(conv.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 text-xs transition-colors"
                      title="Delete Conversation"
                    >
                      🗑️
                    </button>
                    <span className="text-gray-400 text-sm">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
