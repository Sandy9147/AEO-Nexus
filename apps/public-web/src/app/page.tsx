import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../components/layout/public-header';
import { PublicFooter } from '../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      {/* 1. NAVIGATION */}
      <PublicHeader />

      <main className="flex-1 space-y-20 sm:space-y-28 pb-20">
        {/* 2. HERO SECTION */}
        <section className="pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-[#EAF0FF] text-xs font-semibold text-[#3563F6] shadow-sm">
            <span>⚡ Introducing AEO Nexus</span>
            <span className="text-slate-300">•</span>
            <span>The Global AI Business Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Operate, Automate & Scale Your Business With{' '}
            <span className="bg-gradient-to-r from-[#3563F6] via-[#6554E8] to-[#3563F6] bg-clip-text text-transparent">
              Answer Engine Intelligence
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Unify your company context, brand kit, Answer Engine Optimization (AEO), and autonomous multi-modal AI agents into one high-performance operating system.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" className="w-full sm:w-auto text-sm px-8 shadow-md">
                Start Free Workspace Trial →
              </Button>
            </Link>
            <Link href="/apps" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm px-6 bg-white">
                Explore Tool Catalog
              </Button>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Centralized Identity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Serverless Multi-Tenancy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> 100% Cryptographic Security
            </span>
          </div>
        </section>

        {/* 3. PRODUCT DASHBOARD PREVIEW */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-5 shadow-2xl">
            {/* Mock browser header */}
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-100 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-400 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <span className="font-mono text-[11px] bg-slate-50 px-3 py-1 rounded-md border border-slate-100">
                https://customer.aeonexus.com/dashboard
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">● Connected</span>
            </div>

            {/* Dashboard Mockup Content */}
            <div className="pt-4 p-2 sm:p-4 space-y-6 bg-[#F7F9FC]/70 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Acme Global Innovations • Workspace Overview
                  </h3>
                  <p className="text-xs text-slate-500">Live operational context calibrated for multi-modal AI reasoning</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="primary">Owner</Badge>
                  <Badge variant="outline">Enterprise Software</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Context Setup</div>
                  <div className="text-2xl font-extrabold text-[#3563F6]">75% Complete</div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#3563F6] h-2 w-[75%]" />
                  </div>
                  <p className="text-[11px] text-slate-500">Business details and brand tokens registered.</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Brand Identity</div>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#3563F6] border border-slate-200" />
                    <span className="h-5 w-5 rounded-full bg-[#6554E8] border border-slate-200" />
                    <span className="text-xs font-mono font-medium text-slate-700">#3563F6</span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">Voice: Professional & Bold</div>
                  <p className="text-[11px] text-slate-500">Active design tokens across all assets.</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">AEO Answer Readiness</div>
                  <div className="text-2xl font-extrabold text-emerald-600">High Tier</div>
                  <div className="text-xs text-slate-600 font-medium">Perplexity • ChatGPT • Gemini</div>
                  <p className="text-[11px] text-slate-500">Structured schema ready for citation.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CORE CAPABILITIES */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
              Architectural Advantages
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Engineered as an Operating System, Not Isolated Tools
            </h3>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Traditional SaaS leaves you stitching together disconnected point solutions. AEO Nexus centralizes your business data in a unified database layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#EAF0FF] text-[#3563F6] flex items-center justify-center font-bold text-lg">
                🔐
              </div>
              <CardTitle className="text-base text-slate-900">Centralized Identity</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                One master authentication engine for web, mobile, and agency portals with refresh token rotation and anti-theft reuse detection.
              </CardDescription>
            </Card>

            <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#EEF0FF] text-[#6554E8] flex items-center justify-center font-bold text-lg">
                🏢
              </div>
              <CardTitle className="text-base text-slate-900">Isolated Multi-Tenancy</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Strict tenant boundary enforcement at the database and service levels. Sole-owner protection prevents accidental lockout.
              </CardDescription>
            </Card>

            <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                🎯
              </div>
              <CardTitle className="text-base text-slate-900">Answer Engine Optimization</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Position your business for conversational AI queries. Get recommended when prospective buyers ask AI engines for solutions.
              </CardDescription>
            </Card>

            <Card className="border-slate-200 bg-white p-6 space-y-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
              <CardTitle className="text-base text-slate-900">Background Workflows</CardTitle>
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Resilient background queues running on BullMQ and Redis with automatic retries and dead-letter queue isolation.
              </CardDescription>
            </Card>
          </div>
        </section>

        {/* 5. THE 6 PILLARS */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
              End-to-End Execution
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              The 6 Pillars of Business Growth
            </h3>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              A comprehensive lifecycle navigating your company from initial market discovery to enterprise-scale automated execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Discover',
                icon: '🔍',
                desc: 'Audit search engines and conversational AI engines to identify untapped commercial queries and citation gaps.',
              },
              {
                step: '02',
                title: 'Plan',
                icon: '📋',
                desc: 'Synthesize verified market data into structured playbooks, content calendars, and growth milestones.',
              },
              {
                step: '03',
                title: 'Build',
                icon: '🛠️',
                desc: 'Generate brand-compliant websites, landing pages, and long-form authority articles automatically.',
              },
              {
                step: '04',
                title: 'Market',
                icon: '📢',
                desc: 'Deploy omnichannel campaigns across organic search, social repurposing, and automated newsletters.',
              },
              {
                step: '05',
                title: 'Automate',
                icon: '⚡',
                desc: 'Eliminate repetitive manual tasks through event-driven background queues and intelligent webhooks.',
              },
              {
                step: '06',
                title: 'Grow',
                icon: '📈',
                desc: 'Track predictive revenue trajectories, retention cohorts, and AI citation attribution in real-time.',
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3 hover:border-[#3563F6]/50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{pillar.icon}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">{pillar.step}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900">{pillar.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. AI BUSINESS AGENT INTRODUCTION */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-[#1e1b4b] text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-6">
              <Badge variant="primary" className="bg-[#3563F6] text-white border-none">
                Phase 4 Milestone
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Meet Your 24/7 AI Business Operator
              </h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Rather than forcing you to prompt an LLM for individual tasks, the AEO Nexus AI Business Agent operates proactively. It monitors market shifts, plans weekly execution agendas, generates assets according to your brand kit, and awaits your approval to launch.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link href="/apps/ai-business-agent">
                  <Button variant="primary" size="sm" className="bg-[#3563F6] text-white">
                    Explore Agent Architecture →
                  </Button>
                </Link>
                <Link href="/features">
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-200 hover:bg-slate-800">
                    Learn How It Works
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. INDUSTRY SOLUTIONS */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
              Target Verticals
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Customized Operating Context for Your Industry
            </h3>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Every industry operates under distinct compliance rules, entity structures, and buyer personas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                slug: 'saas',
                name: 'SaaS & Tech',
                icon: '💻',
                desc: 'Establish categorical leadership on conversational AI engines and scale software trial signups.',
              },
              {
                slug: 'ecommerce',
                name: 'E-Commerce & Brands',
                icon: '🛍️',
                desc: 'Generate structured product schemas that AI shopping assistants cite when recommending products.',
              },
              {
                slug: 'healthcare',
                name: 'Healthcare & Clinical',
                icon: '🩺',
                desc: 'Maintain factual medical citation authority and build patient trust with rigorous brand compliance.',
              },
              {
                slug: 'agency',
                name: 'Agencies & Consultants',
                icon: '🏢',
                desc: 'Manage dozens of client workspaces from a unified portal with granular multi-tenant isolation.',
              },
            ].map((sol) => (
              <div
                key={sol.slug}
                className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-[#3563F6]/50 transition"
              >
                <div className="space-y-3">
                  <span className="text-3xl">{sol.icon}</span>
                  <h4 className="text-base font-bold text-slate-900">{sol.name}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{sol.desc}</p>
                </div>
                <Link
                  href={sol.slug === 'agency' ? '/agency' : `/solutions/${sol.slug}`}
                  className="text-xs font-semibold text-[#3563F6] hover:underline"
                >
                  View Solution Blueprint →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 8. HOW IT WORKS */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
              Deployment Lifecycle
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              How AEO Nexus Operates
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: 'Step 1',
                title: 'Workspace Calibration',
                desc: 'Initialize your tenant workspace, company context, and primary brand colors in under 2 minutes.',
              },
              {
                step: 'Step 2',
                title: 'Entity & AEO Mapping',
                desc: 'The central engine maps your business entities to match conversational search queries.',
              },
              {
                step: 'Step 3',
                title: 'Launch Active Tools',
                desc: 'Activate team governance, brand kits, and automated background queues with real-time telemetry.',
              },
              {
                step: 'Step 4',
                title: 'Scale Organic Citations',
                desc: 'Watch your brand authority rise across Google, ChatGPT, Perplexity, and Gemini search graphs.',
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 relative"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3563F6] font-mono">
                  {item.step}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. PRICING PREVIEW */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
              Transparent Pricing
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Simple, Predictable Subscription Tiers
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No hidden fees, no artificial usage cliffs. Scale seamlessly as your business grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200 bg-white p-6 space-y-6 shadow-sm">
              <div>
                <h4 className="text-base font-bold text-slate-900">Starter Workspace</h4>
                <p className="text-xs text-slate-500 mt-1">For growing startups and solo founders</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$49</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">✓ 1 Active Workspace</li>
                <li className="flex items-center gap-2">✓ Full Business Profile & Brand Kit</li>
                <li className="flex items-center gap-2">✓ Up to 3 Team Collaborators</li>
                <li className="flex items-center gap-2">✓ Access to Active Tools Catalog</li>
              </ul>
              <Link href="/register" className="block">
                <Button variant="outline" className="w-full text-xs">
                  Get Started Free
                </Button>
              </Link>
            </Card>

            <Card className="border-[#3563F6] bg-white p-6 space-y-6 shadow-md relative ring-1 ring-[#3563F6]">
              <div className="absolute -top-3 right-6">
                <Badge variant="primary" className="text-[10px]">Most Popular</Badge>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Growth OS</h4>
                <p className="text-xs text-slate-500 mt-1">For established companies scaling operations</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$149</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2 font-medium">✓ Unlimited Workspace Workflows</li>
                <li className="flex items-center gap-2 font-medium">✓ Up to 15 Team Members with RBAC</li>
                <li className="flex items-center gap-2 font-medium">✓ Answer Engine Optimization (AEO)</li>
                <li className="flex items-center gap-2 font-medium">✓ Dedicated Neon Serverless Branch</li>
                <li className="flex items-center gap-2 font-medium">✓ Priority Support & Telemetry</li>
              </ul>
              <Link href="/register" className="block">
                <Button variant="primary" className="w-full text-xs">
                  Start Growth Trial →
                </Button>
              </Link>
            </Card>

            <Card className="border-slate-200 bg-white p-6 space-y-6 shadow-sm">
              <div>
                <h4 className="text-base font-bold text-slate-900">Agency & Enterprise</h4>
                <p className="text-xs text-slate-500 mt-1">For agencies managing client portfolios</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">Custom</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">✓ Unlimited Client Workspaces</li>
                <li className="flex items-center gap-2">✓ White-Label Client Portals</li>
                <li className="flex items-center gap-2">✓ Custom SLA & Dedicated Architect</li>
                <li className="flex items-center gap-2">✓ Enterprise SSO & SAML</li>
              </ul>
              <Link href="/contact" className="block">
                <Button variant="outline" className="w-full text-xs">
                  Talk to Sales
                </Button>
              </Link>
            </Card>
          </div>
        </section>

        {/* 10. TRUTH IN TELEMETRY / GENUINE PROOF */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-100/70 border border-slate-200 text-center space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Architectural Transparency Guarantee
            </h4>
            <h3 className="text-2xl font-bold text-slate-900">
              No Fake Social Proof. Verifiable Engineering.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              We do not fabricate testimonials, invent fake user counts, or advertise features that do not exist in code. AEO Nexus is backed by rigorous end-to-end testing, serverless PostgreSQL isolation, and open architectural documentation.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link href="/about">
                <Button size="sm" variant="outline" className="bg-white text-xs">
                  Read Our Architectural Principles →
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 11. FAQ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
              Frequently Asked Questions
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Everything You Need to Know About AEO Nexus
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {[
              {
                q: 'What is Answer Engine Optimization (AEO) and how is it different from SEO?',
                a: 'Traditional SEO focuses on indexing pages for static keyword searches on Google. AEO optimizes your brand entities, citations, and factual data so that conversational AI engines like ChatGPT, Perplexity, and Gemini cite your products when answering user questions.',
              },
              {
                q: 'How does workspace tenant isolation work?',
                a: 'Every workspace is isolated by foreign key constraints and strict server-side membership checks. Database queries require verified membership tokens, and sole-owner protection prevents workspaces from ever being orphaned.',
              },
              {
                q: 'Can agencies use AEO Nexus for client accounts?',
                a: 'Yes. AEO Nexus was designed from the ground up with dedicated Agency roles (Owner, Admin, Manager, Editor, Client) and a unified multi-tenant architecture allowing agencies to switch between clients with zero context switching.',
              },
              {
                q: 'Where is our company data hosted?',
                a: 'Your relational data is stored securely on hosted Neon Serverless PostgreSQL with daily backups, connection pooling, and strict TLS 1.3 encryption in transit and at rest.',
              },
              {
                q: 'Are mobile applications supported?',
                a: 'Yes. Our Flutter customer mobile application shares the exact same centralized identity system with biometric keychain storage and automatic 401 token refresh.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                <h4 className="text-sm font-bold text-slate-900">{faq.q}</h4>
                <p className="text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 12. FINAL CALL TO ACTION */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-[#3563F6] to-[#6554E8] text-white text-center space-y-6 shadow-xl">
            <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Ready to Upgrade Your Business Operations?
            </h3>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Join modern enterprises and fast-growing startups operating on AEO Nexus. Set up your workspace in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-[#3563F6] hover:bg-slate-100 font-bold shadow-md">
                  Get Started Free Today →
                </Button>
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10">
                  Compare Pricing Plans
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 13. FOOTER */}
      <PublicFooter />
    </div>
  );
}
