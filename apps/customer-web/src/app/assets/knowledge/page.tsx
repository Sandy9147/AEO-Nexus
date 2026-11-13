'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { KnowledgeDocumentDto, KnowledgeCategory } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../lib/api';

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Company Overview', value: 'COMPANY' },
  { label: 'Products', value: 'PRODUCTS' },
  { label: 'Services', value: 'SERVICES' },
  { label: 'FAQs', value: 'FAQS' },
  { label: 'Policies', value: 'POLICIES' },
  { label: 'Brand Voice', value: 'BRAND' },
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Operations', value: 'OPERATIONS' },
  { label: 'Other', value: 'OTHER' },
];

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const list = await client.getKnowledgeDocuments(workspaceId, {
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        search: search.trim() || undefined,
      });
      setDocuments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Business Knowledge Base
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Curate canonical business documents, products, FAQs, brand tone, and policies.
            </p>
          </div>
          <Link href="/assets/knowledge/new">
            <Button className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium">
              + New Document
            </Button>
          </Link>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 text-sm font-semibold">
          <Link
            href="/assets"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Explorer
          </Link>
          <Link
            href="/assets/files"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Files
          </Link>
          <Link
            href="/assets/folders"
            className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Folders
          </Link>
          <Link
            href="/assets/knowledge"
            className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
          >
            Knowledge Base
          </Link>
        </div>

        {/* Filter bar */}
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === cat.value
                    ? 'bg-[#3563F6] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search knowledge documents, content, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg w-full max-w-md focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Documents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl p-8 shadow-xs">
            <div className="w-16 h-16 mx-auto bg-purple-50 text-[#6554E8] rounded-full flex items-center justify-center text-3xl mb-4">
              📚
            </div>
            <h3 className="text-lg font-bold text-gray-900">No knowledge documents yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
              Create documents to preserve your product specifications, FAQs, brand tone, and business guidelines.
            </p>
            <Link href="/assets/knowledge/new">
              <Button className="bg-[#3563F6] text-white font-medium">
                Create First Document
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Link key={doc.id} href={`/assets/knowledge/${doc.id}`} className="group">
                <Card className="h-full border border-gray-200/80 hover:border-purple-400 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#6554E8] border-purple-200 bg-purple-50">
                        {doc.category}
                      </Badge>
                      <span className="text-[10px] text-gray-400 font-mono">
                        v{doc.currentVersion}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-gray-900 group-hover:text-[#3563F6] transition-colors line-clamp-1">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 line-clamp-3 mt-1 leading-relaxed">
                      {doc.contentSnippet}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Tags */}
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-md font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>By {doc.author.firstName}</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
