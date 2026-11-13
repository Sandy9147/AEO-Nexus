import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';
import { PlanService } from './plan.service';
import { PlanOrchestratorService } from './plan-orchestrator.service';
import { PlanQueueService } from './plan-queue.service';
import { PlanController } from './plan.controller';

@Module({
  imports: [PrismaModule, WorkspacesModule, AiModule, ProjectsModule],
  controllers: [PlanController],
  providers: [PlanService, PlanOrchestratorService, PlanQueueService],
  exports: [PlanService, PlanOrchestratorService],
})
export class PlanModule {}

