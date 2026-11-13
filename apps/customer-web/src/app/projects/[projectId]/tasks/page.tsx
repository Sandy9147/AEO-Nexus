'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomerShell } from '../../../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import {
  ProjectDetailDto,
  TaskDto,
  TaskCommentDto,
  TaskStatus,
  TaskPriority,
} from '@aeo-nexus/contracts';
import { getApiClient } from '../../../../lib/api';

const TASK_STATUSES: { label: string; value: TaskStatus; color: string }[] = [
  { label: 'To Do', value: 'TODO', color: 'border-t-gray-400 bg-gray-50/50' },
  { label: 'In Progress', value: 'IN_PROGRESS', color: 'border-t-blue-500 bg-blue-50/30' },
  { label: 'In Review', value: 'IN_REVIEW', color: 'border-t-amber-500 bg-amber-50/30' },
  { label: 'Completed', value: 'COMPLETED', color: 'border-t-emerald-500 bg-emerald-50/30' },
  { label: 'Blocked', value: 'BLOCKED', color: 'border-t-red-500 bg-red-50/30' },
];

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('TODO');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Task Details / Comments Modal State
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null);
  const [taskComments, setTaskComments] = useState<TaskCommentDto[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const [proj, taskList] = await Promise.all([
        client.getProject(workspaceId, projectId),
        client.getProjectTasks(workspaceId, projectId),
      ]);

      setProject(proj);
      setTasks(taskList);
    } catch (err: any) {
      setError(err.message || 'Failed to load project tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreatingTask(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const task = await client.createTask(workspaceId, {
        projectId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: newStatus,
        priority: newPriority,
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
      });

      setTasks((prev) => [task, ...prev]);
      setShowNewTaskModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const openTaskDetail = async (task: TaskDto) => {
    setActiveTask(task);
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;
      const client = getApiClient();
      const comments = await client.getTaskComments(workspaceId, task.id);
      setTaskComments(comments);
    } catch {
      // Ignore
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;
      const client = getApiClient();
      const updated = await client.updateTask(workspaceId, taskId, { status });

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (activeTask && activeTask.id === taskId) {
        setActiveTask(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handlePostTaskComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !newComment.trim()) return;

    try {
      setPostingComment(true);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const comment = await client.createTaskComment(workspaceId, activeTask.id, {
        content: newComment.trim(),
      });

      setTaskComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.deleteTask(workspaceId, taskId);

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setActiveTask(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Urgent</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-[10px]">Low</Badge>;
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
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
          <span className="text-gray-900">Tasks</span>
        </div>

        {/* Subtabs & Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                Tasks & Deliverables
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track status across workflow columns from planning to completion.
              </p>
            </div>
            <Button
              onClick={() => setShowNewTaskModal(true)}
              className="bg-[#3563F6] hover:bg-blue-700 text-white font-medium"
            >
              + Add Task
            </Button>
          </div>

          <div className="flex items-center gap-2 border-b border-gray-200 text-sm font-semibold">
            <Link
              href={`/projects/${projectId}`}
              className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
            >
              Overview
            </Link>
            <Link
              href={`/projects/${projectId}/tasks`}
              className="pb-3 px-1 border-b-2 border-[#3563F6] text-[#3563F6]"
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

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Kanban Board Layout */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {TASK_STATUSES.map((col) => {
              const columnTasks = tasks.filter((t) => t.status === col.value);
              return (
                <div
                  key={col.value}
                  className={`border border-gray-200/80 rounded-2xl p-3 border-t-4 ${col.color} min-h-[420px] flex flex-col`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60">
                    <span className="text-xs font-bold text-gray-800">{col.label}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-gray-600 shadow-2xs">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetail(task)}
                        className="p-3 bg-white rounded-xl border border-gray-200/70 hover:border-blue-400 hover:shadow-xs cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-xs font-bold text-gray-900 line-clamp-2">
                            {task.title}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-400">
                          <span>
                            {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No date'}
                          </span>
                          {task.commentsCount > 0 && (
                            <span>💬 {task.commentsCount}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-300 text-xs italic">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Task */}
        {showNewTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Create Task</h3>
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Task summary..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional context or requirements..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl bg-white"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl bg-white"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewTaskModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingTask}
                    className="bg-[#3563F6] hover:bg-blue-700 text-white"
                  >
                    {creatingTask ? 'Saving...' : 'Add Task'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Task Detail & Comments */}
        {activeTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-200 space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{activeTask.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getPriorityBadge(activeTask.priority)}
                    <span className="text-xs text-gray-400">
                      Created by {activeTask.createdBy.firstName} {activeTask.createdBy.lastName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTask(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {activeTask.description && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Description
                    </h4>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {activeTask.description}
                    </p>
                  </div>
                )}

                {/* Status Switcher */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Status Transition
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {TASK_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleUpdateTaskStatus(activeTask.id, s.value)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                          activeTask.status === s.value
                            ? 'bg-[#3563F6] text-white border-[#3563F6]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments Thread */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Comments ({taskComments.length})
                  </h4>

                  <form onSubmit={handlePostTaskComment} className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Add a comment on this task..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3563F6] focus:outline-hidden"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={postingComment || !newComment.trim()}
                        className="bg-[#3563F6] text-white text-xs px-3 py-1"
                      >
                        {postingComment ? 'Posting...' : 'Comment'}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {taskComments.map((c) => (
                      <div key={c.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center justify-between text-gray-600 mb-0.5">
                          <span className="font-bold text-gray-900">
                            {c.author.firstName} {c.author.lastName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(activeTask.id)}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Delete Task
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTask(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
