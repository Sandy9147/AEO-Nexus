import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PromptSanitizer } from '../prompts/prompt-sanitizer';

export interface BoundedWorkspaceContext {
  workspaceId: string;
  businessSummary: string;
  brandSummary: string;
  recentProjectsSummary: string;
  assignedTasksSummary: string;
  assetCountSummary: string;
  combinedContextPrompt: string;
}

@Injectable()
export class WorkspaceContextService {
  private readonly logger = new Logger(WorkspaceContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * Builds bounded workspace context for an authenticated user.
   * Enforces server-side workspace authorization.
   */
  async buildBoundedContext(workspaceId: string, userId: string): Promise<BoundedWorkspaceContext> {
    // 1. Verify caller has active membership in this workspace
    await this.workspacesService.verifyMembership(workspaceId, userId);

    // 2. Fetch business & brand profiles (bounded 1:1)
    const [businessProfile, brandProfile, recentProjects, assignedTasks, assetsCount] =
      await Promise.all([
        this.prisma.businessProfile.findUnique({ where: { workspaceId } }),
        this.prisma.brandProfile.findUnique({ where: { workspaceId } }),
        this.prisma.project.findMany({
          where: { workspaceId, status: { in: ['ACTIVE', 'PLANNING'] } },
          select: {
            id: true,
            name: true,
            status: true,
            tasks: { select: { status: true } },
          },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.task.findMany({
          where: {
            workspaceId,
            status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          },
          select: { id: true, title: true, status: true, priority: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.asset.count({ where: { workspaceId } }),
      ]);

    // Format safe summaries
    const businessSummary = businessProfile
      ? `Organization: ${businessProfile.businessName} | Industry: ${businessProfile.industry || 'General'} | Country: ${businessProfile.country || 'Global'} | Website: ${businessProfile.website || 'N/A'}`
      : 'Business Profile: Not configured yet.';

    const brandSummary = brandProfile
      ? `Primary Color: ${brandProfile.primaryColor || '#3563F6'} | Secondary: ${brandProfile.secondaryColor || '#6554E8'} | Tone: ${brandProfile.brandVoice || 'Professional'} | Description: ${brandProfile.description || 'Clean'}`
      : 'Brand Profile: Default theme.';

    const recentProjectsSummary =
      recentProjects.length > 0
        ? recentProjects
            .map((p) => {
              const total = p.tasks.length;
              const completed = p.tasks.filter((t) => t.status === 'COMPLETED').length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              return `- ${p.name} (${p.status}, ${progress}% done)`;
            })
            .join('\n')
        : 'No active projects currently.';

    const assignedTasksSummary =
      assignedTasks.length > 0
        ? assignedTasks.map((t) => `- ${t.title} [${t.status}] (Priority: ${t.priority})`).join('\n')
        : 'No pending tasks currently.';

    const assetCountSummary = `Stored Assets: ${assetsCount} files in workspace repository.`;

    const combinedContextPrompt = `
${PromptSanitizer.formatBusinessContext(
  businessProfile ? { organizationName: businessProfile.businessName, websiteUrl: businessProfile.website, industry: businessProfile.industry, companySize: businessProfile.businessSize } : null,
  brandProfile ? { primaryColor: brandProfile.primaryColor, voiceTone: brandProfile.brandVoice, styleGuideNotes: brandProfile.description } : null,
)}

<workspace_snapshot>
Active Projects:
${recentProjectsSummary}

Current Tasks:
${assignedTasksSummary}

Repository:
${assetCountSummary}
</workspace_snapshot>
`;

    return {
      workspaceId,
      businessSummary,
      brandSummary,
      recentProjectsSummary,
      assignedTasksSummary,
      assetCountSummary,
      combinedContextPrompt,
    };
  }
}
