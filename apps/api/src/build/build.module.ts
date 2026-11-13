import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AiModule } from '../ai/ai.module';
import { WebsiteController, PublicWebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { WebsiteRendererService } from './website-renderer.service';
import { WebsiteOrchestratorService } from './website-orchestrator.service';
import { WebsiteQueueService } from './website-queue.service';

@Module({
  imports: [PrismaModule, WorkspacesModule, AiModule],
  controllers: [WebsiteController, PublicWebsiteController],
  providers: [
    WebsiteService,
    WebsiteRendererService,
    WebsiteOrchestratorService,
    WebsiteQueueService,
  ],
  exports: [
    WebsiteService,
    WebsiteRendererService,
    WebsiteOrchestratorService,
    WebsiteQueueService,
  ],
})
export class BuildModule {}

