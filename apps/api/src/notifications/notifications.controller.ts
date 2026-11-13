import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  async listNotifications(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('unread') unread?: string,
  ) {
    const list = await this.notificationsService.listNotifications(
      workspaceId,
      req.user.id,
      unread === 'true',
    );
    return {
      success: true,
      data: list,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('notifications/:id/read')
  async markRead(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') notificationId: string,
  ) {
    const updated = await this.notificationsService.markAsRead(
      workspaceId,
      req.user.id,
      notificationId,
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('notifications/read-all')
  async markAllRead(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const res = await this.notificationsService.markAllAsRead(workspaceId, req.user.id);
    return {
      success: true,
      data: res,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('activity')
  async listActivity(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    const events = await this.notificationsService.listActivityFeed(
      workspaceId,
      req.user.id,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    };
  }
}
