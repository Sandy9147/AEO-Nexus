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

export default function SuperadminPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F9FC]">
      <aside className="w-64 border-r border-[#E2E8F0] bg-white hidden md:flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-[#E2E8F0] gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E59A27] to-[#E53E3E] text-white font-bold text-sm">
            ROOT
          </div>
          <div>
            <div className="text-sm font-bold text-[#1E293B]">Superadmin</div>
            <div className="text-[10px] text-[#64748B]">Platform Control Center</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium text-[#64748B]">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50 text-[#E59A27]"
          >
            🌐 Global Overview
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🖥️ Service Health & Mesh
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🗄️ Database & Prisma
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            ⚡ Redis & BullMQ
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#1E293B]"
          >
            🚩 Feature Flags
          </a>
        </nav>

        <div className="p-4 border-t border-[#E2E8F0]">
          <Badge variant="warning" className="w-full justify-center py-1">
            Root Authority: Active
          </Badge>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1E293B]">
              Superadmin Infrastructure Cockpit
            </h1>
            <Badge variant="warning">Port 3004</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="danger" size="sm">
              Emergency Maintenance Mode
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <Notification variant="warning" title="Privileged Operational Zone">
            This surface controls global routing, database migrations, and cross-cluster resource
            limits. All actions are appended to immutable audit tables.
          </Notification>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Neon Hosted PostgreSQL</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">Healthy</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                Neon Pooled & Direct Connections
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Redis BullMQ Nodes</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">100% Up</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Memory: 48MB / 4GB</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Microservices Online</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#3563F6]">8 / 8</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">
                All monorepo services healthy
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Global Error Rate</CardDescription>
                <CardTitle className="text-2xl font-bold text-[#16A36A]">0.00%</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#64748B]">Across all portals</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Services Status</CardTitle>
              <CardDescription>Infrastructure node telemetry and connection status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">apps/api</TableCell>
                    <TableCell>NestJS Core Backend</TableCell>
                    <TableCell className="font-mono text-xs">4000</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">apps/worker</TableCell>
                    <TableCell>BullMQ Asynchronous Worker</TableCell>
                    <TableCell className="font-mono text-xs">-</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">apps/public-web</TableCell>
                    <TableCell>Next.js Marketing</TableCell>
                    <TableCell className="font-mono text-xs">3000</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">apps/customer-web</TableCell>
                    <TableCell>Next.js Customer Dashboard</TableCell>
                    <TableCell className="font-mono text-xs">3001</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">apps/agency-web</TableCell>
                    <TableCell>Next.js Agency Portal</TableCell>
                    <TableCell className="font-mono text-xs">3002</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">apps/admin-web</TableCell>
                    <TableCell>Next.js Platform Admin</TableCell>
                    <TableCell className="font-mono text-xs">3003</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">apps/superadmin-web</TableCell>
                    <TableCell>Next.js Superadmin Control</TableCell>
                    <TableCell className="font-mono text-xs">3004</TableCell>
                    <TableCell>
                      <Badge variant="success">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
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
