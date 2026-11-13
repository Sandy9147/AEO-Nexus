'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import {
  KnowledgeDocumentDetailDto,
  KnowledgeCategory,
  KnowledgeStatus,
} from '@aeo-nexus/contracts';
import { getApiClient } from '../../../../lib/api';

export default function KnowledgeDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [document, setDocument] = useState<KnowledgeDocumentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<KnowledgeCategory>('COMPANY');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState<KnowledgeStatus>('PUBLISHED');
  const [editTags, setEditTags] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [savingRevision, setSavingRevision] = useState(false);

  // Selected Version to preview
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const doc = await client.getKnowledgeDocument(workspaceId, documentId);
      setDocument(doc);
      setEditTitle(doc.title);
      setEditCategory(doc.category);
      setEditContent(doc.content);
      setEditStatus(doc.status);
      setEditTags(doc.tags.join(', '));
      setEditSourceUrl(doc.sourceUrl || '');
      setSelectedVersionNumber(doc.currentVersion);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRevision(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const tags = editTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await client.updateKnowledgeDocument(workspaceId, documentId, {
        title: editTitle.trim(),
        category: editCategory,
        content: editContent,
        status: editStatus,
        tags,
        sourceUrl: editSourceUrl.trim() || null,
        changeNote: changeNote.trim() || undefined,
      });

      setIsEditing(false);
      setChangeNote('');
      await loadDocument();
    } catch (err: any) {
      alert(err.message || 'Failed to save revision');
    } finally {
      setSavingRevision(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this document and its entire version history?')) return;
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.deleteKnowledgeDocument(workspaceId, documentId);
      router.push('/assets/knowledge');
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const activeVersion = document?.versions.find((v) => v.version === selectedVersionNumber) || {
    title: document?.title || '',
    content: document?.content || '',
    version: document?.currentVersion || 1,
    changeNote: null,
    createdAt: document?.updatedAt || '',
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link href="/assets" className="text-[#3563F6] hover:underline">
            Assets
          </Link>
          <span>/</span>
          <Link href="/assets/knowledge" className="text-[#3563F6] hover:underline">
            Knowledge Base
          </Link>
          <span>/</span>
          <span className="text-gray-900">{document?.title || 'Document'}</span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        ) : document ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Content or Edit Mode */}
            <div className="lg:col-span-2 space-y-6">
              {!isEditing ? (
                <Card className="border border-gray-200/80 rounded-2xl">
                  <CardHeader className="pb-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#6554E8] border-purple-200 bg-purple-50">
                            {document.category}
                          </Badge>
                          <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            {document.status}
                          </Badge>
                          <span className="text-xs font-mono font-semibold text-gray-500">
                            Viewing v{selectedVersionNumber} {selectedVersionNumber === document.currentVersion && '(Latest)'}
                          </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                          {activeVersion.title}
                        </h1>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium text-xs"
                        >
                          Edit Document
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDelete}
                          className="text-red-600 border-red-200 text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {document.sourceUrl && (
                      <div className="pt-2 text-xs">
                        <span className="text-gray-400">Source: </span>
                        <a
                          href={document.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3563F6] hover:underline"
                        >
                          {document.sourceUrl} ↗
                        </a>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-6">
                    {/* Rendered content */}
                    <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {activeVersion.content}
                    </div>

                    {/* Tags */}
                    {document.tags.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-400 font-semibold mr-1">Tags:</span>
                        {document.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-lg"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                /* Edit Mode Card */
                <Card className="border border-gray-200/80 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-gray-900">Edit Knowledge Document</CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Modifying the title or content creates a new version in the audit trail.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveRevision} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Category
                          </label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as KnowledgeCategory)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
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
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as KnowledgeStatus)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                          >
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Content (Markdown / Text) *
                        </label>
                        <textarea
                          rows={12}
                          required
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Tags (Comma-separated)
                          </label>
                          <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Source URL
                          </label>
                          <input
                            type="url"
                            value={editSourceUrl}
                            onChange={(e) => setEditSourceUrl(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                        <label className="block text-xs font-bold text-[#6554E8] uppercase mb-1">
                          Change Note / Version Summary
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Updated product tier pricing, clarified return policy"
                          value={changeNote}
                          onChange={(e) => setChangeNote(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-purple-200 rounded-lg bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={savingRevision}
                          className="bg-[#3563F6] text-white"
                        >
                          {savingRevision ? 'Saving...' : 'Save Revision'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right 1 Col: Version History & Metadata */}
            <div className="space-y-6">
              <Card className="border border-gray-200/80 rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900">Version History</CardTitle>
                    <span className="text-xs font-bold text-gray-400">
                      {document.versions.length} revisions
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {document.versions.map((ver) => (
                    <div
                      key={ver.id}
                      onClick={() => setSelectedVersionNumber(ver.version)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedVersionNumber === ver.version
                          ? 'border-[#3563F6] bg-blue-50/40 shadow-2xs'
                          : 'border-gray-100 bg-gray-50/60 hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-gray-900 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[#3563F6]">v{ver.version}</span>
                          {ver.version === document.currentVersion && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] px-1 py-0">
                              Latest
                            </Badge>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(ver.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-2">
                        {ver.changeNote || 'No summary note.'}
                      </p>
                      <div className="text-[10px] text-gray-400 mt-1">
                        By {ver.createdBy.firstName} {ver.createdBy.lastName}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Document Meta */}
              <Card className="border border-gray-200/80 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-gray-900">Document Meta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-medium">Author</span>
                    <span className="text-gray-900 font-semibold">
                      {document.author.firstName} {document.author.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-medium">Initial Created</span>
                    <span className="text-gray-900">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400 font-medium">Last Revision</span>
                    <span className="text-gray-900">
                      {new Date(document.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </CustomerShell>
  );
}
