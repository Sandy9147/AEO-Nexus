import React from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@aeo-nexus/ui';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#3563F6] to-[#6554E8] text-white font-bold text-lg shadow-sm">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1E293B]">
              AEO <span className="text-[#3563F6]">Nexus</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#64748B]">
            <a href="#features" className="transition hover:text-[#3563F6]">
              Platform
            </a>
            <a href="#solutions" className="transition hover:text-[#3563F6]">
              Solutions
            </a>
            <a href="#architecture" className="transition hover:text-[#3563F6]">
              Architecture
            </a>
            <a href="http://localhost:3001" className="transition hover:text-[#3563F6]">
              Customer Portal
            </a>
            <a href="http://localhost:3002" className="transition hover:text-[#3563F6]">
              Agency Portal
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <a href="http://localhost:3001">
              <Button variant="outline" size="sm">
                Log In
              </Button>
            </a>
            <a href="http://localhost:3001">
              <Button size="sm">Get Started</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF0FF] px-4 py-1.5 text-xs font-semibold text-[#3563F6] mb-8">
              <span className="h-2 w-2 rounded-full bg-[#3563F6] animate-pulse" />
              Phase 1 Monorepo & Development Foundation Active
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-[#1E293B] sm:text-6xl sm:leading-tight">
              The Global AI-Powered <br />
              <span className="bg-gradient-to-r from-[#3563F6] to-[#6554E8] bg-clip-text text-transparent">
                Business Operating System
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-[#64748B]">
              Harmonize AI agents, automated workflow orchestration, agency multi-tenancy, and deep
              customer analytics into a single unified operating surface.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a href="http://localhost:3001">
                <Button size="lg" className="shadow-lg shadow-[#3563F6]/20">
                  Launch Customer Dashboard
                </Button>
              </a>
              <a href="http://localhost:3002">
                <Button variant="secondary" size="lg">
                  Explore Agency Portal
                </Button>
              </a>
            </div>

            {/* Quick Portal Switcher */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto text-left">
              <a
                href="http://localhost:3001"
                className="block p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#3563F6] transition"
              >
                <Badge variant="primary" className="mb-2">
                  Port 3001
                </Badge>
                <div className="font-semibold text-sm">Customer Web</div>
                <div className="text-xs text-[#64748B] mt-1">Tenant analytics & workflows</div>
              </a>
              <a
                href="http://localhost:3002"
                className="block p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#6554E8] transition"
              >
                <Badge variant="secondary" className="mb-2">
                  Port 3002
                </Badge>
                <div className="font-semibold text-sm">Agency Web</div>
                <div className="text-xs text-[#64748B] mt-1">Multi-client operational cockpit</div>
              </a>
              <a
                href="http://localhost:3003"
                className="block p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#16A36A] transition"
              >
                <Badge variant="success" className="mb-2">
                  Port 3003
                </Badge>
                <div className="font-semibold text-sm">Admin Web</div>
                <div className="text-xs text-[#64748B] mt-1">Platform tenant governance</div>
              </a>
              <a
                href="http://localhost:3004"
                className="block p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#E59A27] transition"
              >
                <Badge variant="warning" className="mb-2">
                  Port 3004
                </Badge>
                <div className="font-semibold text-sm">Superadmin Web</div>
                <div className="text-xs text-[#64748B] mt-1">Global infrastructure control</div>
              </a>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section id="features" className="py-16 bg-[#EEF0FF]/30 border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-[#1E293B]">
                Engineered for High-Scale Enterprise Autonomy
              </h2>
              <p className="mt-2 text-[#64748B]">
                Strict tenant boundaries, typed contracts, and event-driven architecture.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-[#EAF0FF] flex items-center justify-center text-[#3563F6] font-bold mb-2">
                    ⚡
                  </div>
                  <CardTitle>Autonomous Workflows</CardTitle>
                  <CardDescription>Event-driven state machines with BullMQ queues</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-[#64748B]">
                  Distribute asynchronous background operations across reliable Redis queues with
                  real-time health telemetry.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-[#EEF0FF] flex items-center justify-center text-[#6554E8] font-bold mb-2">
                    🛡️
                  </div>
                  <CardTitle>Isolated Tenancy</CardTitle>
                  <CardDescription>Strict server-side membership verification</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-[#64748B]">
                  Platform administration is strictly separated from tenant authorizations.
                  Workspace IDs are never blindly trusted.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[#16A36A] font-bold mb-2">
                    📐
                  </div>
                  <CardTitle>Unified Design Tokens</CardTitle>
                  <CardDescription>Consistent across web and Flutter mobile</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-[#64748B]">
                  Every portal and mobile interface shares the same design vocabulary: Inter
                  typography and high-contrast light accents.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B]">
          <p>
            © {new Date().getFullYear()} AEO Nexus. All rights reserved. Production-oriented
            monorepo foundation.
          </p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <span>Primary: #3563F6</span>
            <span>Accent: #6554E8</span>
            <span>API: Port 4000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
