import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from './guards/workspace.guard';
import { PlatformRoleGuard } from './guards/platform-role.guard';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';
import { RateLimiterGuard } from './guards/rate-limiter.guard';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    WorkspaceMembershipGuard,
    PlatformRoleGuard,
    WorkspaceRoleGuard,
    RateLimiterGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    WorkspaceMembershipGuard,
    PlatformRoleGuard,
    WorkspaceRoleGuard,
    RateLimiterGuard,
  ],
})
export class AuthModule {}
