import { Injectable, BadRequestException } from '@nestjs/common';
import { SectionType, SectionTypeEnum } from '@aeo-nexus/contracts';

export interface SanitizedSection {
  id: string;
  type: SectionType;
  order: number;
  content: Record<string, any>;
}

@Injectable()
export class WebsiteRendererService {
  private readonly allowedSectionTypes = new Set<string>(SectionTypeEnum.options);

  /**
   * Validates if a section type is in the strict allowlist.
   */
  isValidSectionType(type: string): type is SectionType {
    return this.allowedSectionTypes.has(type);
  }

  /**
   * Sanitizes a URL string. Rejects unsafe protocols (javascript:, data:, vbscript:).
   * Allows http:, https:, mailto:, tel:, or relative paths starting with '/'.
   */
  sanitizeUrl(url: unknown): string {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    // Relative paths
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }

    // Protocol check
    try {
      const parsed = new URL(trimmed);
      const proto = parsed.protocol.toLowerCase();
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(proto)) {
        return trimmed;
      }
      throw new BadRequestException(`Unsafe URL protocol: ${proto}`);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // If it fails URL parsing and is not a relative path, reject
      throw new BadRequestException(`Invalid or unsafe URL: ${trimmed}`);
    }
  }

  /**
   * Sanitizes text strings to prevent stored XSS or HTML injection.
   */
  sanitizeText(text: unknown): string {
    if (typeof text !== 'string') return '';
    return text
      .replace(/\0/g, '') // remove null bytes
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip scripts
      .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '') // strip quoted or unquoted event handlers
      .replace(/javascript\s*:/gi, '')
      .trim();
  }

  /**
   * Recursively sanitizes any section content payload.
   */
  sanitizeContent(payload: any): any {
    if (payload === null || payload === undefined) {
      return payload;
    }
    if (typeof payload === 'string') {
      // Check if it's a URL-like key or looks like an action link
      return this.sanitizeText(payload);
    }
    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizeContent(item));
    }
    if (typeof payload === 'object') {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(payload)) {
        if (key.toLowerCase().includes('url') || key.toLowerCase().includes('href') || key.toLowerCase().includes('link')) {
          if (typeof val === 'string' && val.trim() !== '') {
            try {
              sanitizedObj[key] = this.sanitizeUrl(val);
            } catch (err) {
              throw new BadRequestException(`Security validation failed: Field "${key}" contains an unsafe or invalid URL.`);
            }
          } else {
            sanitizedObj[key] = val;
          }
        } else {
          sanitizedObj[key] = this.sanitizeContent(val);
        }
      }
      return sanitizedObj;
    }
    return payload;
  }

  /**
   * Validates and normalizes an array of sections for a page.
   */
  validateAndSanitizeSections(sections: any[]): SanitizedSection[] {
    if (!Array.isArray(sections)) {
      throw new BadRequestException('Sections must be an array');
    }

    return sections.map((sec, idx) => {
      if (!sec || typeof sec !== 'object') {
        throw new BadRequestException(`Section at index ${idx} is not a valid object`);
      }

      const type = sec.type;
      if (!this.isValidSectionType(type)) {
        throw new BadRequestException(
          `Invalid section type "${type}" at index ${idx}. Must be one of: ${SectionTypeEnum.options.join(', ')}`,
        );
      }

      const id = typeof sec.id === 'string' && sec.id.trim() ? sec.id.trim() : `sec_${type.toLowerCase()}_${Date.now()}_${idx}`;
      const order = typeof sec.order === 'number' ? sec.order : idx;
      const content = sec.content && typeof sec.content === 'object' ? this.sanitizeContent(sec.content) : {};

      return {
        id,
        type,
        order,
        content,
      };
    });
  }

  /**
   * Prepares a clean, safe public website representation, stripping all internal metadata.
   */
  buildPublicWebsitePayload(website: any, theme: any, pages: any[]): any {
    return {
      name: website.name,
      slug: website.slug,
      subdomain: website.publishedSubdomain || '',
      publishedUrl: `https://${website.publishedSubdomain}.sites.aeonexus.com`,
      publishedAt: website.publishedAt ? new Date(website.publishedAt).toISOString() : new Date().toISOString(),
      theme: {
        primaryColor: theme?.primaryColor || '#3563F6',
        secondaryColor: theme?.secondaryColor || '#6554E8',
        backgroundColor: theme?.backgroundColor || '#FFFFFF',
        surfaceColor: theme?.surfaceColor || '#F7F9FC',
        textColor: theme?.textColor || '#0F172A',
        headingFont: theme?.headingFont || 'Inter',
        bodyFont: theme?.bodyFont || 'Inter',
        buttonStyle: theme?.buttonStyle || 'ROUNDED',
        borderRadius: theme?.borderRadius || '8px',
        sectionSpacing: theme?.sectionSpacing || 'MEDIUM',
      },
      pages: pages
        .sort((a, b) => a.pageOrder - b.pageOrder)
        .map((p) => ({
          title: p.title,
          slug: p.slug,
          isHome: p.isHome,
          seoTitle: p.seoTitle || null,
          seoDescription: p.seoDescription || null,
          sections: this.validateAndSanitizeSections(p.sections || []),
        })),
    };
  }
}
