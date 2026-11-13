import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { AiApprovalDto, ReviewAiApprovalRequest } from '@aeo-nexus/contracts';
import { AiActionType, AiApprovalStatus, WorkspaceRole } from '@prisma/client';

@Injectable()
export class AiApprovalsService {
  private readonly logger = new Logger(AiApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async createApprovalRequest(params: {
    workspaceId: string;
    runId?: string;
    conversationId?: string;
    actionType: AiActionType;
    title: string;
    description: string;
    payload: Record<string, unknown>;
    requestedById: string;
  }): Promise<AiApprovalDto> {
    const approval = await this.prisma.aIApproval.create({
      data: {
        workspaceId: params.workspaceId,
        runId: params.runId,
        conversationId: params.conversationId,
        actionType: params.actionType,
        title: params.title,
        description: params.description,
        payload: params.payload as any,
        status: AiApprovalStatus.PENDING,
        requestedById: params.requestedById,
      },
      include: {
        requestedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      id: approval.id,
      workspaceId: approval.workspaceId,
      runId: approval.runId,
      conversationId: approval.conversationId,
      actionType: approval.actionType as any,
      title: approval.title,
      description: approval.description,
      payload: approval.payload as Record<string, unknown>,
      status: approval.status as any,
      requestedById: approval.requestedById,
      requestedBy: approval.requestedBy,
      createdAt: approval.createdAt.toISOString(),
    };
  }

  async listApprovals(workspaceId: string, userId: string, status?: string): Promise<AiApprovalDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const where: any = { workspaceId };
    if (status) {
      where.status = status as AiApprovalStatus;
    }

    const approvals = await this.prisma.aIApproval.findMany({
      where,
      include: {
        requestedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return approvals.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      runId: a.runId,
      conversationId: a.conversationId,
      actionType: a.actionType as any,
      title: a.title,
      description: a.description,
      payload: a.payload as Record<string, unknown>,
      status: a.status as any,
      requestedById: a.requestedById,
      requestedBy: a.requestedBy,
      reviewedById: a.reviewedById,
      reviewedBy: a.reviewedBy,
      reviewedAt: a.reviewedAt?.toISOString(),
      reviewNotes: a.reviewNotes,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async reviewApproval(
    workspaceId: string,
    approvalId: string,
    userId: string,
    dto: ReviewAiApprovalRequest,
  ): Promise<AiApprovalDto> {
    const role = await this.workspacesService.verifyMembership(workspaceId, userId);

    // Only owners, admins, or managers can approve actions
    if (
      role !== WorkspaceRole.WORKSPACE_OWNER &&
      role !== WorkspaceRole.WORKSPACE_ADMIN &&
      role !== WorkspaceRole.WORKSPACE_MANAGER
    ) {
      throw new ForbiddenException('Only workspace managers, administrators, or owners can review AI approvals');
    }

    const approval = await this.prisma.aIApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval || approval.workspaceId !== workspaceId) {
      throw new NotFoundException('Approval request not found in this workspace');
    }

    if (approval.status !== AiApprovalStatus.PENDING) {
      throw new ForbiddenException(`Approval request has already been reviewed (${approval.status})`);
    }

    const updated = await this.prisma.aIApproval.update({
      where: { id: approvalId },
      data: {
        status: dto.status as AiApprovalStatus,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        requestedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // If linked to an AIRun and approved/rejected, update run status
    if (approval.runId) {
      await this.prisma.aIRun.update({
        where: { id: approval.runId },
        data: {
          status: dto.status === 'APPROVED' ? 'COMPLETED' : 'CANCELLED',
          completedAt: new Date(),
        },
      });
    }

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      runId: updated.runId,
      conversationId: updated.conversationId,
      actionType: updated.actionType as any,
      title: updated.title,
      description: updated.description,
      payload: updated.payload as Record<string, unknown>,
      status: updated.status as any,
      requestedById: updated.requestedById,
      requestedBy: updated.requestedBy,
      reviewedById: updated.reviewedById,
      reviewedBy: updated.reviewedBy,
      reviewedAt: updated.reviewedAt?.toISOString(),
      reviewNotes: updated.reviewNotes,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}

