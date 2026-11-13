'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@aeo-nexus/ui';
import { KnowledgeCategory, KnowledgeStatus } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../../lib/api';

export default function NewKnowledgeDocumentPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('COMPANY');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<KnowledgeStatus>('PUBLISHED');
  const [tagsInput, setTagsInput] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and document content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) throw new Error('No active workspace selected');

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const client = getApiClient();
      const doc = await client.createKnowledgeDocument(workspaceId, {
        title: title.trim(),
        category,
        content: content.trim(),
        status,
        tags,
        sourceUrl: sourceUrl.trim() || null,
      });

      router.push(`/assets/knowledge/${doc.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save knowledge document');
      setLoading(false);
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/assets/knowledge" className="text-xs font-semibold text-[#3563F6] hover:underline mb-2 inline-block">
            ← Back to Knowledge Base
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Create Knowledge Document
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Store essential business data, product documentation, policies, or brand guidelines.
          </p>
        </div>

        <Card className="border border-gray-200/80 rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">Document Information</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              This document will be versioned automatically upon future updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Product Catalog 2026, Refund & Exchange Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  >
                    <option value="COMPANY">Company Overview</option>
                    <option value="PRODUCTS">Products</option>
                    <option value="SERVICES">Services</option>
                    <option value="FAQS">FAQs</option>
                    <option value="POLICIES">Policies</option>
                    <option value="BRAND">Brand Voice</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="OPERATIONS">Operations</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as KnowledgeStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Content (Markdown / Text) *
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder="Write or paste comprehensive documentation, answers, or guidelines..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pricing, saas, onboarding, support"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Source URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/docs/refund-policy"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <Link href="/assets/knowledge">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium"
                >
                  {loading ? 'Publishing...' : 'Save Document'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerShell>
  );
}
