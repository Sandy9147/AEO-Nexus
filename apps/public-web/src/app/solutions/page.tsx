import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardTitle, CardDescription, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Industry Solutions — AEO Nexus Global Business OS',
  description: 'Explore tailored business operating systems for SaaS, E-Commerce, Healthcare, and Agencies.',
};

const SOLUTIONS = [
  {
    slug: 'saas',
    name: 'SaaS & Enterprise Technology',
    icon: '💻',
    desc: 'Establish category ownership in conversational AI citations, capture high-intent software buyers, and automate enterprise client onboarding.',
    stats: 'Engineered for B2B trial conversions and ARR growth.',
  },
  {
    slug: 'ecommerce',
    name: 'E-Commerce & DTC Brands',
    icon: '🛍️',
    desc: 'Generate structured product schemas that AI shopping assistants cite when consumers ask for product recommendations.',
    stats: 'Direct attribution from conversational search to cart.',
  },
  {
    slug: 'healthcare',
    name: 'Healthcare & Life Sciences',
    icon: '🩺',
    desc: 'Maintain factual medical citation authority and build patient trust with strict brand compliance and secure multi-tenant data.',
    stats: 'Engineered for regulatory compliance and factual clarity.',
  },
  {
    slug: 'professional-services',
    name: 'Consulting & Professional Services',
    icon: '📊',
    desc: 'Position partners and consultants as top authorities in executive AI queries, automate client proposals, and streamline workflows.',
    stats: 'Turn expertise into programmatic authority.',
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="primary">Industry Blueprints</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Tailored For Your Industry&apos;s Growth Mechanics
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every vertical operates with unique compliance constraints, customer acquisition funnels, and answer engine citation criteria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {SOLUTIONS.map((sol) => (
            <Card key={sol.slug} className="border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between hover:border-[#3563F6]/50 transition">
              <div className="space-y-4">
                <span className="text-4xl">{sol.icon}</span>
                <CardTitle className="text-xl font-bold text-slate-900">{sol.name}</CardTitle>
                <CardDescription className="text-xs text-slate-600 leading-relaxed">
                  {sol.desc}
                </CardDescription>
                <div className="p-3 rounded-lg border border-slate-100 bg-[#F7F9FC] text-[11px] font-medium text-slate-700">
                  ⚡ {sol.stats}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link href={`/solutions/${sol.slug}`} className="text-xs font-semibold text-[#3563F6] hover:underline">
                  View Dedicated Blueprint →
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="primary" className="text-xs">
                    Get Started Free
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

