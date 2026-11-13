import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Apps & Tools Catalog — AEO Nexus Global Business OS',
  description: 'Browse the central application catalog for operations, brand systems, and marketing automation.',
};

const PUBLIC_CATALOG = [
  {
    slug: 'business-profile',
    name: 'Business Profile Manager',
    category: 'Operations',
    status: 'functional',
    desc: 'Centralize corporate entity data, industry verticals, and operating context for AI graphs.',
    features: ['Entity data management', 'Multi-country classification', 'Context sync with AI agents'],
  },
  {
    slug: 'brand-identity',
    name: 'Brand Kit & Voice',
    category: 'Marketing',
    status: 'functional',
    desc: 'Define your visual palette, secondary color tokens, and editorial voice guidelines.',
    features: ['Hex color management', 'Editorial tone selection', 'Design token enforcement'],
  },
  {
    slug: 'team-hub',
    name: 'Team & Role Governance',
    category: 'Operations',
    status: 'functional',
    desc: 'Invite collaborators with granular roles (Owner, Admin, Manager, Editor, Viewer).',
    features: ['Cryptographic invitations', 'Role-based access control', 'Sole-owner protection'],
  },
  {
    slug: 'security-hub',
    name: 'Security & Session Monitor',
    category: 'Operations',
    status: 'functional',
    desc: 'Enterprise device session visibility, IP tracking, and instant remote session revocation.',
    features: ['Active session telemetry', 'Remote revocation', 'Compromise detection'],
  },
  {
    slug: 'ai-business-agent',
    name: 'AI Business Agent',
    category: 'AI & Automation',
    status: 'coming-soon',
    desc: 'Autonomous multi-modal business operations co-pilot delivering 24/7 strategic execution.',
    features: ['Continuous market surveillance', 'Autonomous planning', 'Multi-modal reasoning'],
  },
  {
    slug: 'aeo-optimizer',
    name: 'Answer Engine Optimizer',
    category: 'Marketing',
    status: 'coming-soon',
    desc: 'Optimize citation frequency across Perplexity, ChatGPT, and Google Gemini conversational search.',
    features: ['AEO citation audit', 'JSON-LD schema generation', 'Conversational query gap analysis'],
  },
  {
    slug: 'content-studio',
    name: 'AI Content Studio',
    category: 'Content',
    status: 'coming-soon',
    desc: 'Generate high-authority articles and brand collateral designed specifically for organic citations.',
    features: ['Long-form publishing', 'Brand voice compliance', 'Automated social repurposing'],
  },
  {
    slug: 'workflow-automation',
    name: 'Workflow Automation Engine',
    category: 'Operations',
    status: 'coming-soon',
    desc: 'Build resilient event-driven background queues and webhook integrations with Redis.',
    features: ['Visual triggers', 'BullMQ background queues', 'Third-party integrations'],
  },
];

export default function PublicAppsPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="primary">Application Ecosystem</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Modular Applications Built on One OS
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every application shares the same Neon PostgreSQL database, authentication system, and business context layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PUBLIC_CATALOG.map((app) => (
            <Card
              key={app.slug}
              className="border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-[#3563F6]/50 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {app.category}
                  </span>
                  <Badge variant={app.status === 'functional' ? 'success' : 'outline'} className="text-[10px]">
                    {app.status === 'functional' ? 'Active' : 'Roadmap'}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900">{app.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{app.desc}</p>
                <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
                  {app.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="text-[#3563F6] font-bold">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <Link href={`/apps/${app.slug}`} className="text-xs font-semibold text-[#3563F6] hover:underline">
                  Specifications →
                </Link>
                <Link href="/register">
                  <Button size="sm" variant={app.status === 'functional' ? 'primary' : 'outline'} className="text-xs">
                    {app.status === 'functional' ? 'Try Free' : 'Join Waitlist'}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

