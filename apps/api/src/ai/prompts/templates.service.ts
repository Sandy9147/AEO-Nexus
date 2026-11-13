import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiPromptTemplateDto } from '@aeo-nexus/contracts';

const DEFAULT_TEMPLATES = [
  {
    name: 'Executive Business Audit',
    slug: 'executive-business-audit',
    category: 'STRATEGY',
    description: 'Perform a comprehensive health check across brand consistency, active projects, and knowledge vault readiness.',
    templateText: 'Please review our workspace business profile, brand guidelines, and active projects. Summarize our current operational status and highlight the top 3 high-leverage priorities for this week.',
    variables: [],
  },
  {
    name: 'Answer Engine Optimization (AEO) Brief',
    slug: 'aeo-search-brief',
    category: 'CONTENT',
    description: 'Generate an Answer Engine Optimization content brief for high-intent search queries based on our knowledge documents.',
    templateText: 'Query our published knowledge base for "{topic}". Based on the retrieved facts, draft an authoritative, schema-optimized FAQ section designed for direct citation in AI answers.',
    variables: ['topic'],
  },
  {
    name: 'Weekly Sprint & Task Breakdown',
    slug: 'weekly-sprint-breakdown',
    category: 'OPERATIONS',
    description: 'Inspect assigned tasks and project deadlines to draft an actionable weekly execution plan.',
    templateText: 'List all open tasks across active projects. Break them down into high, medium, and low urgency buckets and recommend sequential task assignments for the team.',
    variables: [],
  },
  {
    name: 'Brand Voice Compliance Check',
    slug: 'brand-voice-check',
    category: 'RESEARCH',
    description: 'Verify whether proposed marketing or website text adheres to the workspace brand identity kit.',
    templateText: 'Inspect our brand guidelines (primary colors, voice tone, style notes). Evaluate the following draft content against our verified brand voice: "{draftContent}"',
    variables: ['draftContent'],
  },
];

@Injectable()
export class AiTemplatesService {
  private readonly logger = new Logger(AiTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(workspaceId: string): Promise<AiPromptTemplateDto[]> {
    // Retrieve workspace-custom templates and system templates (workspaceId is null)
    const custom = await this.prisma.aIPromptTemplate.findMany({
      where: {
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: { name: 'asc' },
    });

    if (custom.length > 0) {
      return custom.map((t) => ({
        id: t.id,
        workspaceId: t.workspaceId,
        name: t.name,
        slug: t.slug,
        category: t.category,
        description: t.description,
        templateText: t.templateText,
        variables: t.variables,
        createdAt: t.createdAt.toISOString(),
      }));
    }

    // Return in-memory defaults if table is empty
    return DEFAULT_TEMPLATES.map((t, idx) => ({
      id: `default-${idx + 1}`,
      workspaceId: null,
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description,
      templateText: t.templateText,
      variables: t.variables,
      createdAt: new Date().toISOString(),
    }));
  }
}

