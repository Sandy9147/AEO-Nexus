import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { EmailModule } from './email/email.module';
import { BusinessModule } from './business/business.module';
import { CatalogModule } from './catalog/catalog.module';
import { ProjectsModule } from './projects/projects.module';
import { AssetsModule } from './assets/assets.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { DiscoverModule } from './discover/discover.module';
import { PlanModule } from './plan/plan.module';
import { BuildModule } from './build/build.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    EmailModule,
    BusinessModule,
    CatalogModule,
    ProjectsModule,
    AssetsModule,
    KnowledgeModule,
    NotificationsModule,
    AiModule,
    DiscoverModule,
    PlanModule,
    BuildModule,
  ],
})
export class AppModule {}

