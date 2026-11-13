import { Injectable, NotFoundException } from '@nestjs/common';
import { AppCatalogItemDto, AppCategory } from '@aeo-nexus/contracts';

const CATALOG_ITEMS: AppCatalogItemDto[] = [
  {
    id: 'app-business-profile',
    slug: 'business-profile',
    name: 'Business Profile Manager',
    category: 'Operations',
    badge: 'Core',
    description: 'Centralize company identity, legal entity data, industry verticals, and operating context.',
    longDescription:
      'The Business Profile Manager provides the single source of truth for your organization within AEO Nexus. Context defined here automatically informs marketing copies, search engine entity graphs, and future autonomous AI workflows.',
    status: 'functional',
    icon: 'Building2',
    features: [
      'Comprehensive organization identity',
      'Industry & regional market classification',
      'Operating scale & headcount tracking',
      'Direct integration with AI Business Context',
    ],
    launchUrl: '/settings?tab=business',
  },
  {
    id: 'app-brand-identity',
    slug: 'brand-identity',
    name: 'Brand Kit & Voice',
    category: 'Marketing',
    badge: 'Core',
    description: 'Define your visual brand tokens, color palettes, and editorial tone of voice.',
    longDescription:
      'Store and manage primary brand colors, secondary accents, logos, and communication voice guidelines. Every future campaign, website element, and AI-generated piece of content adheres strictly to your brand tokens.',
    status: 'functional',
    icon: 'Palette',
    features: [
      'Primary & secondary hex color management',
      'Editorial voice & tone definition',
      'Visual asset & logo management',
      'Consistency enforcement across portals',
    ],
    launchUrl: '/settings?tab=brand',
  },
  {
    id: 'app-team-hub',
    slug: 'team-hub',
    name: 'Team & Role Governance',
    category: 'Operations',
    badge: 'Security',
    description: 'Collaborate with team members through granular role-based access control.',
    longDescription:
      'Manage workspace members, assign fine-grained roles (Owner, Admin, Manager, Editor, Viewer), send secure invitations with automatic expiration, and guard against accidental sole-owner removal.',
    status: 'functional',
    icon: 'Users',
    features: [
      'Multi-role permission matrix',
      'Cryptographically secure member invitations',
      'Sole-owner lock-out protection',
      'Full member audit trail',
    ],
    launchUrl: '/settings?tab=team',
  },
  {
    id: 'app-security-hub',
    slug: 'security-hub',
    name: 'Security & Device Sessions',
    category: 'Operations',
    badge: 'Security',
    description: 'Monitor active device sessions, IP geolocations, and revoke suspicious tokens.',
    longDescription:
      'Enterprise-grade security controls giving you full visibility over active web and mobile device sessions. Review timestamps, user agents, and IP addresses, or terminate remote sessions with one click.',
    status: 'functional',
    icon: 'ShieldCheck',
    features: [
      'Real-time active session monitoring',
      'Device and browser user-agent detection',
      'Immediate remote session revocation',
      'Bcrypt-secured password rotation',
    ],
    launchUrl: '/settings?tab=security',
  },
  {
    id: 'app-ai-business-agent',
    slug: 'ai-business-agent',
    name: 'AI Business Agent',
    category: 'AI & Automation',
    badge: 'Coming in Phase 4',
    description: 'Autonomous multi-modal AI agent that acts as your 24/7 business operations co-pilot.',
    longDescription:
      'The centerpiece of AEO Nexus. The AI Business Agent proactively researches market trends, identifies visibility gaps, suggests strategic plays, and coordinates execution across all Nexus tools.',
    status: 'coming-soon',
    icon: 'Bot',
    features: [
      'Autonomous objective decomposition',
      'Continuous market surveillance',
      'Cross-tool workflow orchestration',
      'Explainable AI reasoning transcripts',
    ],
  },
  {
    id: 'app-aeo-optimizer',
    slug: 'aeo-optimizer',
    name: 'Answer Engine Optimizer (AEO)',
    category: 'Marketing',
    badge: 'Coming Soon',
    description: 'Optimize business presence across AI search engines including Perplexity, ChatGPT, and Gemini.',
    longDescription:
      'Go beyond traditional SEO. Answer Engine Optimization (AEO) ensures your brand, products, and services are accurately cited and recommended when prospective customers ask conversational AI engines for solutions.',
    status: 'coming-soon',
    icon: 'Sparkles',
    features: [
      'AI citation and brand mention tracking',
      'Structured entity markup generator',
      'Conversational query gap analysis',
      'Synthetic search audit simulator',
    ],
  },
  {
    id: 'app-content-studio',
    slug: 'content-studio',
    name: 'AI Content Studio',
    category: 'Content',
    badge: 'Coming Soon',
    description: 'Generate high-authority articles, thought-leadership pieces, and social campaigns.',
    longDescription:
      'Produce comprehensive, brand-aligned marketing collateral designed specifically for high organic and generative AI citation rates. Incorporates your brand voice and factual business profile context.',
    status: 'coming-soon',
    icon: 'PenTool',
    features: [
      'Long-form research-backed publishing',
      'Automated multi-channel social repurposing',
      'Brand guideline compliance verification',
      'Rich Markdown & headless CMS export',
    ],
  },
  {
    id: 'app-workflow-automation',
    slug: 'workflow-automation',
    name: 'Workflow Automation Engine',
    category: 'Operations',
    badge: 'Coming Soon',
    description: 'Connect internal tools, webhooks, and third-party APIs into seamless automated loops.',
    longDescription:
      'Build resilient background automations with BullMQ and Redis. Automate lead follow-ups, document summaries, weekly executive briefings, and cross-platform notifications without writing code.',
    status: 'coming-soon',
    icon: 'Zap',
    features: [
      'Event-driven trigger architecture',
      'Visual workflow canvas',
      'Robust retry & dead-letter queueing',
      'Pre-built integrations with Google & modern SaaS',
    ],
  },
  {
    id: 'app-predictive-analytics',
    slug: 'predictive-analytics',
    name: 'Predictive Growth Analytics',
    category: 'Analytics',
    badge: 'Coming Soon',
    description: 'Real-time telemetry, lead pipeline forecasting, and customer retention metrics.',
    longDescription:
      'Transform complex operational data into actionable clarity. Predict quarterly revenue trajectories, isolate customer churn signals early, and benchmark performance against industry cohorts.',
    status: 'coming-soon',
    icon: 'BarChart3',
    features: [
      'Multi-source telemetry ingestion',
      'Predictive conversion forecasting',
      'Cohort retention matrices',
      'Automated weekly intelligence digests',
    ],
  },
  {
    id: 'app-nexus-crm',
    slug: 'nexus-crm',
    name: 'Nexus CRM & Pipeline',
    category: 'Commerce',
    badge: 'Coming Soon',
    description: 'Track deals, monitor client accounts, and automate relationship milestones.',
    longDescription:
      'A streamlined, lightweight customer relationship manager built directly into your business operating system. Seamlessly links deals with projects, assets, and invoices.',
    status: 'coming-soon',
    icon: 'Briefcase',
    features: [
      'Custom deal stage visualization',
      'Automated communication logs',
      'Contact enrichment via AI',
      'Direct synchronization with billing usage',
    ],
  },
];

@Injectable()
export class CatalogService {
  list(category?: string, query?: string): AppCatalogItemDto[] {
    let items = [...CATALOG_ITEMS];

    if (category && category !== 'All') {
      items = items.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase(),
      );
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.features.some((f) => f.toLowerCase().includes(q)),
      );
    }

    return items;
  }

  getBySlug(slug: string): AppCatalogItemDto {
    const item = CATALOG_ITEMS.find((it) => it.slug.toLowerCase() === slug.toLowerCase());
    if (!item) {
      throw new NotFoundException(`Application with slug '${slug}' not found in catalog`);
    }
    return item;
  }
}

