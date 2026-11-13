import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderRegistry } from '../ai/providers/provider.registry';
import { AiUsageService } from '../ai/usage/usage.service';
import { WorkspaceContextService } from '../ai/context/workspace-context.service';
import { PromptSanitizer } from '../ai/prompts/prompt-sanitizer';
import { AiCompletionRequest } from '../ai/providers/ai-provider.interface';
import { WebsiteRendererService } from './website-renderer.service';
import { SectionType } from '@aeo-nexus/contracts';

@Injectable()
export class WebsiteOrchestratorService {
  private readonly logger = new Logger(WebsiteOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageService: AiUsageService,
    private readonly contextService: WorkspaceContextService,
    private readonly renderer: WebsiteRendererService,
  ) {}

  async executeWebsiteGeneration(
    websiteId: string,
    workspaceId: string,
    userId: string,
    additionalInstructions?: string,
  ): Promise<void> {
    this.logger.log(`Beginning AI website generation for website ${websiteId} in workspace ${workspaceId}`);

    const website = await this.prisma.websiteProject.findUnique({
      where: { id: websiteId },
      include: {
        plan: true,
        initiative: true,
        theme: true,
      },
    });

    if (!website || website.workspaceId !== workspaceId) {
      throw new NotFoundException(`Website project ${websiteId} not found in workspace`);
    }

    if (website.status === 'ARCHIVED') {
      this.logger.warn(`Website ${websiteId} is ARCHIVED. Skipping generation.`);
      return;
    }

    // 1. Budget Verification
    await this.usageService.checkBudgetOrThrow(workspaceId);

    // 2. Mark project as GENERATING
    await this.prisma.websiteProject.update({
      where: { id: websiteId },
      data: { status: 'GENERATING' },
    });

    // 3. Create WebsiteGenerationRun record
    const run = await this.prisma.websiteGenerationRun.create({
      data: {
        websiteId,
        provider: 'mock',
        model: 'mock-agent-fast',
        prompt: additionalInstructions || `Generate website for ${website.name}`,
        status: 'RUNNING',
      },
    });

    const startTime = Date.now();
    let selectedProviderName = 'mock';
    let selectedModelName = 'mock-agent-fast';

    try {
      // 4. Assemble Context
      const contextBundle = await this.contextService.buildBoundedContext(workspaceId, userId);

      // 5. Resolve AI Provider Adapter
      let adapter = this.providerRegistry.getAdapter('openai');
      if (adapter && adapter.isConfigured() && adapter.id === 'openai') {
        selectedProviderName = 'openai';
        selectedModelName = 'gpt-4o';
      } else {
        adapter = this.providerRegistry.getAdapter('gemini');
        if (adapter && adapter.isConfigured() && adapter.id === 'gemini') {
          selectedProviderName = 'gemini';
          selectedModelName = 'gemini-1.5-pro';
        } else {
          adapter = this.providerRegistry.getAdapter('mock');
          selectedProviderName = 'mock';
          selectedModelName = 'mock-agent-fast';
        }
      }

      this.logger.log(`Using AI Provider "${selectedProviderName}" (${selectedModelName}) for website ${websiteId}`);

      const sanitizedName = PromptSanitizer.sanitizeUserInput(website.name).cleanText;
      const sanitizedDesc = PromptSanitizer.sanitizeUserInput(website.description || '').cleanText;
      const sanitizedAudience = PromptSanitizer.sanitizeUserInput(website.targetAudience || '').cleanText;

      const systemPrompt = `You are the AEO Nexus AI Website Builder Engine.
Your task is to generate a comprehensive, highly-structured website architecture for a business.
Follow these critical rules:
1. WEBSITE_GENERATION mode.
2. Return ONLY a valid JSON object matching the specification below. Do not wrap in markdown or include conversational text.
3. Allowed Section Types: HERO, ANNOUNCEMENT_BAR, NAVIGATION, LOGO_STRIP, FEATURES, SERVICES, ABOUT, IMAGE_TEXT, GALLERY, PROCESS_STEPS, PRICING, FAQ, TESTIMONIALS, CONTACT, CTA, FOOTER.
4. For TESTIMONIALS or case studies, NEVER fabricate real human customer quotes or names. Use transparent placeholder labels or emphasize factual features.
5. All URLs in CTA buttons or links must be relative paths (e.g., "/services", "/contact") or valid "https://" links.
6. Provide modern, accessible color schemes and clean typography.

JSON Schema:
{
  "theme": {
    "primaryColor": "#3563F6",
    "secondaryColor": "#6554E8",
    "backgroundColor": "#FFFFFF",
    "surfaceColor": "#F7F9FC",
    "textColor": "#0F172A",
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "buttonStyle": "ROUNDED",
    "borderRadius": "8px",
    "sectionSpacing": "MEDIUM"
  },
  "pages": [
    {
      "title": "Home",
      "slug": "/",
      "isHome": true,
      "seoTitle": "Page SEO Title",
      "seoDescription": "Page SEO Meta Description",
      "sections": [
        {
          "id": "sec_hero_1",
          "type": "HERO",
          "order": 0,
          "content": {
            "badge": "string",
            "headline": "string",
            "subheadline": "string",
            "primaryCta": { "text": "string", "href": "/contact" },
            "secondaryCta": { "text": "string", "href": "/services" }
          }
        }
      ]
    }
  ]
}`;

      const userPrompt = `Generate a comprehensive website for:
Website Name: ${sanitizedName}
Website Type: ${website.websiteType}
Business Description: ${sanitizedDesc}
Target Audience: ${sanitizedAudience}
${website.plan ? `Strategic Plan Summary: ${website.plan.executiveSummary || website.plan.title}` : ''}
${website.initiative ? `Initiative Objective: ${website.initiative.name} - ${website.initiative.description}` : ''}
${additionalInstructions ? `Specific User Requirements: ${PromptSanitizer.sanitizeUserInput(additionalInstructions).cleanText}` : ''}`;

      const request: AiCompletionRequest = {
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        model: selectedModelName,
        temperature: 0.25,
        workspaceId,
      };

      const completion = await adapter.generateCompletion(request);
      const latencyMs = Date.now() - startTime;

      // 6. Record usage
      if (completion.usage) {
        await this.usageService.recordUsage({
          workspaceId,
          userId,
          provider: selectedProviderName,
          model: selectedModelName,
          requestId: run.id,
          promptTokens: completion.usage.promptTokens,
          completionTokens: completion.usage.completionTokens,
        });
      }

      // 7. Parse & Sanitize Output
      const parsedOutput = this.safeParseOutput(completion.content, sanitizedName);

      // 8. Commit to Database inside interactive transaction
      await this.prisma.$transaction(
        async (tx) => {
          // A. Theme upsert
          const themeData = parsedOutput.theme || {};
          await tx.websiteTheme.upsert({
            where: { websiteId },
            create: {
              websiteId,
              primaryColor: themeData.primaryColor || '#3563F6',
              secondaryColor: themeData.secondaryColor || '#6554E8',
              backgroundColor: themeData.backgroundColor || '#FFFFFF',
              surfaceColor: themeData.surfaceColor || '#F7F9FC',
              textColor: themeData.textColor || '#0F172A',
              headingFont: themeData.headingFont || 'Inter',
              bodyFont: themeData.bodyFont || 'Inter',
              buttonStyle: themeData.buttonStyle || 'ROUNDED',
              borderRadius: themeData.borderRadius || '8px',
              sectionSpacing: themeData.sectionSpacing || 'MEDIUM',
            },
            update: {
              primaryColor: themeData.primaryColor || undefined,
              secondaryColor: themeData.secondaryColor || undefined,
              backgroundColor: themeData.backgroundColor || undefined,
              surfaceColor: themeData.surfaceColor || undefined,
              textColor: themeData.textColor || undefined,
              headingFont: themeData.headingFont || undefined,
              bodyFont: themeData.bodyFont || undefined,
              buttonStyle: themeData.buttonStyle || undefined,
              borderRadius: themeData.borderRadius || undefined,
              sectionSpacing: themeData.sectionSpacing || undefined,
            },
          });

          // B. Delete existing pages to ensure clean replacement
          await tx.websitePage.deleteMany({
            where: { websiteId },
          });

          // C. Insert new pages with sanitized sections
          const createdPages = [];
          for (let pIdx = 0; pIdx < parsedOutput.pages.length; pIdx++) {
            const pageDef = parsedOutput.pages[pIdx];
            const sanitizedSections = this.renderer.validateAndSanitizeSections(pageDef.sections || []);

            const pageRecord = await tx.websitePage.create({
              data: {
                websiteId,
                title: pageDef.title || (pIdx === 0 ? 'Home' : `Page ${pIdx + 1}`),
                slug: pageDef.slug || (pIdx === 0 ? '/' : `/page-${pIdx + 1}`),
                isHome: pageDef.isHome !== undefined ? pageDef.isHome : pIdx === 0,
                pageOrder: pIdx,
                seoTitle: pageDef.seoTitle || pageDef.title,
                seoDescription: pageDef.seoDescription || null,
                sections: sanitizedSections as any,
              },
            });
            createdPages.push(pageRecord);
          }

          // D. Snapshot Version 1
          const snapshotPayload = {
            theme: parsedOutput.theme,
            pages: createdPages.map((cp) => ({
              title: cp.title,
              slug: cp.slug,
              isHome: cp.isHome,
              pageOrder: cp.pageOrder,
              seoTitle: cp.seoTitle,
              seoDescription: cp.seoDescription,
              sections: cp.sections,
            })),
          };

          await tx.websiteVersion.upsert({
            where: {
              websiteId_versionNumber: {
                websiteId,
                versionNumber: 1,
              },
            },
            create: {
              websiteId,
              versionNumber: 1,
              title: 'v1.0 (Initial AI Generation)',
              snapshot: snapshotPayload as any,
              changeSummary: 'Complete multi-page website generated from business context.',
              createdById: userId,
            },
            update: {
              title: 'v1.0 (Initial AI Generation)',
              snapshot: snapshotPayload as any,
              changeSummary: 'Complete multi-page website regenerated from business context.',
            },
          });

          // E. Update project status
          await tx.websiteProject.update({
            where: { id: websiteId },
            data: {
              status: 'READY',
              currentVersionNumber: 1,
            },
          });

          // F. Update Generation Run to COMPLETED
          await tx.websiteGenerationRun.update({
            where: { id: run.id },
            data: {
              status: 'COMPLETED',
              provider: selectedProviderName,
              model: selectedModelName,
              promptTokens: completion.usage?.promptTokens || 0,
              completionTokens: completion.usage?.completionTokens || 0,
              totalTokens: completion.usage?.totalTokens || 0,
              latencyMs,
              rawResponse: completion.content,
            },
          });
        },
        { maxWait: 15000, timeout: 30000 },
      );

      this.logger.log(`Successfully completed AI generation for website ${websiteId} in ${latencyMs}ms`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Website generation failed for ${websiteId}: ${errorMsg}`, err instanceof Error ? err.stack : undefined);

      // Update project status back to DRAFT and run to FAILED
      try {
        await this.prisma.websiteProject.update({
          where: { id: websiteId },
          data: { status: 'DRAFT' },
        });

        await this.prisma.websiteGenerationRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            error: errorMsg,
          },
        });
      } catch (cleanupErr) {
        this.logger.error(`Failed to update error status for website ${websiteId}: ${cleanupErr}`);
      }

      throw err;
    }
  }

  async regenerateSection(
    workspaceId: string,
    websiteId: string,
    sectionType: SectionType,
    prompt?: string,
  ): Promise<any> {
    await this.usageService.checkBudgetOrThrow(workspaceId);

    const adapter = this.providerRegistry.getAdapter();
    const systemPrompt = `You are the AEO Nexus AI Website Builder Section Generator.
Task: REGENERATE_SECTION.
Generate a modern, high-converting section of type: "${sectionType}".
Return ONLY a valid JSON object matching:
{
  "type": "${sectionType}",
  "content": { ...section specific fields... }
}`;

    const completion = await adapter.generateCompletion({
      messages: [{ role: 'user', content: prompt || `Regenerate section ${sectionType}` }],
      systemPrompt,
      model: 'mock-agent-fast',
      temperature: 0.3,
      workspaceId,
    });

    try {
      let cleaned = completion.content.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

      const parsed = JSON.parse(cleaned);
      if (!this.renderer.isValidSectionType(parsed.type || sectionType)) {
        parsed.type = sectionType;
      }
      return {
        id: `sec_${sectionType.toLowerCase()}_${Date.now()}`,
        type: parsed.type,
        order: 0,
        content: this.renderer.sanitizeContent(parsed.content || {}),
      };
    } catch (e) {
      // Return safe fallback section
      return {
        id: `sec_${sectionType.toLowerCase()}_${Date.now()}`,
        type: sectionType,
        order: 0,
        content: {
          title: `Refreshed ${sectionType}`,
          description: 'Updated section content generated by AI.',
        },
      };
    }
  }

  private safeParseOutput(raw: string, websiteName: string): any {
    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

      return JSON.parse(cleaned);
    } catch (e) {
      this.logger.warn(`Failed to parse AI output as JSON. Generating safe fallback for "${websiteName}".`);
      return {
        theme: {
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
        pages: [
          {
            title: 'Home',
            slug: '/',
            isHome: true,
            seoTitle: `${websiteName} | Home`,
            seoDescription: `Official website of ${websiteName}`,
            sections: [
              {
                id: 'sec_hero_default',
                type: 'HERO',
                order: 0,
                content: {
                  badge: 'Welcome',
                  headline: websiteName,
                  subheadline: 'Crafting exceptional business outcomes through strategic execution.',
                  primaryCta: { text: 'Get In Touch', href: '/contact' },
                },
              },
              {
                id: 'sec_footer_default',
                type: 'FOOTER',
                order: 1,
                content: {
                  brandName: websiteName,
                  copyright: `© ${new Date().getFullYear()} ${websiteName}. All rights reserved.`,
                  links: [{ label: 'Home', href: '/' }],
                },
              },
            ],
          },
        ],
      };
    }
  }
}
