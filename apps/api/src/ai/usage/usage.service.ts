import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MODEL_CATALOG, ModelCapability } from '../providers/ai-provider.interface';
import { AiUsageSummaryDto } from '@aeo-nexus/contracts';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateCost(modelId: string, promptTokens: number, completionTokens: number): number {
    const model = MODEL_CATALOG.find((m) => m.id === modelId);
    if (!model) {
      return 0;
    }
    const promptCost = (promptTokens / 1_000_000) * model.inputCostPer1M;
    const completionCost = (completionTokens / 1_000_000) * model.outputCostPer1M;
    return Number((promptCost + completionCost).toFixed(6));
  }

  async checkBudgetOrThrow(workspaceId: string): Promise<void> {
    const config = await this.prisma.aIWorkspaceConfig.findUnique({
      where: { workspaceId },
    });

    const monthlyTokenBudget = config?.monthlyTokenBudget ?? 1_000_000;
    const monthlyCostBudget = Number(config?.monthlyCostBudget ?? 50.0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageRecords = await this.prisma.aIUsageRecord.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
        status: 'SUCCESS',
      },
      _sum: {
        totalTokens: true,
        estimatedCost: true,
      },
    });

    const usedTokens = usageRecords._sum.totalTokens || 0;
    const usedCost = Number(usageRecords._sum.estimatedCost || 0);

    if (usedTokens >= monthlyTokenBudget) {
      throw new ForbiddenException(
        `Workspace AI monthly token limit exceeded (${usedTokens.toLocaleString()} / ${monthlyTokenBudget.toLocaleString()} tokens). Upgrade your tier or adjust limits in settings.`,
      );
    }

    if (usedCost >= monthlyCostBudget) {
      throw new ForbiddenException(
        `Workspace AI monthly budget exceeded ($${usedCost.toFixed(2)} / $${monthlyCostBudget.toFixed(2)}). Adjust your workspace budget in settings to resume AI operations.`,
      );
    }
  }

  async recordUsage(params: {
    workspaceId: string;
    userId: string;
    provider: string;
    model: string;
    requestId: string;
    promptTokens: number;
    completionTokens: number;
    status?: string;
  }): Promise<void> {
    const totalTokens = params.promptTokens + params.completionTokens;
    const cost = this.calculateCost(params.model, params.promptTokens, params.completionTokens);

    await this.prisma.aIUsageRecord.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        provider: params.provider,
        model: params.model,
        requestId: params.requestId,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens,
        estimatedCost: new Decimal(cost),
        status: params.status || 'SUCCESS',
      },
    });
  }

  async getUsageSummary(workspaceId: string): Promise<AiUsageSummaryDto> {
    const config = await this.prisma.aIWorkspaceConfig.findUnique({
      where: { workspaceId },
    });

    const monthlyTokenBudget = config?.monthlyTokenBudget ?? 1_000_000;
    const monthlyCostBudget = Number(config?.monthlyCostBudget ?? 50.0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const records = await this.prisma.aIUsageRecord.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
      },
    });

    let totalTokens = 0;
    let totalCostUsd = 0;
    const modelMap = new Map<string, { model: string; provider: string; tokens: number; costUsd: number; requestCount: number }>();

    for (const r of records) {
      totalTokens += r.totalTokens;
      const cost = Number(r.estimatedCost);
      totalCostUsd += cost;

      const existing = modelMap.get(r.model) || {
        model: r.model,
        provider: r.provider,
        tokens: 0,
        costUsd: 0,
        requestCount: 0,
      };
      existing.tokens += r.totalTokens;
      existing.costUsd += cost;
      existing.requestCount += 1;
      modelMap.set(r.model, existing);
    }

    return {
      workspaceId,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      recordsCount: records.length,
      monthlyTokenBudget,
      monthlyCostBudget,
      tokenBudgetRemaining: Math.max(0, monthlyTokenBudget - totalTokens),
      costBudgetRemaining: Math.max(0, Number((monthlyCostBudget - totalCostUsd).toFixed(2))),
      byModel: Array.from(modelMap.values()).map((v) => ({
        ...v,
        costUsd: Number(v.costUsd.toFixed(4)),
      })),
    };
  }
}
