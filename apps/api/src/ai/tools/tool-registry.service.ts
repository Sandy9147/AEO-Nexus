import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KnowledgeRetrievalService } from '../retrieval/knowledge-retrieval.service';
import { AiApprovalsService } from '../approvals/approvals.service';
import { IAiTool, ToolExecutionContext, ToolExecutionResult } from './tool.interface';
import { AiToolDto } from '@aeo-nexus/contracts';
import { WorkspaceRole, AiActionType, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';

@Injectable()
export class AiToolRegistryService {
  private readonly logger = new Logger(AiToolRegistryService.name);
  private readonly tools: Map<string, IAiTool> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly retrievalService: KnowledgeRetrievalService,
    private readonly approvalsService: AiApprovalsService,
  ) {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // 1. Get Business Profile
    this.register({
      id: 'get_business_profile',
      name: 'Get Business Profile',
      description: 'Retrieve verified business profile including organization name, industry, scale, website, and target markets.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async (_args, ctx) => {
        const profile = await this.prisma.businessProfile.findUnique({
          where: { workspaceId: ctx.workspaceId },
        });
        if (!profile) {
          return { success: true, summary: 'No business profile configured for this workspace.', data: null };
        }
        return {
          success: true,
          summary: `Retrieved business profile for ${profile.businessName}.`,
          data: {
            organizationName: profile.businessName,
            websiteUrl: profile.website,
            industry: profile.industry,
            companySize: profile.businessSize,
            country: profile.country,
          },
        };
      },
    });

    // 2. Get Brand Information
    this.register({
      id: 'get_brand_identity',
      name: 'Get Brand Identity',
      description: 'Retrieve verified brand identity guidelines including color palette, tone of voice, and style rules.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async (_args, ctx) => {
        const brand = await this.prisma.brandProfile.findUnique({
          where: { workspaceId: ctx.workspaceId },
        });
        if (!brand) {
          return {
            success: true,
            summary: 'Default brand theme active (Primary: #3563F6, Violet: #6554E8).',
            data: { primaryColor: '#3563F6', secondaryColor: '#6554E8', voiceTone: 'Professional and friendly' },
          };
        }
        return {
          success: true,
          summary: `Retrieved brand guidelines: ${brand.brandVoice || 'Professional'}.`,
          data: {
            primaryColor: brand.primaryColor,
            secondaryColor: brand.secondaryColor,
            voiceTone: brand.brandVoice,
            styleGuideNotes: brand.description,
            logoUrl: brand.logoUrl,
          },
        };
      },
    });

    // 3. Search Knowledge Vault
    this.register({
      id: 'search_knowledge_vault',
      name: 'Search Knowledge Vault',
      description: 'Search published workspace documents, policies, FAQs, and product specifications for verified facts.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query or keyword phrase' },
        },
        required: ['query'],
      },
      execute: async (args, ctx) => {
        const query = String(args.query || '');
        const { documents, citations } = await this.retrievalService.retrieveRelevantDocuments(ctx.workspaceId, query, 5);
        return {
          success: true,
          summary: `Found ${documents.length} verified knowledge documents for query "${query}".`,
          data: { documents, citations },
        };
      },
    });

    // 4. List Workspace Projects
    this.register({
      id: 'list_workspace_projects',
      name: 'List Workspace Projects',
      description: 'List active and recent projects with their progress percentages and current statuses.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Optional filter by status',
            enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
          },
          limit: { type: 'number', description: 'Maximum number of projects to return (max 20)' },
        },
      },
      execute: async (args, ctx) => {
        const take = Math.min(20, Math.max(1, Number(args.limit) || 10));
        const where: any = { workspaceId: ctx.workspaceId };
        if (args.status) {
          where.status = args.status as ProjectStatus;
        }

        const projects = await this.prisma.project.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            dueDate: true,
            createdAt: true,
            tasks: { select: { status: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take,
        });

        const formatted = projects.map((p) => {
          const total = p.tasks.length;
          const completed = p.tasks.filter((t) => t.status === 'COMPLETED').length;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            progress,
            dueDate: p.dueDate,
            createdAt: p.createdAt,
          };
        });

        return {
          success: true,
          summary: `Retrieved ${formatted.length} workspace projects.`,
          data: formatted,
        };
      },
    });

    // 5. Get Project Details
    this.register({
      id: 'get_project_details',
      name: 'Get Project Details',
      description: 'Retrieve detailed information about a specific project including tasks and members.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The unique ID of the project' },
        },
        required: ['projectId'],
      },
      execute: async (args, ctx) => {
        const projectId = String(args.projectId || '');
        const project = await this.prisma.project.findUnique({
          where: { id: projectId },
          include: {
            tasks: {
              select: { id: true, title: true, status: true, priority: true, dueDate: true },
              orderBy: { createdAt: 'desc' },
            },
            members: {
              include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
            },
          },
        });

        if (!project || project.workspaceId !== ctx.workspaceId) {
          return { success: false, error: 'Project not found in this workspace.', summary: 'Project not found.' };
        }

        const total = project.tasks.length;
        const completed = project.tasks.filter((t) => t.status === 'COMPLETED').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          success: true,
          summary: `Retrieved details for project "${project.name}" (${project.tasks.length} tasks).`,
          data: {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            progress,
            tasks: project.tasks,
            members: project.members.map((m) => ({
              userId: m.userId,
              role: m.role,
              name: `${m.user.firstName} ${m.user.lastName}`,
            })),
          },
        };
      },
    });

    // 6. List Assigned Tasks
    this.register({
      id: 'list_assigned_tasks',
      name: 'List Assigned Tasks',
      description: 'List assigned tasks across workspace projects with priorities and due dates.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Optional filter by task status',
            enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED'],
          },
          limit: { type: 'number', description: 'Maximum number of tasks to return (max 30)' },
        },
      },
      execute: async (args, ctx) => {
        const take = Math.min(30, Math.max(1, Number(args.limit) || 15));
        const where: any = { workspaceId: ctx.workspaceId };
        if (args.status) {
          where.status = args.status as TaskStatus;
        }

        const tasks = await this.prisma.task.findMany({
          where,
          include: {
            project: { select: { id: true, name: true } },
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
        });

        return {
          success: true,
          summary: `Retrieved ${tasks.length} tasks in workspace.`,
          data: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            projectName: t.project.name,
            assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned',
          })),
        };
      },
    });

    // 7. Create Draft Project
    this.register({
      id: 'create_draft_project',
      name: 'Create Draft Project',
      description: 'Create a new project in PLANNING status to organize campaigns or website deliverables.',
      requiresApproval: true,
      actionType: AiActionType.PUBLISH_CONTENT,
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The project title' },
          description: { type: 'string', description: 'Detailed scope and deliverables' },
          dueDate: { type: 'string', description: 'ISO 8601 target completion date' },
        },
        required: ['name'],
      },
      execute: async (args, ctx) => {
        const name = String(args.name || '').trim();
        if (!name) {
          return { success: false, error: 'Project name is required', summary: 'Failed to create project: name missing' };
        }

        const config = await this.prisma.aIWorkspaceConfig.findUnique({
          where: { workspaceId: ctx.workspaceId },
        });

        if (config?.requireApprovalForSensitive) {
          const approval = await this.approvalsService.createApprovalRequest({
            workspaceId: ctx.workspaceId,
            runId: ctx.runId,
            conversationId: ctx.conversationId,
            actionType: AiActionType.PUBLISH_CONTENT,
            title: `Create Project: ${name}`,
            description: `The AI Agent requests approval to initialize new workspace project "${name}".`,
            payload: { name, description: args.description, dueDate: args.dueDate },
            requestedById: ctx.userId,
          });

          return {
            success: true,
            requiresApproval: true,
            approvalId: approval.id,
            summary: `Created approval request #${approval.id.substring(0, 8)} to confirm project creation for "${name}".`,
            data: { approvalId: approval.id, status: 'PENDING_APPROVAL' },
          };
        }

        const project = await this.prisma.project.create({
          data: {
            workspaceId: ctx.workspaceId,
            name,
            description: args.description ? String(args.description) : null,
            status: ProjectStatus.PLANNING,
            ownerId: ctx.userId,
            dueDate: args.dueDate ? new Date(String(args.dueDate)) : null,
          },
        });

        return {
          success: true,
          summary: `Successfully created project "${project.name}" (ID: ${project.id}).`,
          data: { id: project.id, name: project.name, status: project.status },
        };
      },
    });

    // 8. Create Draft Task
    this.register({
      id: 'create_draft_task',
      name: 'Create Draft Task',
      description: 'Create a new task under an active project or default workspace initiative.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Optional project ID (defaults to latest active project)' },
          title: { type: 'string', description: 'The task title' },
          description: { type: 'string', description: 'Actionable steps and requirements' },
          priority: {
            type: 'string',
            description: 'Task priority',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          },
        },
        required: ['title'],
      },
      execute: async (args, ctx) => {
        const title = String(args.title || '').trim();
        if (!title) {
          return { success: false, error: 'Task title is required', summary: 'Failed to create task: title missing' };
        }

        let projectId = args.projectId ? String(args.projectId) : undefined;
        if (!projectId) {
          const latestProject = await this.prisma.project.findFirst({
            where: { workspaceId: ctx.workspaceId, isArchived: false },
            orderBy: { createdAt: 'desc' },
          });
          if (!latestProject) {
            const general = await this.prisma.project.create({
              data: {
                workspaceId: ctx.workspaceId,
                name: 'General Business Operations',
                description: 'Default project for unassigned operational tasks.',
                status: ProjectStatus.ACTIVE,
                ownerId: ctx.userId,
              },
            });
            projectId = general.id;
          } else {
            projectId = latestProject.id;
          }
        }

        const task = await this.prisma.task.create({
          data: {
            projectId,
            workspaceId: ctx.workspaceId,
            title,
            description: args.description ? String(args.description) : null,
            status: TaskStatus.TODO,
            priority: (args.priority as TaskPriority) || TaskPriority.MEDIUM,
            creatorId: ctx.userId,
          },
        });

        return {
          success: true,
          summary: `Created task "${task.title}" with priority ${task.priority}.`,
          data: { id: task.id, title: task.title, status: task.status, priority: task.priority },
        };
      },
    });

    // 9. Search Application Catalog
    this.register({
      id: 'search_app_catalog',
      name: 'Search Application Catalog',
      description: 'Search available tools, utilities, and modular apps across the AEO Nexus ecosystem.',
      requiresApproval: false,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keyword to search in tool titles and descriptions' },
        },
      },
      execute: async (args) => {
        const query = String(args.query || '').toLowerCase();
        const catalog = [
          { slug: 'business-profile', name: 'Business Profile Studio', category: 'OPERATIONS', isFunctional: true },
          { slug: 'brand-identity', name: 'Brand Identity Vault', category: 'BRAND', isFunctional: true },
          { slug: 'projects-manager', name: 'Project & Task Coordination', category: 'OPERATIONS', isFunctional: true },
          { slug: 'knowledge-vault', name: 'Business Knowledge Vault', category: 'KNOWLEDGE', isFunctional: true },
          { slug: 'aeo-audit-engine', name: 'Answer Engine Audit Studio', category: 'AEO_DISCOVERY', isFunctional: false },
          { slug: 'headless-website-builder', name: 'Headless Site Builder', category: 'BUILD', isFunctional: false },
          { slug: 'social-campaign-scheduler', name: 'Omnichannel Campaign Studio', category: 'MARKETING', isFunctional: false },
          { slug: 'revenue-telemetry', name: 'Predictive Revenue Telemetry', category: 'GROWTH', isFunctional: false },
        ];

        const matches = query
          ? catalog.filter((c) => c.name.toLowerCase().includes(query) || c.category.toLowerCase().includes(query))
          : catalog;

        return {
          success: true,
          summary: `Found ${matches.length} tools matching "${query || 'all'}".`,
          data: matches,
        };
      },
    });
  }

  register(tool: IAiTool) {
    this.tools.set(tool.id, tool);
  }

  getTool(id: string): IAiTool | undefined {
    return this.tools.get(id);
  }

  listTools(): AiToolDto[] {
    return Array.from(this.tools.values()).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      requiresApproval: t.requiresApproval,
      parameters: t.parameters as Record<string, unknown>,
    }));
  }

  async executeTool(
    toolId: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolId}" not found in registry.`,
        summary: `Execution failed: Tool "${toolId}" does not exist.`,
      };
    }

    if (tool.requiredRole && context.userRole !== WorkspaceRole.WORKSPACE_OWNER && context.userRole !== WorkspaceRole.WORKSPACE_ADMIN) {
      throw new ForbiddenException(`Permission denied: Tool "${tool.name}" requires role ${tool.requiredRole}.`);
    }

    try {
      this.logger.log(`Executing tool "${toolId}" for workspace ${context.workspaceId}`);
      const result = await tool.execute(args, context);

      await this.prisma.activityEvent.create({
        data: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          action: `AI_TOOL_${toolId.toUpperCase()}`,
          resourceType: 'AI_TOOL',
          resourceId: toolId,
          details: {
            args: args as any,
            success: result.success,
            summary: result.summary,
            requiresApproval: result.requiresApproval,
          } as any,
        },
      });

      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing tool "${toolId}": ${errMsg}`);
      return {
        success: false,
        error: errMsg,
        summary: `Tool execution failed: ${errMsg}`,
      };
    }
  }
}
