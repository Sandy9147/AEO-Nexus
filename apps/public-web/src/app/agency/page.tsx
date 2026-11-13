import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'For Agencies & Partners — AEO Nexus Global Business OS',
  description: 'Deliver Answer Engine Optimization and automated growth workflows across all client accounts.',
};

export default function AgencyPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="primary">Agency Operating System</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Scale Client Retainers With AI-Native Operations
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Eliminate operational chaos. Manage dozens of client brands from a single pane of glass with granular agency roles and isolated database boundaries.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/register">
              <Button size="lg" variant="primary" className="text-xs">
                Apply for Agency Partner Program →
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
            <div className="text-3xl mb-1">🏢</div>
            <CardTitle className="text-base text-slate-900">Multi-Client Tenant Isolation</CardTitle>
            <CardDescription className="text-xs text-slate-600 leading-relaxed">
              Every client operates within their own isolated workspace and database boundary. Switch clients seamlessly without logging in and out.
            </CardDescription>
          </Card>

          <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
            <div className="text-3xl mb-1">👥</div>
            <CardTitle className="text-base text-slate-900">Granular Agency Roles</CardTitle>
            <CardDescription className="text-xs text-slate-600 leading-relaxed">
              Enforce role-based boundaries with Agency Owner, Agency Admin, Account Manager, Creative Editor, and Client-Read-Only roles.
            </CardDescription>
          </Card>

          <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
            <div className="text-3xl mb-1">📊</div>
            <CardTitle className="text-base text-slate-900">AEO Client Deliverables</CardTitle>
            <CardDescription className="text-xs text-slate-600 leading-relaxed">
              Deliver measurable Answer Engine Optimization reports demonstrating client citation growth across conversational AI engines.
            </CardDescription>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

