import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, WorkspacesModule],
})
export class AppModule {}
