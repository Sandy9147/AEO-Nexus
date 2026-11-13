'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';
import { NotificationDto, ActivityEventDto, NotificationType } from '@aeo-nexus/contracts';
import { getApiClient } from '../../lib/api';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'activity'>('notifications');
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEventDto[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      if (activeTab === 'notifications') {
        const notifs = await client.getNotifications(workspaceId, unreadOnly);
        setNotifications(notifs);
      } else {
        const events = await client.getActivityFeed(workspaceId, 30);
        setActivityEvents(events);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications or activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      const updated = await client.markNotificationRead(workspaceId, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const workspaceId = localStorage.getItem('aeo_active_workspace_id');
      if (!workspaceId) return;

      const client = getApiClient();
      await client.markAllNotificationsRead(workspaceId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      alert(err.message || 'Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'PROJECT_INVITE':
        return '📁';
      case 'TASK_ASSIGNED':
        return '🎯';
      case 'TASK_STATUS_CHANGED':
        return '🔄';
      case 'COMMENT_ADDED':
        return '💬';
      case 'ASSET_UPLOADED':
        return '📄';
      case 'DOCUMENT_PUBLISHED':
        return '📚';
      case 'SYSTEM_ALERT':
      default:
        return '🔔';
    }
  };

  return (
    <CustomerShell>
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Notification Center
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Stay informed on task updates, assignments, discussions, and team activity.
            </p>
          </div>
          {activeTab === 'notifications' && notifications.some((n) => !n.isRead) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Tab switchers */}
        <div className="flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-4 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'notifications'
                  ? 'border-[#3563F6] text-[#3563F6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-[#3563F6] text-[#3563F6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Workspace Activity Feed
            </button>
          </div>

          {activeTab === 'notifications' && (
            <label className="flex items-center gap-2 text-xs text-gray-600 font-medium pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded-sm border-gray-300 text-[#3563F6] focus:ring-[#3563F6]"
              />
              Unread only
            </label>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'notifications' ? (
          notifications.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl p-8 shadow-xs">
              <div className="w-14 h-14 mx-auto bg-blue-50 text-[#3563F6] rounded-full flex items-center justify-center text-2xl mb-3">
                🔔
              </div>
              <h3 className="text-base font-bold text-gray-900">All caught up!</h3>
              <p className="text-xs text-gray-400 mt-1">
                {unreadOnly ? 'No unread notifications.' : 'You have no notifications yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    n.isRead
                      ? 'bg-white border-gray-100 text-gray-600'
                      : 'bg-blue-50/30 border-blue-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{getNotificationIcon(n.type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#3563F6]" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs text-[#3563F6] hover:underline font-semibold whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Activity Feed */
          activityEvents.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl p-8 shadow-xs">
              <h3 className="text-base font-bold text-gray-900">No activity yet</h3>
              <p className="text-xs text-gray-400 mt-1">
                Actions taken in this workspace will appear here chronologically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 font-bold text-gray-700 flex items-center justify-center text-xs">
                      {evt.actor.firstName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">
                        {evt.actor.firstName} {evt.actor.lastName}
                      </span>{' '}
                      <span className="text-gray-500 font-medium">
                        {evt.action} {evt.entityType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {new Date(evt.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </CustomerShell>
  );
}
