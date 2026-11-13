'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { ProjectDetailDto, ProjectCommentDto, ProjectStatus } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../lib/api';

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [comments, setComments] = useState<ProjectCommentDto[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const [proj, comms] = await Promise.all([
        client.getProject(workspaceId, projectId),
        client.getProjectComments(workspaceId, projectId),
      ]);

      setProject(proj);
      setComments(comms);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const created = await client.createProjectComment(workspaceId, projectId, {
        content: newComment.trim(),
      });

      setComments((prev) => [...prev, created]);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>;
      case 'PLANNING':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Planning</Badge>;
      case 'ON_HOLD':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">On Hold</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Completed</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-gray-500 border-gray-300">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link href="/projects" className="text-[#3563F6] hover:underline">
            Projects
          </Link>
          <span>/</span>
          <span className="text-gray-900">{project?.name || 'Project'}</span>
        </div>

        {/* Header with Subtabs */}
        {project && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                    {project.name}
                  </h1>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/projects/${projectId}/tasks`}>
                  <Button className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium">
                    View Tasks ({project.tasksCount})
                  </Button>
                </Link>
                <Link href={`/projects/${projectId}/settings`}>
                  <Button variant="outline">Settings</Button>
                </Link>
              </div>
            </div>

            {/* Sub-navigation tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 text-sm font-semibold">
              <Link
                href={`/projects/${projectId}`}
                className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
              >
                Overview
              </Link>
              <Link
                href={`/projects/${projectId}/tasks`}
                className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
              >
                Tasks & Deliverables
              </Link>
              <Link
                href={`/projects/${projectId}/settings`}
                className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
              >
                Settings
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
        ) : project ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Progress, Key Metrics, Discussion */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress & Stats Card */}
              <Card className="border border-gray-200/80 rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900">Deliverable Progress</CardTitle>
                    <span className="text-sm font-bold text-[#3563F6]">{project.progress}% Complete</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-[#3563F6] h-3 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                      <div className="text-xl font-bold text-gray-900">{project.tasksCount}</div>
                      <div className="text-xs text-gray-500 font-medium mt-0.5">Total Tasks</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                      <div className="text-xl font-bold text-emerald-800">{project.completedTasksCount}</div>
                      <div className="text-xs text-emerald-700 font-medium mt-0.5">Completed</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-center border border-blue-100">
                      <div className="text-xl font-bold text-blue-800">
                        {project.tasks.filter((t) => t.status === 'IN_PROGRESS').length}
                      </div>
                      <div className="text-xs text-blue-700 font-medium mt-0.5">In Progress</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl text-center border border-red-100">
                      <div className="text-xl font-bold text-red-800">
                        {project.tasks.filter((t) => t.status === 'BLOCKED').length}
                      </div>
                      <div className="text-xs text-red-700 font-medium mt-0.5">Blocked</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Discussion & Collaboration Card */}
              <Card className="border border-gray-200/80 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-900">Project Discussion</CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Communicate with collaborators, post updates, and document findings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Post Comment Input */}
                  <form onSubmit={handlePostComment} className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Write an update or ask a question..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#3563F6] focus:border-transparent"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium text-xs px-4 py-1.5"
                      >
                        {submittingComment ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </form>

                  {/* Comments List */}
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    {comments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">
                        No comments yet. Start the conversation!
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                          <div className="flex items-center justify-between text-gray-600">
                            <span className="font-bold text-gray-900">
                              {c.author.firstName} {c.author.lastName}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Project Metadata & Members */}
            <div className="space-y-6">
              {/* Project Meta Card */}
              <Card className="border border-gray-200/80 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-gray-900">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Owner</span>
                    <span className="font-semibold text-gray-900">
                      {project.owner.firstName} {project.owner.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Start Date</span>
                    <span className="text-gray-900">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Due Date</span>
                    <span className="text-gray-900">
                      {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500 font-medium">Created</span>
                    <span className="text-gray-900">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Members Card */}
              <Card className="border border-gray-200/80 rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900">Team Members</CardTitle>
                    <span className="text-xs font-semibold text-gray-500">{project.members.length}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {project.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-[#3563F6] font-bold flex items-center justify-center text-xs">
                          {m.user.firstName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {m.user.firstName} {m.user.lastName}
                          </div>
                          <div className="text-[10px] text-gray-400">{m.user.email}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </CustomerShell>
  );
}
