import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Blog & Engineering Insights — AEO Nexus Global Business OS',
  description: 'Articles on Answer Engine Optimization, multi-tenant cloud databases, and AI operations.',
};

const POSTS = [
  {
    title: 'Why Traditional SEO Is Rapidly Giving Way to Answer Engine Optimization',
    slug: 'seo-to-aeo-shift',
    date: 'November 12, 2026',
    author: 'AEO Nexus Engineering Team',
    summary:
      'As conversational search models become the primary interface for information discovery, brands must adapt from page keywords to structured entity graphs.',
    tag: 'Industry Analysis',
  },
  {
    title: 'Implementing Dual-Token Refresh Rotation & Replay Detection in NestJS',
    slug: 'dual-token-security',
    date: 'November 10, 2026',
    author: 'Security Architecture Group',
    summary:
      'A deep dive into mitigating refresh token interception: token hashing, sliding window rate limits, and automated token family revocation.',
    tag: 'Application Security',
  },
  {
    title: 'Serverless PostgreSQL at Scale: Lessons from Neon Database Multi-Tenancy',
    slug: 'neon-multi-tenancy',
    date: 'November 8, 2026',
    author: 'DevOps & Infrastructure Team',
    summary:
      'How serverless compute wake-up latency, connection pooling, and direct migration connections power modern SaaS platforms.',
    tag: 'Database Architecture',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="space-y-3 pb-4 border-b border-slate-200">
          <Badge variant="primary">Nexus Insights</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Engineering & Product Insights
          </h1>
          <p className="text-sm text-slate-600">
            Technical write-ups, industry research, and architecture breakdowns from the AEO Nexus team.
          </p>
        </div>

        <div className="space-y-6">
          {POSTS.map((post) => (
            <Card key={post.slug} className="border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm hover:border-[#3563F6]/40 transition">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-[#3563F6] uppercase tracking-wider">{post.tag}</span>
                <span>{post.date} • {post.author}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                {post.title}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">{post.summary}</p>
              <div className="pt-2">
                <Link href={`/resources`} className="text-xs font-semibold text-[#3563F6] hover:underline">
                  Read Article →
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

