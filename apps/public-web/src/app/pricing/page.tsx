import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Pricing & Plans — AEO Nexus Global Business OS',
  description: 'Transparent subscription tiers for startups, scaling brands, and digital agencies.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="primary">Predictable Pricing</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Simple, Transparent Subscription Plans
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            All plans include our centralized authentication engine, isolated PostgreSQL database multi-tenancy, and access to the tools catalog.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Starter Workspace</h3>
              <p className="text-xs text-slate-500">For early-stage startups and lean teams</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">$49</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ 1 Active Tenant Workspace</li>
                <li className="flex items-center gap-2">✓ Business Context & Brand Kit</li>
                <li className="flex items-center gap-2">✓ Up to 3 Team Collaborators</li>
                <li className="flex items-center gap-2">✓ Access to Active Tool Suite</li>
                <li className="flex items-center gap-2">✓ Standard Community Support</li>
              </ul>
            </div>

            <Link href="/register" className="block pt-4">
              <Button variant="outline" className="w-full text-xs">
                Start Free 14-Day Trial
              </Button>
            </Link>
          </Card>

          <Card className="border-[#3563F6] bg-white p-6 sm:p-8 space-y-6 shadow-xl relative ring-2 ring-[#3563F6] flex flex-col justify-between">
            <div className="absolute -top-3 right-6">
              <Badge variant="primary" className="text-[10px]">Recommended</Badge>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Growth OS</h3>
              <p className="text-xs text-slate-500">For established businesses accelerating market reach</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">$149</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ 3 Tenant Workspaces</li>
                <li className="flex items-center gap-2">✓ Up to 15 Team Members with RBAC</li>
                <li className="flex items-center gap-2">✓ Full Answer Engine Optimization (AEO)</li>
                <li className="flex items-center gap-2">✓ Background BullMQ Automations</li>
                <li className="flex items-center gap-2">✓ Priority Email & Chat Support</li>
                <li className="flex items-center gap-2">✓ Early Access to Phase 4 AI Business Agent</li>
              </ul>
            </div>

            <Link href="/register" className="block pt-4">
              <Button variant="primary" className="w-full text-xs">
                Start Growth Trial →
              </Button>
            </Link>
          </Card>

          <Card className="border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Agency & Enterprise</h3>
              <p className="text-xs text-slate-500">For agencies managing dozens of client accounts</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">Custom</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Unlimited Client Workspaces</li>
                <li className="flex items-center gap-2">✓ Dedicated Agency Portal Access</li>
                <li className="flex items-center gap-2">✓ Custom Domain White-Labeling</li>
                <li className="flex items-center gap-2">✓ Dedicated Solution Architect</li>
                <li className="flex items-center gap-2">✓ Enterprise SSO & Strict SLA</li>
              </ul>
            </div>

            <Link href="/contact" className="block pt-4">
              <Button variant="outline" className="w-full text-xs">
                Contact Enterprise Sales
              </Button>
            </Link>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

