import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Resources & Knowledge — AEO Nexus Global Business OS',
  description: 'Articles, architectural whitepapers, and guides on Answer Engine Optimization and modern SaaS engineering.',
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="primary">Knowledge Base</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Resources, Guides & Architecture
          </h1>
          <p className="text-sm text-slate-600">
            Master the fundamentals of Answer Engine Optimization and modern multi-tenant software engineering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-[#3563F6]">GUIDE</span>
              <h3 className="text-base font-bold text-slate-900">The 2026 Guide to Answer Engine Optimization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                How conversational AI models discover, parse, and cite brand entities in organic answers.
              </p>
            </div>
            <Link href="/blog" className="text-xs text-[#3563F6] font-semibold hover:underline pt-3 border-t border-slate-100">
              Read Guide →
            </Link>
          </Card>

          <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-[#6554E8]">WHITEPAPER</span>
              <h3 className="text-base font-bold text-slate-900">Zero-Trust SaaS Multi-Tenancy Architecture</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Implementing tenant isolation, role-based guards, and anti-replay token security using NestJS & Neon.
              </p>
            </div>
            <Link href="/about" className="text-xs text-[#6554E8] font-semibold hover:underline pt-3 border-t border-slate-100">
              Read Architecture →
            </Link>
          </Card>

          <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-600">PLAYBOOK</span>
              <h3 className="text-base font-bold text-slate-900">Brand Kit Token Synchronization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                How to maintain absolute visual and voice consistency across programmatic digital deliverables.
              </p>
            </div>
            <Link href="/apps/brand-identity" className="text-xs text-emerald-600 font-semibold hover:underline pt-3 border-t border-slate-100">
              Explore Brand Kit →
            </Link>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

