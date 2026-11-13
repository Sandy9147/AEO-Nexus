import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectDto,
  ProjectDetailDto,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskDto,
  CreateTaskCommentRequest,
  TaskCommentDto,
  CreateProjectCommentRequest,
  ProjectCommentDto,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from '@aeo-nexus/contracts';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  async listProjects(
    workspaceId: string,
    userId: string,
    params?: { status?: string; search?: string },
  ): Promise<ProjectDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const where: Prisma.ProjectWhereInput = { workspaceId };
    if (params?.status) {
      if (params.status === 'ARCHIVED') {
        where.isArchived = true;
      } else {
        where.status = params.status as any;
        where.isArchived = false;
      }
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
        tasks: {
          select: { status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => {
      const completedTasks = p.tasks.filter((t) => t.status === 'COMPLETED').length;
      const progress = p.tasks.length > 0 ? Math.round((completedTasks / p.tasks.length) * 100) : 0;
      return {
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        description: p.description,
        status: p.isArchived ? ('ARCHIVED' as ProjectStatus) : (p.status as ProjectStatus),
        progress,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        dueDate: p.dueDate ? p.dueDate.toISOString() : null,
        ownerId: p.ownerId,
        owner: {
          id: p.owner.id,
          email: p.owner.email,
          firstName: p.owner.firstName,
          lastName: p.owner.lastName,
          avatarUrl: null,
        },
        membersCount: p._count.members,
        tasksCount: p._count.tasks,
        completedTasksCount: completedTasks,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  async getProject(workspaceId: string, userId: string, projectId: string): Promise<ProjectDetailDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
            creator: { select: { id: true, email: true, firstName: true, lastName: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
            comments: true,
          },
        },
      },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const completedTasks = project.tasks.filter((t) => t.status === 'COMPLETED').length;
    const progress =
      project.tasks.length > 0 ? Math.round((completedTasks / project.tasks.length) * 100) : 0;

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      status: project.isArchived ? ('ARCHIVED' as ProjectStatus) : (project.status as ProjectStatus),
      progress,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      dueDate: project.dueDate ? project.dueDate.toISOString() : null,
      ownerId: project.ownerId,
      owner: {
        id: project.owner.id,
        email: project.owner.email,
        firstName: project.owner.firstName,
        lastName: project.owner.lastName,
        avatarUrl: null,
      },
      membersCount: project._count.members,
      tasksCount: project._count.tasks,
      completedTasksCount: completedTasks,
      commentsCount: project._count.comments,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      members: project.members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          avatarUrl: null,
        },
      })),
      tasks: project.tasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        workspaceId: t.workspaceId,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        assignedToId: t.assigneeId,
        assignedTo: t.assignee
          ? {
              id: t.assignee.id,
              email: t.assignee.email,
              firstName: t.assignee.firstName,
              lastName: t.assignee.lastName,
              avatarUrl: null,
            }
          : null,
        createdById: t.creatorId,
        createdBy: {
          id: t.creator.id,
          email: t.creator.email,
          firstName: t.creator.firstName,
          lastName: t.creator.lastName,
          avatarUrl: null,
        },
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        commentsCount: t._count.comments,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  }

  async createProject(
    workspaceId: string,
    userId: string,
    dto: CreateProjectRequest,
  ): Promise<ProjectDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    if (dto.memberIds && dto.memberIds.length > 0) {
      const activeMembers = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          userId: { in: dto.memberIds },
          isActive: true,
        },
        select: { userId: true },
      });
      const validMemberIds = new Set(activeMembers.map((m) => m.userId));
      for (const mId of dto.memberIds) {
        if (!validMemberIds.has(mId)) {
          throw new BadRequestException(`User ${mId} is not an active member of this workspace`);
        }
      }
    }

    const isArchived = dto.status === 'ARCHIVED';
    const status = isArchived ? 'PLANNING' : (dto.status || 'PLANNING');

    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        status: status as any,
        isArchived,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        ownerId: userId,
        members: {
          create: [
            { userId, role: 'LEAD' },
            ...(dto.memberIds || [])
              .filter((id) => id !== userId)
              .map((mId) => ({ userId: mId, role: 'MEMBER' })),
          ],
        },
      },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { members: true, tasks: true } },
      },
    });

    // Notify any added members
    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const mId of dto.memberIds) {
        if (mId !== userId) {
          await this.prisma.notification.create({
            data: {
              workspaceId,
              userId: mId,
              type: 'MEMBER_JOINED',
              title: 'Added to Project',
              message: `You were added to project "${project.name}"`,
              link: `/projects/${project.id}`,
              metadata: { projectId: project.id },
            },
          });
        }
      }
    }

    // Log Activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'created',
        resourceType: 'project',
        resourceId: project.id,
        details: { name: project.name },
      },
    });

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      status: project.isArchived ? 'ARCHIVED' : (project.status as ProjectStatus),
      progress: 0,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      dueDate: project.dueDate ? project.dueDate.toISOString() : null,
      ownerId: project.ownerId,
      owner: {
        id: project.owner.id,
        email: project.owner.email,
        firstName: project.owner.firstName,
        lastName: project.owner.lastName,
        avatarUrl: null,
      },
      membersCount: project._count.members,
      tasksCount: 0,
      completedTasksCount: 0,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async updateProject(
    workspaceId: string,
    userId: string,
    projectId: string,
    dto: UpdateProjectRequest,
  ): Promise<ProjectDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.status !== undefined) {
      if (dto.status === 'ARCHIVED') {
        data.isArchived = true;
      } else {
        data.status = dto.status as any;
        data.isArchived = false;
      }
    }
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    if (dto.memberIds) {
      const currentMemberUserIds = existing.members.map((m) => m.userId);
      const toAdd = dto.memberIds.filter((id) => !currentMemberUserIds.includes(id));
      const toRemove = currentMemberUserIds.filter(
        (id) => !dto.memberIds!.includes(id) && id !== existing.ownerId,
      );

      if (toRemove.length > 0) {
        await this.prisma.projectMember.deleteMany({
          where: { projectId, userId: { in: toRemove } },
        });
      }

      if (toAdd.length > 0) {
        await this.prisma.projectMember.createMany({
          data: toAdd.map((id) => ({ projectId, userId: id, role: 'MEMBER' })),
        });

        for (const addedId of toAdd) {
          await this.prisma.notification.create({
            data: {
              workspaceId,
              userId: addedId,
              type: 'MEMBER_JOINED',
              title: 'Added to Project',
              message: `You were added to project "${existing.name}"`,
              link: `/projects/${existing.id}`,
              metadata: { projectId: existing.id },
            },
          });
        }
      }
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { members: true, tasks: true } },
        tasks: { select: { status: true } },
      },
    });

    const completedTasks = updated.tasks.filter((t) => t.status === 'COMPLETED').length;
    const progress =
      updated.tasks.length > 0 ? Math.round((completedTasks / updated.tasks.length) * 100) : 0;

    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'updated',
        resourceType: 'project',
        resourceId: updated.id,
        details: { name: updated.name, status: updated.status },
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      description: updated.description,
      status: updated.isArchived ? 'ARCHIVED' : (updated.status as ProjectStatus),
      progress,
      startDate: updated.startDate ? updated.startDate.toISOString() : null,
      dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
      ownerId: updated.ownerId,
      owner: {
        id: updated.owner.id,
        email: updated.owner.email,
        firstName: updated.owner.firstName,
        lastName: updated.owner.lastName,
        avatarUrl: null,
      },
      membersCount: updated._count.members,
      tasksCount: updated._count.tasks,
      completedTasksCount: completedTasks,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async archiveProject(workspaceId: string, userId: string, projectId: string): Promise<ProjectDto> {
    return this.updateProject(workspaceId, userId, projectId, { status: 'ARCHIVED' });
  }

  async deleteProject(
    workspaceId: string,
    userId: string,
    projectId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace');
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'deleted',
        resourceType: 'project',
        resourceId: projectId,
        details: { name: project.name },
      },
    });

    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  async listProjectTasks(
    workspaceId: string,
    userId: string,
    projectId: string,
    params?: { status?: string },
  ): Promise<TaskDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const where: Prisma.TaskWhereInput = { projectId, workspaceId };
    if (params?.status) {
      where.status = params.status as any;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        creator: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      workspaceId: t.workspaceId,
      title: t.title,
      description: t.description,
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      assignedToId: t.assigneeId,
      assignedTo: t.assignee
        ? {
            id: t.assignee.id,
            email: t.assignee.email,
            firstName: t.assignee.firstName,
            lastName: t.assignee.lastName,
            avatarUrl: null,
          }
        : null,
      createdById: t.creatorId,
      createdBy: {
        id: t.creator.id,
        email: t.creator.email,
        firstName: t.creator.firstName,
        lastName: t.creator.lastName,
        avatarUrl: null,
      },
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      commentsCount: t._count.comments,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async createTask(
    workspaceId: string,
    userId: string,
    dto: CreateTaskRequest,
  ): Promise<TaskDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new BadRequestException('Project not found in this workspace');
    }

    if (dto.assignedToId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.assignedToId,
          },
        },
      });
      if (!member || !member.isActive) {
        throw new BadRequestException('Assigned user is not an active member of this workspace');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        workspaceId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: (dto.status || 'TODO') as any,
        priority: (dto.priority || 'MEDIUM') as any,
        assigneeId: dto.assignedToId || null,
        creatorId: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        creator: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    });

    // Notify assignee if assigned
    if (dto.assignedToId && dto.assignedToId !== userId) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          userId: dto.assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You were assigned to task "${task.title}" in project "${project.name}"`,
          link: `/projects/${project.id}/tasks`,
          metadata: { taskId: task.id, projectId: project.id },
        },
      });
    }

    // Log Activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'created',
        resourceType: 'task',
        resourceId: task.id,
        details: { title: task.title, projectId: project.id },
      },
    });

    return {
      id: task.id,
      projectId: task.projectId,
      workspaceId: task.workspaceId,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      assignedToId: task.assigneeId,
      assignedTo: task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email,
            firstName: task.assignee.firstName,
            lastName: task.assignee.lastName,
            avatarUrl: null,
          }
        : null,
      createdById: task.creatorId,
      createdBy: {
        id: task.creator.id,
        email: task.creator.email,
        firstName: task.creator.firstName,
        lastName: task.creator.lastName,
        avatarUrl: null,
      },
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      commentsCount: task._count.comments,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  async updateTask(
    workspaceId: string,
    userId: string,
    taskId: string,
    dto: UpdateTaskRequest,
  ): Promise<TaskDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException('Task not found in this workspace');
    }

    if (dto.assignedToId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.assignedToId,
          },
        },
      });
      if (!member || !member.isActive) {
        throw new BadRequestException('Assigned user is not an active member of this workspace');
      }
    }

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status as any;
    if (dto.priority !== undefined) data.priority = dto.priority as any;
    if (dto.assignedToId !== undefined) {
      data.assignee = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        creator: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    });

    // Notify status change if status changed
    if (dto.status && dto.status !== task.status) {
      if (task.assigneeId && task.assigneeId !== userId) {
        await this.prisma.notification.create({
          data: {
            workspaceId,
            userId: task.assigneeId,
            type: 'TASK_STATUS_CHANGED',
            title: 'Task Status Updated',
            message: `Task "${updated.title}" status changed to ${updated.status}`,
            link: `/projects/${task.projectId}/tasks`,
            metadata: { taskId: updated.id, projectId: task.projectId },
          },
        });
      }
    }

    // Notify reassignment
    if (dto.assignedToId && dto.assignedToId !== task.assigneeId && dto.assignedToId !== userId) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          userId: dto.assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You were assigned to task "${updated.title}"`,
          link: `/projects/${task.projectId}/tasks`,
          metadata: { taskId: updated.id, projectId: task.projectId },
        },
      });
    }

    // Activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'updated',
        resourceType: 'task',
        resourceId: updated.id,
        details: { title: updated.title, status: updated.status },
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      workspaceId: updated.workspaceId,
      title: updated.title,
      description: updated.description,
      status: updated.status as TaskStatus,
      priority: updated.priority as TaskPriority,
      assignedToId: updated.assigneeId,
      assignedTo: updated.assignee
        ? {
            id: updated.assignee.id,
            email: updated.assignee.email,
            firstName: updated.assignee.firstName,
            lastName: updated.assignee.lastName,
            avatarUrl: null,
          }
        : null,
      createdById: updated.creatorId,
      createdBy: {
        id: updated.creator.id,
        email: updated.creator.email,
        firstName: updated.creator.firstName,
        lastName: updated.creator.lastName,
        avatarUrl: null,
      },
      dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
      commentsCount: updated._count.comments,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteTask(
    workspaceId: string,
    userId: string,
    taskId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException('Task not found in this workspace');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  async getTaskComments(
    workspaceId: string,
    userId: string,
    taskId: string,
  ): Promise<TaskCommentDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException('Task not found in this workspace');
    }

    const comments = await this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      authorId: c.userId,
      author: {
        id: c.user.id,
        email: c.user.email,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        avatarUrl: null,
      },
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async createTaskComment(
    workspaceId: string,
    userId: string,
    taskId: string,
    dto: CreateTaskCommentRequest,
  ): Promise<TaskCommentDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException('Task not found in this workspace');
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: dto.content.trim(),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Notify task assignee or creator if someone else commented
    const notifyUserIds = new Set<string>();
    if (task.assigneeId && task.assigneeId !== userId) {
      notifyUserIds.add(task.assigneeId);
    }
    if (task.creatorId && task.creatorId !== userId) {
      notifyUserIds.add(task.creatorId);
    }

    for (const nUserId of notifyUserIds) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          userId: nUserId,
          type: 'COMMENT_ADDED',
          title: 'New Comment on Task',
          message: `${comment.user.firstName} commented on "${task.title}"`,
          link: `/projects/${task.projectId}/tasks`,
          metadata: { taskId: task.id, projectId: task.projectId },
        },
      });
    }

    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.userId,
      author: {
        id: comment.user.id,
        email: comment.user.email,
        firstName: comment.user.firstName,
        lastName: comment.user.lastName,
        avatarUrl: null,
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async getProjectComments(
    workspaceId: string,
    userId: string,
    projectId: string,
  ): Promise<ProjectCommentDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const comments = await this.prisma.projectComment.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      authorId: c.userId,
      author: {
        id: c.user.id,
        email: c.user.email,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        avatarUrl: null,
      },
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async createProjectComment(
    workspaceId: string,
    userId: string,
    projectId: string,
    dto: CreateProjectCommentRequest,
  ): Promise<ProjectCommentDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const comment = await this.prisma.projectComment.create({
      data: {
        projectId,
        userId,
        content: dto.content.trim(),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Notify project owner if someone else commented
    if (project.ownerId !== userId) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          userId: project.ownerId,
          type: 'COMMENT_ADDED',
          title: 'New Comment on Project',
          message: `${comment.user.firstName} commented on project "${project.name}"`,
          link: `/projects/${project.id}`,
          metadata: { projectId: project.id },
        },
      });
    }

    return {
      id: comment.id,
      projectId: comment.projectId,
      authorId: comment.userId,
      author: {
        id: comment.user.id,
        email: comment.user.email,
        firstName: comment.user.firstName,
        lastName: comment.user.lastName,
        avatarUrl: null,
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }
}
