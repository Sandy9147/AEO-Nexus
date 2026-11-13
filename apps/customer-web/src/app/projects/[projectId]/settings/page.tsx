'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@aeo-nexus/ui';
import { ProjectDetailDto, ProjectStatus } from '@aeo-nexus/contracts';
import { getApiClient } from '../../../../lib/api';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const workspaceId = localStorage.getItem('aeo_active_workspace_id');
        if (!workspaceId) return;

        const client = getApiClient();
        const p = await client.getProject(workspaceId, projectId);
        setProject(p);
        setName(p.name);
        setDescription(p.description || '');
        setStatus(p.status);
        setStartDate(p.startDate ? p.startDate.split('T')[0] : '');
        setDueDate(p.dueDate ? p.dueDate.split('T')[0] : '');
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.updateProject(workspaceId, projectId, {
        name: name.trim(),
        description: description.trim() || null,
        status,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });

      setSuccess('Project updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this project? It will be marked inactive but preserved.')) return;
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.archiveProject(workspaceId, projectId);
      router.push('/projects');
    } catch (err: any) {
      alert(err.message || 'Failed to archive project');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this project? All associated tasks and comments will be deleted.')) return;
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.deleteProject(workspaceId, projectId);
      router.push('/projects');
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link href="/projects" className="text-[#3563F6] hover:underline">
            Projects
          </Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="text-[#3563F6] hover:underline">
            {project?.name || 'Project'}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Settings</span>
        </div>

        {/* Subtabs & Header */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Project Settings
          </h1>

          <div className="flex items-center gap-2 border-b border-gray-200 text-sm font-semibold">
            <Link
              href={`/projects/${projectId}`}
              className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
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
              className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
            >
              Settings
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm">
            {success}
          </div>
        )}

        {loading ? (
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        ) : (
          <div className="space-y-6">
            {/* Edit Form */}
            <Card className="border border-gray-200/80 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">General Information</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Update project metadata, scope, and target timelines.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white"
                      >
                        <option value="PLANNING">Planning</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border border-red-200 bg-red-50/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-red-900">Danger Zone</CardTitle>
                <CardDescription className="text-xs text-red-700">
                  Actions that affect project accessibility and records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-red-100 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Archive Project</h4>
                    <p className="text-xs text-gray-500">
                      Hide this project from default lists while preserving history.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleArchive}
                    className="border-gray-300 text-gray-700 whitespace-nowrap"
                  >
                    Archive Project
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-red-200 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Delete Project</h4>
                    <p className="text-xs text-red-600">
                      Permanently delete this project and all its tasks and comments.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                  >
                    Delete Permanently
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
