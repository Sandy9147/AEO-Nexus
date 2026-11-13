import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '../../../components/layout/public-header';
import { PublicFooter } from '../../../components/layout/public-footer';
import { Card, CardTitle, Button, Badge } from '@aeo-nexus/ui';

interface SolutionDetails {
  name: string;
  tagline: string;
  challenges: string[];
  capabilities: string[];
  cta: string;
}

const INDUSTRY_MAP: Record<string, SolutionDetails> = {
  saas: {
    name: 'SaaS & Enterprise Technology',
    tagline: 'Dominate conversational AI answers and scale high-intent trial signups.',
    challenges: [
      'High paid customer acquisition costs on traditional ad networks',
      'AI answer engines recommending competitor software over your solution',
      'Fragmented team operations between marketing and customer telemetry',
    ],
    capabilities: [
      'Structured technical documentation schema for generative search',
      'Real-time citation tracking across Perplexity and Gemini',
      'Multi-tenant workspace isolation for distinct product lines',
    ],
    cta: 'Scale Your B2B SaaS Authority',
  },
  ecommerce: {
    name: 'E-Commerce & DTC Brands',
    tagline: 'Transform product catalogs into high-converting AI shopping recommendations.',
    challenges: [
      'Declining return on ad spend (ROAS) across social channels',
      'Conversational AI chatbots directing shoppers to generic marketplaces',
      'Manual brand token consistency across thousands of product assets',
    ],
    capabilities: [
      'Automated product entity graphs and rich snippets',
      'Direct-to-consumer conversational attribution tracking',
      'Unified brand kit enforcement across campaign creatives',
    ],
    cta: 'Optimize Your Commerce Graph',
  },
  healthcare: {
    name: 'Healthcare & Life Sciences',
    tagline: 'Ensure factual authority and brand compliance across health queries.',
    challenges: [
      'Stringent regulatory compliance and risk of hallucinated citations',
      'Building patient trust in an increasingly automated search landscape',
      'Managing multi-clinic or multi-doctor organizational structures',
    ],
    capabilities: [
      'Factual entity graphs verified against primary clinical research',
      'Strict multi-tenant security backed by Neon PostgreSQL',
      'Audit log tracking for every brand guideline modification',
    ],
    cta: 'Build Factual Medical Authority',
  },
  'professional-services': {
    name: 'Consulting & Professional Services',
    tagline: 'Turn partner expertise into authoritative organic and AI citations.',
    challenges: [
      'Relying solely on word-of-mouth for enterprise consulting deals',
      'Slow, manual proposal writing and client context management',
      'Inconsistent brand presentation across practice areas',
    ],
    capabilities: [
      'Executive thought leadership calibration for AI research queries',
      'Centralized organization context powering proposal drafts',
      'Collaborative team access with sole-owner protection',
    ],
    cta: 'Scale Your Practice on Nexus',
  },
};

export default function IndustrySolutionPage({ params }: { params: { industry: string } }) {
  const sol = INDUSTRY_MAP[params.industry];

  if (!sol) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="space-y-4">
          <Link href="/solutions" className="text-xs text-slate-500 hover:text-slate-800 font-semibold">
            ← Back to Industry Solutions
          </Link>
          <div className="pt-2">
            <Badge variant="primary">Industry Blueprint</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">{sol.name}</h1>
          <p className="text-base text-slate-600 leading-relaxed">{sol.tagline}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 bg-white p-6 space-y-4 shadow-sm">
            <CardTitle className="text-base text-slate-900">Industry Challenges Addressed</CardTitle>
            <div className="space-y-2">
              {sol.challenges.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-6 space-y-4 shadow-sm">
            <CardTitle className="text-base text-slate-900">Nexus OS Capabilities</CardTitle>
            <div className="space-y-2">
              {sol.capabilities.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-[#3563F6] to-[#6554E8] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{sol.cta}</h3>
            <p className="text-xs text-blue-100 mt-1">Initialize your specialized workspace in 2 minutes.</p>
          </div>
          <Link href="/register">
            <Button size="lg" className="bg-white text-[#3563F6] hover:bg-slate-100 font-bold text-xs shrink-0">
              Get Started Free →
            </Button>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

