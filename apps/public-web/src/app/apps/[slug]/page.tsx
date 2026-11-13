import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '../../../components/layout/public-header';
import { PublicFooter } from '../../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

interface PageProps {
  params: { slug: string };
}

const APPS_DICT: Record<
  string,
  {
    name: string;
    category: string;
    status: string;
    desc: string;
    longDesc: string;
    features: string[];
  }
> = {
  'business-profile': {
    name: 'Business Profile Manager',
    category: 'Operations',
    status: 'functional',
    desc: 'Centralize corporate entity data, industry verticals, and operating context for AI graphs.',
    longDesc:
      'The Business Profile Manager serves as the single source of operational truth in AEO Nexus. Data saved here informs all outbound marketing campaigns, schema markups, and future autonomous AI planning loops.',
    features: [
      'Comprehensive entity and incorporation tracking',
      'Industry vertical and geographic market classification',
      'Headcount and operational scale indicators',
      'Direct integration with multi-tenant workspaces',
    ],
  },
  'brand-identity': {
    name: 'Brand Kit & Voice',
    category: 'Marketing',
    status: 'functional',
    desc: 'Define your visual palette, secondary color tokens, and editorial voice guidelines.',
    longDesc:
      'Maintain visual consistency across all portals and customer communications. Primary and secondary hex color tokens, editorial voice guidelines, and logo assets are stored securely and injected into every generated deliverable.',
    features: [
      'Primary & secondary hex color palette management',
      'Editorial voice & tone preset definitions',
      'Visual asset & logo management',
      'Automated design token compliance',
    ],
  },
  'team-hub': {
    name: 'Team & Role Governance',
    category: 'Operations',
    status: 'functional',
    desc: 'Invite collaborators with granular roles (Owner, Admin, Manager, Editor, Viewer).',
    longDesc:
      'Collaborate safely across your organization. Role-based access control enforces least-privilege principles, while sole-owner protection prevents workspaces from ever being accidentally locked out.',
    features: [
      'Multi-role permission matrix',
      'Cryptographically secure member invitations',
      'Sole-owner lock-out protection',
      'Full member audit trail',
    ],
  },
  'security-hub': {
    name: 'Security & Session Monitor',
    category: 'Operations',
    status: 'functional',
    desc: 'Enterprise device session visibility, IP tracking, and instant remote session revocation.',
    longDesc:
      'Active session tracking provides complete visibility over connected web browsers and mobile devices. Allows users to remotely terminate stale or suspicious sessions with immediate refresh token revocation.',
    features: [
      'Real-time active session monitoring',
      'Device and browser user-agent detection',
      'Immediate remote session revocation',
      'Bcrypt-secured password rotation',
    ],
  },
  'ai-business-agent': {
    name: 'AI Business Agent',
    category: 'AI & Automation',
    status: 'coming-soon',
    desc: 'Autonomous multi-modal business operations co-pilot delivering 24/7 strategic execution.',
    longDesc:
      'The centerpiece of the future AEO Nexus roadmap. The AI Business Agent autonomously inspects search engine citations, discovers high-intent commercial keywords, and coordinates execution across all Nexus tools.',
    features: [
      'Autonomous objective decomposition',
      'Continuous market surveillance',
      'Cross-tool workflow orchestration',
      'Explainable AI reasoning transcripts',
    ],
  },
  'aeo-optimizer': {
    name: 'Answer Engine Optimizer',
    category: 'Marketing',
    status: 'coming-soon',
    desc: 'Optimize citation frequency across Perplexity, ChatGPT, and Google Gemini conversational search.',
    longDesc:
      'Answer Engine Optimization represents the next generation of search engine visibility. Optimize your structured data and citations so that LLMs recommend your business when prospective customers ask for solutions.',
    features: [
      'AI citation and brand mention tracking',
      'Structured entity markup generator',
      'Conversational query gap analysis',
      'Synthetic search audit simulator',
    ],
  },
};

export default function PublicAppDetailPage({ params }: PageProps) {
  const app = APPS_DICT[params.slug];

  if (!app) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <Link href="/apps" className="text-xs text-slate-500 hover:text-slate-800 font-semibold">
            ← Back to Tool Catalog
          </Link>
          <Badge variant={app.status === 'functional' ? 'success' : 'outline'}>
            {app.status === 'functional' ? 'Active In OS' : 'Scheduled Milestone'}
          </Badge>
        </div>

        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {app.category}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">{app.name}</h1>
          <p className="text-base text-slate-600 leading-relaxed">{app.longDesc}</p>
        </div>

        <Card className="border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <CardTitle className="text-base text-slate-900">Key Capabilities & Architecture</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {app.features.map((feat, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-[#F7F9FC] flex items-start gap-2.5 text-xs text-slate-800">
                <span className="text-[#3563F6] font-bold">✓</span>
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Ready to test in a secure isolated workspace?
            </span>
            <Link href="/register">
              <Button variant="primary" className="text-xs">
                Launch in Free Workspace →
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}

