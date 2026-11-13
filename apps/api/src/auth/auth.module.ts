import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from './guards/workspace.guard';
import { PlatformRoleGuard } from './guards/platform-role.guard';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    WorkspaceMembershipGuard,
    PlatformRoleGuard,
    WorkspaceRoleGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    WorkspaceMembershipGuard,
    PlatformRoleGuard,
    WorkspaceRoleGuard,
  ],
})
export class AuthModule {}
