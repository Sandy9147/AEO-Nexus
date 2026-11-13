import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebsiteRendererService } from './website-renderer.service';
import { WebsiteQueueService } from './website-queue.service';
import { WebsiteOrchestratorService } from './website-orchestrator.service';
import {
  CreateWebsiteProjectRequest,
  GenerateWebsiteRequest,
  UpdateWebsiteProjectRequest,
  UpdateWebsiteThemeRequest,
  CreateWebsitePageRequest,
  UpdateWebsitePageRequest,
  RegenerateSectionRequest,
  RESERVED_SUBDOMAINS,
  SectionType,
} from '@aeo-nexus/contracts';

@Injectable()
export class WebsiteService {
  private readonly logger = new Logger(WebsiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: WebsiteRendererService,
    private readonly queue: WebsiteQueueService,
    private readonly orchestrator: WebsiteOrchestratorService,
  ) {}

  /**
   * Generates a unique, URL-safe slug for a website within a workspace.
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ---------------------------------------------------------------------------
  // Overview & Listing
  // ---------------------------------------------------------------------------

  async getOverview(workspaceId: string) {
    const [totalWebsites, publishedWebsites, draftWebsites, websites, recentPublications] =
      await Promise.all([
        this.prisma.websiteProject.count({
          where: { workspaceId, status: { not: 'ARCHIVED' } },
        }),
        this.prisma.websiteProject.count({
          where: { workspaceId, isPublished: true, status: { not: 'ARCHIVED' } },
        }),
        this.prisma.websiteProject.count({
          where: { workspaceId, status: 'DRAFT' },
        }),
        this.prisma.websiteProject.findMany({
          where: { workspaceId, status: { not: 'ARCHIVED' } },
          include: {
            theme: true,
            _count: {
              select: { pages: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        this.prisma.websitePublication.findMany({
          where: { website: { workspaceId } },
          orderBy: { publishedAt: 'desc' },
          take: 5,
        }),
      ]);

    return {
      totalWebsites,
      publishedWebsites,
      draftWebsites,
      websites: websites.map((w) => ({
        ...w,
        pagesCount: w._count.pages,
      })),
      recentPublications,
    };
  }

  async listWebsites(workspaceId: string, status?: string) {
    const where: any = { workspaceId };
    if (status && status !== 'ALL') {
      where.status = status;
    } else {
      where.status = { not: 'ARCHIVED' };
    }

    const websites = await this.prisma.websiteProject.findMany({
      where,
      include: {
        theme: true,
        _count: {
          select: { pages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return websites.map((w) => ({
      ...w,
      pagesCount: w._count.pages,
    }));
  }

  async getWebsite(workspaceId: string, websiteId: string) {
    const website = await this.prisma.websiteProject.findUnique({
      where: { id: websiteId },
      include: {
        theme: true,
        pages: {
          orderBy: { pageOrder: 'asc' },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        publications: {
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!website || website.workspaceId !== workspaceId) {
      throw new NotFoundException(`Website ${websiteId} not found in workspace`);
    }

    return website;
  }

  // ---------------------------------------------------------------------------
  // Website CRUD & AI Generation
  // ---------------------------------------------------------------------------

  async createWebsite(workspaceId: string, userId: string, dto: CreateWebsiteProjectRequest) {
    let slug = this.slugify(dto.name);
    if (!slug) slug = 'site';

    // Ensure unique slug in workspace
    const existing = await this.prisma.websiteProject.findFirst({
      where: { workspaceId, slug },
    });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    return this.prisma.$transaction(
      async (tx) => {
        const website = await tx.websiteProject.create({
          data: {
            workspaceId,
            createdById: userId,
            name: dto.name,
            slug,
            websiteType: dto.websiteType || 'BUSINESS_WEBSITE',
            description: dto.description || null,
            targetAudience: dto.targetAudience || null,
            targetMarket: dto.targetMarket || null,
            planId: dto.planId || null,
            initiativeId: dto.initiativeId || null,
            status: 'DRAFT',
          },
        });

        // Create default theme
        const theme = await tx.websiteTheme.create({
          data: {
            websiteId: website.id,
            primaryColor: '#3563F6',
            secondaryColor: '#6554E8',
            backgroundColor: '#FFFFFF',
            surfaceColor: '#F7F9FC',
            textColor: '#0F172A',
            headingFont: 'Inter',
            bodyFont: 'Inter',
            buttonStyle: 'ROUNDED',
            borderRadius: '8px',
            sectionSpacing: 'MEDIUM',
          },
        });

        // Create default starter Home page
        const defaultSections = [
          {
            id: `sec_hero_${Date.now()}`,
            type: 'HERO',
            order: 0,
            content: {
              badge: 'Welcome',
              headline: dto.name,
              subheadline: dto.description || 'Welcome to our modern business website.',
              primaryCta: { text: 'Get Started', href: '/contact' },
            },
          },
          {
            id: `sec_footer_${Date.now()}`,
            type: 'FOOTER',
            order: 1,
            content: {
              brandName: dto.name,
              copyright: `© ${new Date().getFullYear()} ${dto.name}. All rights reserved.`,
              links: [{ label: 'Home', href: '/' }],
            },
          },
        ];

        const homePage = await tx.websitePage.create({
          data: {
            websiteId: website.id,
            title: 'Home',
            slug: '/',
            pageOrder: 0,
            isHome: true,
            seoTitle: `${dto.name} | Home`,
            seoDescription: dto.description || `Welcome to ${dto.name}`,
            sections: defaultSections as any,
          },
        });

        return {
          ...website,
          theme,
          pages: [homePage],
        };
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  async generateWebsite(workspaceId: string, userId: string, dto: GenerateWebsiteRequest) {
    let slug = this.slugify(dto.name);
    if (!slug) slug = 'site';

    const existing = await this.prisma.websiteProject.findFirst({
      where: { workspaceId, slug },
    });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const website = await this.prisma.websiteProject.create({
      data: {
        workspaceId,
        createdById: userId,
        name: dto.name,
        slug,
        websiteType: dto.websiteType || 'BUSINESS_WEBSITE',
        description: dto.businessDescription || null,
        targetAudience: dto.targetAudience || null,
        targetMarket: dto.targetMarket || null,
        planId: dto.planId || null,
        initiativeId: dto.initiativeId || null,
        status: 'GENERATING',
      },
    });

    // Enqueue generation
    await this.queue.enqueueWebsiteGeneration({
      websiteId: website.id,
      workspaceId,
      userId,
      additionalInstructions: dto.additionalInstructions,
    });

    return website;
  }

  async updateWebsite(workspaceId: string, websiteId: string, dto: UpdateWebsiteProjectRequest) {
    await this.getWebsite(workspaceId, websiteId);

    return this.prisma.websiteProject.update({
      where: { id: websiteId },
      data: {
        name: dto.name,
        websiteType: dto.websiteType,
        description: dto.description,
        targetAudience: dto.targetAudience,
        targetMarket: dto.targetMarket,
        status: dto.status as any,
      },
      include: {
        theme: true,
      },
    });
  }

  async deleteWebsite(workspaceId: string, websiteId: string) {
    await this.getWebsite(workspaceId, websiteId);

    await this.prisma.websiteProject.delete({
      where: { id: websiteId },
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Theme Management
  // ---------------------------------------------------------------------------

  async updateTheme(workspaceId: string, websiteId: string, dto: UpdateWebsiteThemeRequest) {
    await this.getWebsite(workspaceId, websiteId);

    return this.prisma.websiteTheme.upsert({
      where: { websiteId },
      create: {
        websiteId,
        primaryColor: dto.primaryColor || '#3563F6',
        secondaryColor: dto.secondaryColor || '#6554E8',
        backgroundColor: dto.backgroundColor || '#FFFFFF',
        surfaceColor: dto.surfaceColor || '#F7F9FC',
        textColor: dto.textColor || '#0F172A',
        headingFont: dto.headingFont || 'Inter',
        bodyFont: dto.bodyFont || 'Inter',
        buttonStyle: dto.buttonStyle || 'ROUNDED',
        borderRadius: dto.borderRadius || '8px',
        sectionSpacing: dto.sectionSpacing || 'MEDIUM',
      },
      update: {
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        backgroundColor: dto.backgroundColor,
        surfaceColor: dto.surfaceColor,
        textColor: dto.textColor,
        headingFont: dto.headingFont,
        bodyFont: dto.bodyFont,
        buttonStyle: dto.buttonStyle,
        borderRadius: dto.borderRadius,
        sectionSpacing: dto.sectionSpacing,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Page & Section Management
  // ---------------------------------------------------------------------------

  async createPage(workspaceId: string, websiteId: string, dto: CreateWebsitePageRequest) {
    await this.getWebsite(workspaceId, websiteId);

    // Ensure slug is formatted with leading slash
    let slug = dto.slug.trim();
    if (!slug.startsWith('/')) {
      slug = `/${slug}`;
    }

    // Check duplicate slug
    const duplicate = await this.prisma.websitePage.findUnique({
      where: {
        websiteId_slug: {
          websiteId,
          slug,
        },
      },
    });
    if (duplicate) {
      throw new ConflictException(`A page with slug "${slug}" already exists on this website.`);
    }

    const sanitizedSections = this.renderer.validateAndSanitizeSections(dto.sections || []);

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.isHome) {
          // Remove home status from other pages
          await tx.websitePage.updateMany({
            where: { websiteId, isHome: true },
            data: { isHome: false },
          });
        }

        return tx.websitePage.create({
          data: {
            websiteId,
            title: dto.title,
            slug,
            pageOrder: dto.pageOrder ?? 0,
            isHome: dto.isHome ?? false,
            seoTitle: dto.seoTitle || dto.title,
            seoDescription: dto.seoDescription || null,
            sections: sanitizedSections as any,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  async updatePage(
    workspaceId: string,
    websiteId: string,
    pageId: string,
    dto: UpdateWebsitePageRequest,
  ) {
    await this.getWebsite(workspaceId, websiteId);

    const page = await this.prisma.websitePage.findUnique({
      where: { id: pageId },
    });
    if (!page || page.websiteId !== websiteId) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    let slug = dto.slug ? dto.slug.trim() : undefined;
    if (slug && !slug.startsWith('/')) {
      slug = `/${slug}`;
    }

    if (slug && slug !== page.slug) {
      const duplicate = await this.prisma.websitePage.findUnique({
        where: {
          websiteId_slug: {
            websiteId,
            slug,
          },
        },
      });
      if (duplicate) {
        throw new ConflictException(`A page with slug "${slug}" already exists on this website.`);
      }
    }

    let sanitizedSections: any = undefined;
    if (dto.sections !== undefined) {
      sanitizedSections = this.renderer.validateAndSanitizeSections(dto.sections);
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.isHome) {
          await tx.websitePage.updateMany({
            where: { websiteId, isHome: true, id: { not: pageId } },
            data: { isHome: false },
          });
        }

        return tx.websitePage.update({
          where: { id: pageId },
          data: {
            title: dto.title,
            slug,
            pageOrder: dto.pageOrder,
            isHome: dto.isHome,
            seoTitle: dto.seoTitle,
            seoDescription: dto.seoDescription,
            sections: sanitizedSections,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  async deletePage(workspaceId: string, websiteId: string, pageId: string) {
    await this.getWebsite(workspaceId, websiteId);

    const pageCount = await this.prisma.websitePage.count({
      where: { websiteId },
    });
    if (pageCount <= 1) {
      throw new BadRequestException('Cannot delete the only page of a website');
    }

    await this.prisma.websitePage.delete({
      where: { id: pageId },
    });

    return { success: true };
  }

  async savePageSections(
    workspaceId: string,
    websiteId: string,
    pageId: string,
    sections: any[],
  ) {
    await this.getWebsite(workspaceId, websiteId);

    const page = await this.prisma.websitePage.findUnique({
      where: { id: pageId },
    });
    if (!page || page.websiteId !== websiteId) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    const sanitizedSections = this.renderer.validateAndSanitizeSections(sections);

    return this.prisma.websitePage.update({
      where: { id: pageId },
      data: {
        sections: sanitizedSections as any,
      },
    });
  }

  async regenerateSection(
    workspaceId: string,
    websiteId: string,
    pageId: string,
    sectionId: string,
    dto: RegenerateSectionRequest,
  ) {
    await this.getWebsite(workspaceId, websiteId);

    const regenerated = await this.orchestrator.regenerateSection(
      workspaceId,
      websiteId,
      dto.sectionType,
      dto.prompt,
    );

    return regenerated;
  }

  // ---------------------------------------------------------------------------
  // Version Snapshots & Restoration
  // ---------------------------------------------------------------------------

  async listVersions(workspaceId: string, websiteId: string) {
    await this.getWebsite(workspaceId, websiteId);

    return this.prisma.websiteVersion.findMany({
      where: { websiteId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async createVersion(
    workspaceId: string,
    websiteId: string,
    userId: string,
    title?: string,
    changeSummary?: string,
  ) {
    const website = await this.getWebsite(workspaceId, websiteId);

    const nextVersionNumber = website.currentVersionNumber + 1;
    const snapshot = {
      theme: website.theme,
      pages: website.pages.map((p) => ({
        title: p.title,
        slug: p.slug,
        isHome: p.isHome,
        pageOrder: p.pageOrder,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        sections: p.sections,
      })),
    };

    return this.prisma.$transaction(
      async (tx) => {
        const version = await tx.websiteVersion.create({
          data: {
            websiteId,
            versionNumber: nextVersionNumber,
            title: title || `v${nextVersionNumber}.0 Snapshot`,
            snapshot: snapshot as any,
            changeSummary: changeSummary || 'Manual snapshot save',
            createdById: userId,
          },
        });

        await tx.websiteProject.update({
          where: { id: websiteId },
          data: { currentVersionNumber: nextVersionNumber },
        });

        return version;
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  async restoreVersion(workspaceId: string, websiteId: string, versionId: string) {
    await this.getWebsite(workspaceId, websiteId);

    const version = await this.prisma.websiteVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.websiteId !== websiteId) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const snapshot = version.snapshot as any;
    if (!snapshot || !Array.isArray(snapshot.pages)) {
      throw new BadRequestException('Version snapshot is invalid or corrupted');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Restore theme
        if (snapshot.theme) {
          await tx.websiteTheme.upsert({
            where: { websiteId },
            create: {
              websiteId,
              primaryColor: snapshot.theme.primaryColor || '#3563F6',
              secondaryColor: snapshot.theme.secondaryColor || '#6554E8',
              backgroundColor: snapshot.theme.backgroundColor || '#FFFFFF',
              surfaceColor: snapshot.theme.surfaceColor || '#F7F9FC',
              textColor: snapshot.theme.textColor || '#0F172A',
              headingFont: snapshot.theme.headingFont || 'Inter',
              bodyFont: snapshot.theme.bodyFont || 'Inter',
              buttonStyle: snapshot.theme.buttonStyle || 'ROUNDED',
              borderRadius: snapshot.theme.borderRadius || '8px',
              sectionSpacing: snapshot.theme.sectionSpacing || 'MEDIUM',
            },
            update: {
              primaryColor: snapshot.theme.primaryColor,
              secondaryColor: snapshot.theme.secondaryColor,
              backgroundColor: snapshot.theme.backgroundColor,
              surfaceColor: snapshot.theme.surfaceColor,
              textColor: snapshot.theme.textColor,
              headingFont: snapshot.theme.headingFont,
              bodyFont: snapshot.theme.bodyFont,
              buttonStyle: snapshot.theme.buttonStyle,
              borderRadius: snapshot.theme.borderRadius,
              sectionSpacing: snapshot.theme.sectionSpacing,
            },
          });
        }

        // 2. Clear current pages and restore snapshot pages
        await tx.websitePage.deleteMany({
          where: { websiteId },
        });

        for (let idx = 0; idx < snapshot.pages.length; idx++) {
          const sp = snapshot.pages[idx];
          const sanitizedSections = this.renderer.validateAndSanitizeSections(sp.sections || []);
          await tx.websitePage.create({
            data: {
              websiteId,
              title: sp.title,
              slug: sp.slug,
              isHome: sp.isHome !== undefined ? sp.isHome : idx === 0,
              pageOrder: sp.pageOrder !== undefined ? sp.pageOrder : idx,
              seoTitle: sp.seoTitle || null,
              seoDescription: sp.seoDescription || null,
              sections: sanitizedSections as any,
            },
          });
        }

        // 3. Update currentVersionNumber
        return tx.websiteProject.update({
          where: { id: websiteId },
          data: {
            currentVersionNumber: version.versionNumber,
          },
          include: {
            theme: true,
            pages: { orderBy: { pageOrder: 'asc' } },
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  // ---------------------------------------------------------------------------
  // Publishing Engine
  // ---------------------------------------------------------------------------

  async publishWebsite(
    workspaceId: string,
    websiteId: string,
    userId: string,
    rawSubdomain: string,
  ) {
    const website = await this.getWebsite(workspaceId, websiteId);

    const subdomain = rawSubdomain.toLowerCase().trim();

    // 1. Reserved subdomain check
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      throw new BadRequestException(`Subdomain "${subdomain}" is reserved by the platform.`);
    }

    // 2. Regex format check
    const subdomainRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
    if (!subdomainRegex.test(subdomain)) {
      throw new BadRequestException(
        'Subdomain must be 3-63 characters, contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.',
      );
    }

    // 3. Collision check: cannot be used by ANY OTHER website across the entire database
    const existingPub = await this.prisma.websitePublication.findFirst({
      where: {
        subdomain,
        status: 'ACTIVE',
        websiteId: { not: websiteId },
      },
    });
    if (existingPub) {
      throw new ConflictException(
        `Subdomain "${subdomain}" is already claimed by another live website. Please choose another subdomain.`,
      );
    }

    const nextVersionNumber = website.currentVersionNumber + 1;
    const snapshot = {
      theme: website.theme,
      pages: website.pages.map((p) => ({
        title: p.title,
        slug: p.slug,
        isHome: p.isHome,
        pageOrder: p.pageOrder,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        sections: p.sections,
      })),
    };

    const publishedUrl = `https://${subdomain}.sites.aeonexus.com`;

    return this.prisma.$transaction(
      async (tx) => {
        // Create immutable snapshot for this publication
        const version = await tx.websiteVersion.create({
          data: {
            websiteId,
            versionNumber: nextVersionNumber,
            title: `v${nextVersionNumber}.0 (Published Release)`,
            snapshot: snapshot as any,
            changeSummary: `Published to ${publishedUrl}`,
            createdById: userId,
          },
        });

        // Set previous active publications for this website to SUPERSEDED
        await tx.websitePublication.updateMany({
          where: { websiteId, status: 'ACTIVE' },
          data: { status: 'SUPERSEDED' },
        });

        // Create active publication
        const publication = await tx.websitePublication.create({
          data: {
            websiteId,
            versionId: version.id,
            subdomain,
            publishedUrl,
            publishedById: userId,
            status: 'ACTIVE',
          },
        });

        // Update website status
        const updatedWebsite = await tx.websiteProject.update({
          where: { id: websiteId },
          data: {
            isPublished: true,
            publishedSubdomain: subdomain,
            publishedAt: new Date(),
            status: 'PUBLISHED',
            currentVersionNumber: nextVersionNumber,
          },
        });

        return {
          website: updatedWebsite,
          publication,
          version,
        };
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  async unpublishWebsite(workspaceId: string, websiteId: string) {
    const website = await this.getWebsite(workspaceId, websiteId);

    if (!website.isPublished) {
      return { success: true, message: 'Website is already unpublished.' };
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.websitePublication.updateMany({
          where: { websiteId, status: 'ACTIVE' },
          data: {
            status: 'UNPUBLISHED',
            unpublishedAt: new Date(),
          },
        });

        await tx.websiteProject.update({
          where: { id: websiteId },
          data: {
            isPublished: false,
            status: 'READY',
          },
        });

        return { success: true, message: 'Website has been unpublished.' };
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  // ---------------------------------------------------------------------------
  // Public Website Gateway (Multi-tenant Safe, Immutable Snapshot)
  // ---------------------------------------------------------------------------

  async getPublicWebsite(subdomain: string) {
    const cleanSubdomain = subdomain.toLowerCase().trim();

    const publication = await this.prisma.websitePublication.findFirst({
      where: {
        subdomain: cleanSubdomain,
        status: 'ACTIVE',
      },
      include: {
        website: true,
        version: true,
      },
    });

    if (!publication || !publication.website || !publication.website.isPublished) {
      throw new NotFoundException(`No published website found for subdomain "${cleanSubdomain}".`);
    }

    const snapshot = publication.version.snapshot as any;
    if (!snapshot || !snapshot.pages) {
      throw new NotFoundException('Published website data is unavailable.');
    }

    // Build sanitized public output stripping private workspace details
    return this.renderer.buildPublicWebsitePayload(
      publication.website,
      snapshot.theme,
      snapshot.pages,
    );
  }
}

