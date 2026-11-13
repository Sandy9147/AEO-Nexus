'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { ProjectDto, ProjectStatus } from '@aeo-nexus/contracts';
import { getApiClient } from '../../lib/api';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const data = await client.getProjects(workspaceId, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProjects();
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>;
      case 'PLANNING':
        return <Badge variant="primary" className="bg-blue-100 text-blue-800 border-blue-200">Planning</Badge>;
      case 'ON_HOLD':
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200">On Hold</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">Completed</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-gray-500 border-gray-300">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage client deliverables, internal initiatives, campaigns, and team tasks.
            </p>
          </div>
          <Link href="/projects/new">
            <Button className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium shadow-sm">
              + New Project
            </Button>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === f.value
                    ? 'bg-[#3563F6] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#3563F6] focus:border-transparent w-full md:w-64"
            />
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Project List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 bg-gray-100 animate-pulse rounded-2xl border border-gray-200/60" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl p-8 shadow-xs">
            <div className="w-16 h-16 mx-auto bg-blue-50 text-[#3563F6] rounded-full flex items-center justify-center text-3xl mb-4">
              📁
            </div>
            <h3 className="text-lg font-bold text-gray-900">No projects found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
              {statusFilter !== 'ALL' || searchQuery
                ? 'No projects match your filter criteria. Try clearing the filters.'
                : 'Get started by creating your first project to organize deliverables and track milestones.'}
            </p>
            <Link href="/projects/new">
              <Button className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium">
                Create First Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="group">
                <Card className="h-full border border-gray-200/70 hover:border-blue-400 hover:shadow-md transition-all duration-200 rounded-2xl flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-gray-900 group-hover:text-[#3563F6] transition-colors line-clamp-1">
                        {project.name}
                      </CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                    <CardDescription className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {project.description || 'No description provided.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span className="font-medium">Progress</span>
                        <span className="font-semibold text-gray-900">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#3563F6] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span title="Tasks">
                          ✓ {project.completedTasksCount}/{project.tasksCount} tasks
                        </span>
                        <span title="Members">
                          👥 {project.membersCount}
                        </span>
                      </div>
                      {project.dueDate && (
                        <span className="text-gray-400" title="Due Date">
                          Due {new Date(project.dueDate).toLocaleDateString()}
                        </span>
                      )}
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
