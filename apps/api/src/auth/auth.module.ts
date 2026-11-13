import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkspaceMembershipGuard } from './guards/workspace.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, WorkspaceMembershipGuard],
  exports: [AuthService, JwtAuthGuard, WorkspaceMembershipGuard],
})
export class AuthModule {}
