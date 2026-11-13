import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'About AEO Nexus — Global AI-Powered Business Operating System',
  description: 'Our mission, architectural principles, and the engineering behind AEO Nexus.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="space-y-4 text-center">
          <Badge variant="primary">Our Mission</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Building the Operating System for Autonomous Commerce
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We believe the next decade of business will be defined by organizations that operate seamlessly alongside autonomous AI engines rather than treating software as a passive text box.
          </p>
        </div>

        <Card className="border-slate-200 bg-white p-6 sm:p-10 space-y-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">The Problem With Traditional SaaS</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Modern enterprises spend exorbitant sums stitching together fragmented SaaS point solutions: one tool for CRM, another for email newsletters, another for SEO keyword audits, and a dozen ad-hoc scripts to keep them in sync. When conversational AI arrived, businesses were left scrambling to copy-paste context between chat windows and separate databases.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            AEO Nexus was designed from the ground up as a unified, type-safe, multi-tenant operating system. By establishing your business profile, brand kit, and team roles in a single database layer, autonomous tools can coordinate work with zero human friction.
          </p>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 text-center">Core Engineering Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span className="text-2xl">🛡️</span>
              <h3 className="text-sm font-bold text-slate-900">Truth in Engineering</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We never advertise features that do not exist, fabricate testimonials, or inflate telemetry. What you see is backed by real code.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span className="text-2xl">⚡</span>
              <h3 className="text-sm font-bold text-slate-900">Strict Type Safety</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                From database migrations to frontend state, contracts are validated with Zod, TypeScript, and Prisma across 100% of routes.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span className="text-2xl">🌐</span>
              <h3 className="text-sm font-bold text-slate-900">True Tenant Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Data security is never an afterthought. Role guards, foreign keys, and cryptographic hashes protect your organizational assets.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-[#EAF0FF] border border-blue-200 text-center space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Explore the Platform</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Experience our centralized identity and workspace capabilities firsthand.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/register">
              <Button variant="primary" size="sm" className="text-xs">
                Create Free Workspace →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

