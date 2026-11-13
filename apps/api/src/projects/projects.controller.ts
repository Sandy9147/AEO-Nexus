import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateTaskCommentRequest,
  CreateProjectCommentRequest,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  @Get('projects')
  async listProjects(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const list = await this.projectsService.listProjects(workspaceId, req.user.id, {
      status,
      search,
    });
    return {
      success: true,
      data: list,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('projects')
  async createProject(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateProjectRequest,
  ) {
    const project = await this.projectsService.createProject(workspaceId, req.user.id, body);
    return {
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('projects/:projectId')
  async getProject(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const project = await this.projectsService.getProject(workspaceId, req.user.id, projectId);
    return {
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('projects/:projectId')
  async updateProject(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectRequest,
  ) {
    const updated = await this.projectsService.updateProject(
      workspaceId,
      req.user.id,
      projectId,
      body,
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('projects/:projectId/archive')
  async archiveProject(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const archived = await this.projectsService.archiveProject(
      workspaceId,
      req.user.id,
      projectId,
    );
    return {
      success: true,
      data: archived,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('projects/:projectId')
  async deleteProject(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const result = await this.projectsService.deleteProject(workspaceId, req.user.id, projectId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('projects/:projectId/tasks')
  async listProjectTasks(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    const tasks = await this.projectsService.listProjectTasks(
      workspaceId,
      req.user.id,
      projectId,
      { status },
    );
    return {
      success: true,
      data: tasks,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  @Post('tasks')
  async createTask(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateTaskRequest,
  ) {
    const task = await this.projectsService.createTask(workspaceId, req.user.id, body);
    return {
      success: true,
      data: task,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('tasks/:taskId')
  async updateTask(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskRequest,
  ) {
    const updated = await this.projectsService.updateTask(
      workspaceId,
      req.user.id,
      taskId,
      body,
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('tasks/:taskId')
  async deleteTask(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const result = await this.projectsService.deleteTask(workspaceId, req.user.id, taskId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tasks/:taskId/comments')
  async getTaskComments(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const comments = await this.projectsService.getTaskComments(
      workspaceId,
      req.user.id,
      taskId,
    );
    return {
      success: true,
      data: comments,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('tasks/:taskId/comments')
  async createTaskComment(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: CreateTaskCommentRequest,
  ) {
    const comment = await this.projectsService.createTaskComment(
      workspaceId,
      req.user.id,
      taskId,
      body,
    );
    return {
      success: true,
      data: comment,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Project Comments
  // ---------------------------------------------------------------------------

  @Get('projects/:projectId/comments')
  async getProjectComments(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const comments = await this.projectsService.getProjectComments(
      workspaceId,
      req.user.id,
      projectId,
    );
    return {
      success: true,
      data: comments,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('projects/:projectId/comments')
  async createProjectComment(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: CreateProjectCommentRequest,
  ) {
    const comment = await this.projectsService.createProjectComment(
      workspaceId,
      req.user.id,
      projectId,
      body,
    );
    return {
      success: true,
      data: comment,
      timestamp: new Date().toISOString(),
    };
  }
}
