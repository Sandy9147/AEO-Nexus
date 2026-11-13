import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AiModule } from '../ai/ai.module';
import { DiscoverService } from './discover.service';
import { DiscoverOrchestratorService } from './discover-orchestrator.service';
import { DiscoverQueueService } from './discover-queue.service';
import { DiscoverController } from './discover.controller';

@Module({
  imports: [PrismaModule, WorkspacesModule, AiModule],
  controllers: [DiscoverController],
  providers: [DiscoverService, DiscoverOrchestratorService, DiscoverQueueService],
  exports: [DiscoverService, DiscoverOrchestratorService],
})
export class DiscoverModule {}
