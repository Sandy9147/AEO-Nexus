'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Notification,
  Modal,
  Input,
} from '@aeo-nexus/ui';

export default function CustomerDashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  return (
    <div className="flex min-h-screen bg-[#F7F9FC]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white hidden md:flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-[#E2E8F0] gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#3563F6] to-[#6554E8] text-white font-bold text-sm">
            N
          </div>
          <div>
            <div className="text-sm font-bold text-[#1E293B]">AEO Nexus</div>
            <div className="text-[10px] text-[#64748B]">Customer Workspace</div>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="p-4 border-b border-[#E2E8F0]">
          <div className="text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wider">
            Active Tenant
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F7F9FC]">
            <div className="text-sm font-medium text-[#1E293B]">Acme Global Corp</div>
            <Badge variant="primary">Owner</Badge>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 text-sm font-medium text-[#64748B]">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#EAF0FF] text-[#3563F6]"
          >
            📊 Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            ⚡ Workflows
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🤖 AI Agents
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🔌 Integrations
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            👥 Team Members
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            ⚙️ Settings
          </a>
        </nav>

        {/* Bottom Profile */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between">
          <div className="text-xs">
            <div className="font-semibold text-[#1E293B]">Sarah Jenkins</div>
            <div className="text-[#64748B]">sarah@acme.com</div>
          </div>
          <Badge variant="outline">Client</Badge>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1E293B]">Workspace Overview</h1>
            <Badge variant="success">API v0.1 Connected</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
              + Create Workspace
            </Button>
            <Button size="sm">New Workflow</Button>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Status Alert */}
          <Notification variant="info" title="Phase 1 Foundation Operational">
            The multi-tenant architecture is active with server-side workspace verification and
            typed contract bindings.
          </Notification>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Workflows</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#3563F6]">12</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">↑ 3 launched this week</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>AI Agents Deployed</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#6554E8]">4</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                Autonomous business agents
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Queue Processing</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">Healthy</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                BullMQ worker 0ms backlog
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tenant Isolation</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#1E293B]">Enforced</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                Server-side RBAC guard verified
              </CardContent>
            </Card>
          </div>

          {/* Recent Workflows Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Workflows</CardTitle>
                <CardDescription>Active executions running in this workspace</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Execution</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Lead Enrichment Agent</TableCell>
                    <TableCell>Webhook / CRM</TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-[#64748B]">2 minutes ago</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Weekly Executive Summary</TableCell>
                    <TableCell>Cron Schedule</TableCell>
                    <TableCell>
                      <Badge variant="primary">Queued</Badge>
                    </TableCell>
                    <TableCell className="text-[#64748B]">1 hour ago</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Customer Onboarding Flow</TableCell>
                    <TableCell>User Signup</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Running</Badge>
                    </TableCell>
                    <TableCell className="text-[#64748B]">Just now</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* New Workspace Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Workspace"
        description="Provision an isolated tenant partition for your team."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(false)}>
              Create Workspace
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Acme Marketing"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
          <Input
            label="Workspace Slug"
            placeholder="acme-marketing"
            disabled
            value={workspaceName.toLowerCase().replace(/\s+/g, '-')}
          />
        </div>
      </Modal>
    </div>
  );
}
