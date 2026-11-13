import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceRequest, WorkspaceSummary } from '@aeo-nexus/contracts';
import { WorkspaceRole } from '@aeo-nexus/permissions';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, isActive: true },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      memberCount: m.workspace._count.members,
      createdAt: m.workspace.createdAt.toISOString(),
    }));
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceRequest): Promise<WorkspaceSummary> {
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`Workspace slug '${dto.slug}' already exists`);
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        members: {
          create: {
            userId,
            role: WorkspaceRole.WORKSPACE_OWNER,
          },
        },
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: WorkspaceRole.WORKSPACE_OWNER,
      memberCount: 1,
      createdAt: workspace.createdAt.toISOString(),
    };
  }
}
