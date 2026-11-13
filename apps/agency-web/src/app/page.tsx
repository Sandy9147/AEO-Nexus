import React from 'react';
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
} from '@aeo-nexus/ui';

export default function AgencyPortalPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F9FC]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white hidden md:flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-[#E2E8F0] gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#6554E8] to-[#3563F6] text-white font-bold text-sm">
            A
          </div>
          <div>
            <div className="text-sm font-bold text-[#1E293B]">Nexus Agency</div>
            <div className="text-[10px] text-[#64748B]">Multi-Client Control</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium text-[#64748B]">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#EEF0FF] text-[#6554E8]"
          >
            🏢 Clients & Accounts
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            ⚡ Shared Workflows
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🤖 Agent Blueprints
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            📈 Cross-Client Analytics
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            👥 Agency Staff
          </a>
        </nav>

        <div className="p-4 border-t border-[#E2E8F0]">
          <Badge variant="secondary" className="w-full justify-center py-1">
            Agency Tier: Enterprise
          </Badge>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1E293B]">Agency Management Cockpit</h1>
            <Badge variant="secondary">Port 3002</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              + Onboard New Client
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <Notification variant="info" title="Agency Tenancy Isolation">
            Each managed client operates within its own cryptographic and database partition. No
            cross-tenant data leakage is permitted.
          </Notification>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Managed Client Workspaces</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#6554E8]">28</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Active client accounts</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Autonomous Jobs</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#3563F6]">148,290</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Executed this month</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Agency Operators</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">14</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Assigned team members</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Client SLA Health</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">99.98%</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                Across all BullMQ clusters
              </CardContent>
            </Card>
          </div>

          {/* Managed Client Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Client Portfolios</CardTitle>
                <CardDescription>
                  Real-time telemetry and management across tenant accounts
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                Filter By Sector
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Organization</TableHead>
                    <TableHead>Assigned Manager</TableHead>
                    <TableHead>Active Agents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Apex FinTech Corp</TableCell>
                    <TableCell>Marcus Sterling</TableCell>
                    <TableCell>8 Agents</TableCell>
                    <TableCell>
                      <Badge variant="success">Optimal</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Enter Tenant
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nordic Retail Group</TableCell>
                    <TableCell>Elena Rostova</TableCell>
                    <TableCell>14 Agents</TableCell>
                    <TableCell>
                      <Badge variant="success">Optimal</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Enter Tenant
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Horizon Logistics</TableCell>
                    <TableCell>David Chen</TableCell>
                    <TableCell>5 Agents</TableCell>
                    <TableCell>
                      <Badge variant="warning">Syncing</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Enter Tenant
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
