import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardTitle, CardDescription, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Features — AEO Nexus Global Business OS',
  description: 'Explore the full architectural capabilities of the AEO Nexus business operating system.',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="primary">Architectural Capabilities</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Engineered For The Autonomous Business Era
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every layer of AEO Nexus is built to replace fragile point-solutions with an integrated, typed, enterprise-grade operating system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: 'Centralized Single-Identity Auth',
              desc: 'Dual-token architecture with 15-minute stateless JWTs, rotating 7-day refresh tokens, cryptographic SHA-256 token hashing, and automatic session revocation upon suspicious token reuse.',
              icon: '🔐',
              tags: ['Bcrypt 12 Rounds', 'Token Rotation', 'Session Revocation'],
            },
            {
              title: 'Serverless Tenant Isolation',
              desc: 'Relational data segregation hosted on Neon Serverless PostgreSQL. Built-in sole-owner protection prevents accidental workspace abandonment and guarantees audit trail preservation.',
              icon: '🏢',
              tags: ['Neon PostgreSQL', 'Prisma ORM', 'Zero Data Leakage'],
            },
            {
              title: 'Answer Engine Optimization (AEO)',
              desc: 'Optimize your business entity data for the generative search era. Structured JSON-LD schema generation and conversational entity calibration ensure accurate citations on Perplexity, ChatGPT, and Gemini.',
              icon: '🎯',
              tags: ['Generative AI Citations', 'Entity Graphs', 'Query Gap Analysis'],
            },
            {
              title: 'Distributed Background Queueing',
              desc: 'Background job dispatching built on BullMQ and Redis. Handles asynchronous asset generation, automated client emails, scheduled telemetry, and dead-letter queue isolation.',
              icon: '⚡',
              tags: ['BullMQ', 'Redis 7', 'Dead-Letter Resiliency'],
            },
            {
              title: 'Unified Brand Kit & Voice Tokens',
              desc: 'Configure primary and secondary color palettes, logos, and editorial tone guidelines once. Every downstream campaign, asset, and document adheres strictly to your brand tokens.',
              icon: '🎨',
              tags: ['Hex Design Tokens', 'Tone Consistency', 'Automated Compliance'],
            },
            {
              title: 'Cross-Platform Client Ecosystem',
              desc: 'Native Flutter mobile client for iOS and Android sharing the exact same authenticated REST API, biometric secure storage, and Riverpod reactive state architecture.',
              icon: '📱',
              tags: ['Flutter 3.44+', 'Keychain / Keystore', 'Offline Readiness'],
            },
          ].map((feat, idx) => (
            <Card key={idx} className="border-slate-200 bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{feat.icon}</span>
                <CardTitle className="text-lg font-bold text-slate-900">{feat.title}</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                {feat.desc}
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {feat.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#3563F6] to-[#6554E8] text-white text-center space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold">Ready to Experience AEO Nexus?</h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto">
            Initialize your tenant workspace in minutes and explore the full functional toolset.
          </p>
          <div className="pt-2">
            <Link href="/register">
              <Button size="lg" className="bg-white text-[#3563F6] hover:bg-slate-100 font-bold text-xs px-8">
                Start Free Trial →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

