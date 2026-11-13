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

export default function AdminWebPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F9FC]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white hidden md:flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-[#E2E8F0] gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A36A] text-white font-bold text-sm">
            ADM
          </div>
          <div>
            <div className="text-sm font-bold text-[#1E293B]">Platform Admin</div>
            <div className="text-[10px] text-[#64748B]">Governance Plane</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium text-[#64748B]">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-50 text-[#16A36A]"
          >
            🏛️ Tenant Registry
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            📜 Audit Logs
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🔐 Security & Access
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            📊 System Telemetry
          </a>
        </nav>

        <div className="p-4 border-t border-[#E2E8F0]">
          <div className="text-xs font-semibold text-[#1E293B]">Platform Admin Session</div>
          <div className="text-[10px] text-[#64748B]">Separate from Customer Auth</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1E293B]">Platform Administration</h1>
            <Badge variant="success">Admin Role Verified</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Export Audit Trail
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <Notification variant="info" title="Separation of Concerns">
            Platform administration rights are strictly isolated from customer data spaces. Platform
            admins do not have default access to customer workspace data.
          </Notification>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Registered Tenants</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#1E293B]">432</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#16A36A]">
                100% compliant with isolation policy
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>API Gateway Health</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">100% Up</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Port 4000 NestJS Backend</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Security Incidents</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Last 30 days</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Database Connections</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#3563F6]">24</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                PostgreSQL 16 Pool Normal
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Organizations</CardTitle>
              <CardDescription>
                Active customer partitions managed under platform governance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Isolation Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">org_982310fa</TableCell>
                    <TableCell className="font-medium">Apex Global Technologies</TableCell>
                    <TableCell>
                      <Badge variant="primary">Row-Level Strict</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">org_441198cb</TableCell>
                    <TableCell className="font-medium">Vanguard Creative Agency</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Agency Multi-Seat</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Inspect
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
