import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  NotificationDto,
  ActivityEventDto,
  NotificationType,
} from '@aeo-nexus/contracts';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listNotifications(
    workspaceId: string,
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const where: Prisma.NotificationWhereInput = {
      workspaceId,
      userId,
    };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => {
      const meta = n.metadata as Record<string, any> | null;
      return {
        id: n.id,
        workspaceId: n.workspaceId,
        userId: n.userId,
        type: n.type as unknown as NotificationType,
        title: n.title,
        message: n.message,
        resourceId: meta?.resourceId || meta?.projectId || meta?.taskId || null,
        resourceType: meta?.resourceType || (meta?.projectId ? 'project' : meta?.taskId ? 'task' : null),
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      };
    });
  }

  async markAsRead(
    workspaceId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.workspaceId !== workspaceId || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    const meta = updated.metadata as Record<string, any> | null;
    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      type: updated.type as unknown as NotificationType,
      title: updated.title,
      message: updated.message,
      resourceId: meta?.resourceId || meta?.projectId || meta?.taskId || null,
      resourceType: meta?.resourceType || null,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async markAllAsRead(
    workspaceId: string,
    userId: string,
  ): Promise<{ updatedCount: number }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const result = await this.prisma.notification.updateMany({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  async listActivityFeed(
    workspaceId: string,
    userId: string,
    limit = 20,
  ): Promise<ActivityEventDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const events = await this.prisma.activityEvent.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return events.map((e) => ({
      id: e.id,
      workspaceId: e.workspaceId,
      actorId: e.userId || 'system',
      actor: e.user
        ? {
            id: e.user.id,
            email: e.user.email,
            firstName: e.user.firstName,
            lastName: e.user.lastName,
            avatarUrl: null,
          }
        : {
            id: 'system',
            email: 'system@aeonexus.local',
            firstName: 'System',
            lastName: 'Agent',
            avatarUrl: null,
          },
      action: e.action,
      entityType: e.resourceType,
      entityId: e.resourceId,
      metadata: (e.details as Record<string, unknown>) || null,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
