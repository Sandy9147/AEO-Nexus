import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SaveBusinessProfileRequest,
  BusinessProfileDto,
  SaveBrandProfileRequest,
  BrandProfileDto,
  SaveOnboardingStepRequest,
  OnboardingProgressDto,
  UpdateWorkspacePreferenceRequest,
  WorkspacePreferenceDto,
  DashboardSummaryDto,
  DashboardChecklistItem,
  DashboardActivityItem,
  DashboardToolItem,
} from '@aeo-nexus/contracts';
import { WorkspaceRole } from '@aeo-nexus/permissions';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: verify user is an active member of this workspace
   */
  async verifyMembership(workspaceId: string, userId: string): Promise<WorkspaceRole> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      include: { workspace: true },
    });

    if (!member || !member.isActive || !member.workspace.isActive) {
      throw new ForbiddenException('Access denied: You are not an active member of this workspace');
    }

    return member.role as WorkspaceRole;
  }

  // ============================================================================
  // Business Profile
  // ============================================================================

  async getBusinessProfile(workspaceId: string, userId: string): Promise<BusinessProfileDto | null> {
    await this.verifyMembership(workspaceId, userId);

    const profile = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      workspaceId: profile.workspaceId,
      businessName: profile.businessName,
      website: profile.website,
      industry: profile.industry,
      country: profile.country,
      businessSize: profile.businessSize,
      description: profile.description,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async saveBusinessProfile(
    workspaceId: string,
    userId: string,
    data: SaveBusinessProfileRequest,
  ): Promise<BusinessProfileDto> {
    await this.verifyMembership(workspaceId, userId);

    const profile = await this.prisma.businessProfile.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        businessName: data.businessName.trim(),
        website: data.website ? data.website.trim() : null,
        industry: data.industry.trim(),
        country: data.country.trim(),
        businessSize: data.businessSize.trim(),
        description: data.description ? data.description.trim() : null,
      },
      update: {
        businessName: data.businessName.trim(),
        website: data.website ? data.website.trim() : null,
        industry: data.industry.trim(),
        country: data.country.trim(),
        businessSize: data.businessSize.trim(),
        description: data.description ? data.description.trim() : null,
      },
    });

    // Update onboarding progress if present
    await this.markOnboardingStepComplete(workspaceId, 'business');

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'BUSINESS_PROFILE_UPDATED',
        resource: `business_profile:${profile.id}`,
        details: { businessName: profile.businessName, industry: profile.industry },
      },
    });

    return {
      id: profile.id,
      workspaceId: profile.workspaceId,
      businessName: profile.businessName,
      website: profile.website,
      industry: profile.industry,
      country: profile.country,
      businessSize: profile.businessSize,
      description: profile.description,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Brand Profile
  // ============================================================================

  async getBrandProfile(workspaceId: string, userId: string): Promise<BrandProfileDto | null> {
    await this.verifyMembership(workspaceId, userId);

    const brand = await this.prisma.brandProfile.findUnique({
      where: { workspaceId },
    });

    if (!brand) return null;

    return {
      id: brand.id,
      workspaceId: brand.workspaceId,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      brandVoice: brand.brandVoice,
      description: brand.description,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  async saveBrandProfile(
    workspaceId: string,
    userId: string,
    data: SaveBrandProfileRequest,
  ): Promise<BrandProfileDto> {
    await this.verifyMembership(workspaceId, userId);

    const brand = await this.prisma.brandProfile.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor || '#3563F6',
        secondaryColor: data.secondaryColor || '#6554E8',
        brandVoice: data.brandVoice ? data.brandVoice.trim() : null,
        description: data.description ? data.description.trim() : null,
      },
      update: {
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
        primaryColor: data.primaryColor || undefined,
        secondaryColor: data.secondaryColor || undefined,
        brandVoice: data.brandVoice !== undefined ? data.brandVoice : undefined,
        description: data.description !== undefined ? data.description : undefined,
      },
    });

    // Update onboarding progress if present
    await this.markOnboardingStepComplete(workspaceId, 'brand');

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'BRAND_PROFILE_UPDATED',
        resource: `brand_profile:${brand.id}`,
      },
    });

    return {
      id: brand.id,
      workspaceId: brand.workspaceId,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      brandVoice: brand.brandVoice,
      description: brand.description,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Onboarding Progress
  // ============================================================================

  async getOnboardingProgress(workspaceId: string, userId: string): Promise<OnboardingProgressDto | null> {
    await this.verifyMembership(workspaceId, userId);

    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { workspaceId },
    });

    if (!progress) {
      // Auto-initialize if not yet created
      const initial = await this.prisma.onboardingProgress.create({
        data: {
          workspaceId,
          step: 'business',
          completed: false,
          completedSteps: [],
          goals: [],
          data: {},
        },
      });

      return {
        id: initial.id,
        workspaceId: initial.workspaceId,
        step: initial.step,
        completed: initial.completed,
        completedSteps: (initial.completedSteps as string[]) || [],
        goals: (initial.goals as string[]) || [],
        data: (initial.data as Record<string, any>) || {},
        updatedAt: initial.updatedAt.toISOString(),
      };
    }

    return {
      id: progress.id,
      workspaceId: progress.workspaceId,
      step: progress.step,
      completed: progress.completed,
      completedSteps: (progress.completedSteps as string[]) || [],
      goals: (progress.goals as string[]) || [],
      data: (progress.data as Record<string, any>) || {},
      updatedAt: progress.updatedAt.toISOString(),
    };
  }

  async saveOnboardingStep(
    workspaceId: string,
    userId: string,
    payload: SaveOnboardingStepRequest,
  ): Promise<OnboardingProgressDto> {
    await this.verifyMembership(workspaceId, userId);

    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { workspaceId },
    });

    const currentCompleted = new Set<string>((existing?.completedSteps as string[]) || []);
    if (payload.step) {
      currentCompleted.add(payload.step);
    }

    const mergedData = {
      ...((existing?.data as Record<string, any>) || {}),
      ...(payload.data || {}),
    };

    const updated = await this.prisma.onboardingProgress.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        step: payload.step,
        completed: payload.step === 'complete',
        completedSteps: Array.from(currentCompleted),
        goals: payload.goals || [],
        data: mergedData,
      },
      update: {
        step: payload.step,
        completed: payload.step === 'complete' ? true : undefined,
        completedSteps: Array.from(currentCompleted),
        goals: payload.goals !== undefined ? payload.goals : undefined,
        data: mergedData,
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      step: updated.step,
      completed: updated.completed,
      completedSteps: (updated.completedSteps as string[]) || [],
      goals: (updated.goals as string[]) || [],
      data: (updated.data as Record<string, any>) || {},
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async completeOnboarding(workspaceId: string, userId: string): Promise<{ completed: boolean }> {
    await this.verifyMembership(workspaceId, userId);

    await this.prisma.onboardingProgress.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        step: 'complete',
        completed: true,
        completedSteps: ['business', 'goals', 'brand', 'complete'],
      },
      update: {
        step: 'complete',
        completed: true,
        completedSteps: ['business', 'goals', 'brand', 'complete'],
      },
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'ONBOARDING_COMPLETED',
        resource: `workspace:${workspaceId}`,
      },
    });

    return { completed: true };
  }

  private async markOnboardingStepComplete(workspaceId: string, stepName: string): Promise<void> {
    try {
      const existing = await this.prisma.onboardingProgress.findUnique({
        where: { workspaceId },
      });

      if (existing) {
        const completed = new Set<string>((existing.completedSteps as string[]) || []);
        completed.add(stepName);
        await this.prisma.onboardingProgress.update({
          where: { workspaceId },
          data: {
            completedSteps: Array.from(completed),
          },
        });
      }
    } catch {
      // Non-blocking helper
    }
  }

  // ============================================================================
  // Workspace Preferences
  // ============================================================================

  async getPreferences(workspaceId: string, userId: string): Promise<WorkspacePreferenceDto> {
    await this.verifyMembership(workspaceId, userId);

    let pref = await this.prisma.workspacePreference.findUnique({
      where: { workspaceId },
    });

    if (!pref) {
      pref = await this.prisma.workspacePreference.create({
        data: {
          workspaceId,
          timezone: 'UTC',
          currency: 'USD',
          emailNotifications: true,
          weeklyDigest: true,
          marketingUpdates: false,
        },
      });
    }

    return {
      id: pref.id,
      workspaceId: pref.workspaceId,
      timezone: pref.timezone,
      currency: pref.currency,
      emailNotifications: pref.emailNotifications,
      weeklyDigest: pref.weeklyDigest,
      marketingUpdates: pref.marketingUpdates,
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  async updatePreferences(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspacePreferenceRequest,
  ): Promise<WorkspacePreferenceDto> {
    await this.verifyMembership(workspaceId, userId);

    const pref = await this.prisma.workspacePreference.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        timezone: data.timezone || 'UTC',
        currency: data.currency || 'USD',
        emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : true,
        weeklyDigest: data.weeklyDigest !== undefined ? data.weeklyDigest : true,
        marketingUpdates: data.marketingUpdates !== undefined ? data.marketingUpdates : false,
      },
      update: {
        timezone: data.timezone || undefined,
        currency: data.currency || undefined,
        emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : undefined,
        weeklyDigest: data.weeklyDigest !== undefined ? data.weeklyDigest : undefined,
        marketingUpdates: data.marketingUpdates !== undefined ? data.marketingUpdates : undefined,
      },
    });

    return {
      id: pref.id,
      workspaceId: pref.workspaceId,
      timezone: pref.timezone,
      currency: pref.currency,
      emailNotifications: pref.emailNotifications,
      weeklyDigest: pref.weeklyDigest,
      marketingUpdates: pref.marketingUpdates,
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Customer Dashboard Summary
  // ============================================================================

  async getDashboardSummary(workspaceId: string, userId: string): Promise<DashboardSummaryDto> {
    const role = await this.verifyMembership(workspaceId, userId);

    const [workspace, business, brand, onboarding, membersCount, pendingInvitesCount, auditLogs] =
      await Promise.all([
        this.prisma.workspace.findUnique({
          where: { id: workspaceId },
        }),
        this.prisma.businessProfile.findUnique({
          where: { workspaceId },
        }),
        this.prisma.brandProfile.findUnique({
          where: { workspaceId },
        }),
        this.prisma.onboardingProgress.findUnique({
          where: { workspaceId },
        }),
        this.prisma.workspaceMember.count({
          where: { workspaceId, isActive: true },
        }),
        this.prisma.workspaceInvitation.count({
          where: { workspaceId, status: 'PENDING' },
        }),
        this.prisma.auditLog.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Calculate genuine profile completion score
    let completion = 25; // 25% for creating workspace
    if (business) completion += 25;
    if (brand) completion += 25;
    if (membersCount > 1 || pendingInvitesCount > 0) completion += 25;

    // Interactive checklist items
    const checklist: DashboardChecklistItem[] = [
      {
        id: 'check-workspace',
        title: 'Create Your Workspace',
        description: `Workspace '${workspace.name}' initialized.`,
        completed: true,
        href: '/workspaces',
      },
      {
        id: 'check-business',
        title: 'Complete Business Profile',
        description: business
          ? `${business.businessName} (${business.industry}) configured.`
          : 'Define your industry, country, and operational scale.',
        completed: !!business,
        href: '/onboarding/business',
      },
      {
        id: 'check-brand',
        title: 'Establish Brand Identity',
        description: brand
          ? 'Brand color palette and editorial voice configured.'
          : 'Select brand colors and define your organizational tone.',
        completed: !!brand,
        href: '/onboarding/brand',
      },
      {
        id: 'check-team',
        title: 'Invite Team Members',
        description:
          membersCount > 1 || pendingInvitesCount > 0
            ? `${membersCount} member(s) collaborating.`
            : 'Invite editors and managers to collaborate.',
        completed: membersCount > 1 || pendingInvitesCount > 0,
        href: '/settings?tab=team',
      },
      {
        id: 'check-apps',
        title: 'Explore Applications & Tools',
        description: 'Browse the central tool catalog and launch operations utilities.',
        completed: onboarding?.completed || false,
        href: '/apps',
      },
    ];

    // Recent activity feed
    const recentActivity: DashboardActivityItem[] = auditLogs.map((log) => ({
      id: log.id,
      action: log.action.replace(/_/g, ' '),
      resource: log.resource,
      timestamp: log.createdAt.toISOString(),
    }));

    if (recentActivity.length === 0) {
      recentActivity.push({
        id: 'init-event',
        action: 'Workspace active',
        resource: `workspace:${workspace.name}`,
        timestamp: workspace.createdAt.toISOString(),
      });
    }

    // Curated recently accessed / essential tools
    const recentTools: DashboardToolItem[] = [
      {
        id: 'tool-biz',
        name: 'Business Profile',
        category: 'Operations',
        description: 'Organization context and entity data',
        href: '/settings?tab=business',
        icon: 'Building2',
        status: 'functional',
      },
      {
        id: 'tool-brand',
        name: 'Brand Kit & Voice',
        category: 'Marketing',
        description: 'Brand colors and editorial tone',
        href: '/settings?tab=brand',
        icon: 'Palette',
        status: 'functional',
      },
      {
        id: 'tool-team',
        name: 'Team & Permissions',
        category: 'Operations',
        description: 'Manage collaborators and roles',
        href: '/settings?tab=team',
        icon: 'Users',
        status: 'functional',
      },
      {
        id: 'tool-security',
        name: 'Session Security',
        category: 'Operations',
        description: 'Active sessions and remote revocation',
        href: '/settings?tab=security',
        icon: 'ShieldCheck',
        status: 'functional',
      },
    ];

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role,
      },
      profileCompletion: Math.min(100, completion),
      businessProfile: business
        ? {
            id: business.id,
            workspaceId: business.workspaceId,
            businessName: business.businessName,
            website: business.website,
            industry: business.industry,
            country: business.country,
            businessSize: business.businessSize,
            description: business.description,
            createdAt: business.createdAt.toISOString(),
            updatedAt: business.updatedAt.toISOString(),
          }
        : null,
      brandProfile: brand
        ? {
            id: brand.id,
            workspaceId: brand.workspaceId,
            logoUrl: brand.logoUrl,
            primaryColor: brand.primaryColor,
            secondaryColor: brand.secondaryColor,
            brandVoice: brand.brandVoice,
            description: brand.description,
            createdAt: brand.createdAt.toISOString(),
            updatedAt: brand.updatedAt.toISOString(),
          }
        : null,
      onboardingCompleted: onboarding?.completed || false,
      checklist,
      recentActivity,
      recentTools,
      projectsCount: 0,
    };
  }
}

