'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CustomerShell } from '../../components/layout/customer-shell';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
} from '@aeo-nexus/ui';
import { WorkspaceMemberInfo, WorkspaceInvitationInfo } from '@aeo-nexus/contracts';

const WORKSPACE_ROLES = [
  { value: 'WORKSPACE_ADMIN', label: 'Admin (Full workspace control)' },
  { value: 'WORKSPACE_MANAGER', label: 'Manager (Manage tools & content)' },
  { value: 'EDITOR', label: 'Editor (Create and edit assets)' },
  { value: 'VIEWER', label: 'Viewer (Read-only visibility)' },
];

export default function TeamPage() {
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EDITOR');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const loadTeamData = useCallback(async (wsId: string, token: string) => {
    try {
      setLoading(true);
      setError(null);

      const [membersRes, invitesRes] = await Promise.all([
        fetch(`${API_BASE}/workspaces/${wsId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/workspaces/${wsId}/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const membersJson = await membersRes.json();
      const invitesJson = await invitesRes.json();

      if (membersRes.ok && membersJson.success) {
        setMembers(membersJson.data);
      }
      if (invitesRes.ok && invitesJson.success) {
        setInvitations(invitesJson.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading team data');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');

    if (!token || !wsId) return;
    setActiveWorkspaceId(wsId);
    loadTeamData(wsId, token);
  }, [loadTeamData]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('aeo_access_token');
    const wsId = activeWorkspaceId;

    if (!token || !wsId || !inviteEmail.trim()) return;

    try {
      setSendingInvite(true);
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'Failed to send workspace invitation');
      }

      setSuccess(`Invitation successfully dispatched to ${inviteEmail}`);
      setInviteEmail('');
      loadTeamData(wsId, token);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    const wsId = activeWorkspaceId;
    if (!token || !wsId) return;

    try {
      await fetch(`${API_BASE}/workspaces/${wsId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Invitation cancelled');
      loadTeamData(wsId, token);
    } catch {
      setError('Unable to cancel invitation');
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Governance
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-emerald-600">Access Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Team & Role Management
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Invite collaborators, manage tenant roles, and inspect active workspace members. Roles and permissions are strictly enforced server-side.
            </p>
          </div>

          <Link href="/settings">
            <Button size="sm" variant="outline" className="text-xs">
              Workspace Settings
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
            {success}
          </div>
        )}

        {/* Invite Member Form */}
        <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-slate-900">Invite New Collaborator</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Send a secure, cryptographically hashed invitation link valid for 7 days.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="sm:col-span-2">
              <Input
                type="email"
                placeholder="colleague@yourcompany.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="text-xs bg-white"
              />
            </div>
            <div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
              >
                {WORKSPACE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={sendingInvite}>
                {sendingInvite ? 'Dispatching Invite...' : 'Send Invitation →'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Active Members Table */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base text-slate-900">Active Workspace Members</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Users with current authentication permissions in this tenant
              </CardDescription>
            </div>
            <Badge variant="outline">{members.length} Active</Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading team members...</div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No members found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#EAF0FF] text-[#3563F6] font-bold text-xs flex items-center justify-center">
                        {member.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={member.role === 'WORKSPACE_OWNER' ? 'primary' : 'outline'}
                        className="text-[10px]"
                      >
                        {member.role.replace('WORKSPACE_', '')}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        Joined {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations Table */}
        {invitations.length > 0 && (
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900">Pending Invitations</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Invitations sent awaiting recipient acceptance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 text-xs">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{inv.email}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Assigned Role: {inv.role.replace('WORKSPACE_', '')} • Expires:{' '}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-rose-600 hover:text-rose-700"
                    onClick={() => handleCancelInvite(inv.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerShell>
  );
}

