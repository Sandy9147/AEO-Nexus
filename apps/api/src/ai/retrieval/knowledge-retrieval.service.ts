import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolCallCitation } from '../providers/ai-provider.interface';

export interface RetrievedDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  snippet: string;
  sourceUrl?: string | null;
  score: number;
}

@Injectable()
export class KnowledgeRetrievalService {
  private readonly logger = new Logger(KnowledgeRetrievalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search published knowledge documents strictly scoped to the workspace.
   * Matches across title, content, and tags.
   */
  async retrieveRelevantDocuments(
    workspaceId: string,
    query: string,
    limit = 5,
  ): Promise<{ documents: RetrievedDocument[]; citations: ToolCallCitation[] }> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return { documents: [], citations: [] };
    }

    // Split search terms for basic lexical ranking
    const terms = cleanQuery.split(/\s+/).filter((t) => t.length > 2);

    // Query published documents for this workspace ONLY
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: {
        workspaceId,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        category: true,
        content: true,
        tags: true,
        sourceUrl: true,
      },
      take: 20, // Inspect up to 20 candidate published docs
    });

    const scoredDocs = docs.map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const tagsJoined = doc.tags.join(' ').toLowerCase();

      // Full phrase matches
      if (titleLower.includes(cleanQuery)) score += 10;
      if (contentLower.includes(cleanQuery)) score += 5;
      if (tagsJoined.includes(cleanQuery)) score += 8;

      // Individual term matches
      for (const term of terms) {
        if (titleLower.includes(term)) score += 3;
        if (contentLower.includes(term)) score += 1;
        if (tagsJoined.includes(term)) score += 2;
      }

      // Generate snippet
      let snippet = doc.content.substring(0, 200);
      const matchIndex = contentLower.indexOf(terms[0] || cleanQuery);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 60);
        const end = Math.min(doc.content.length, matchIndex + 140);
        snippet = (start > 0 ? '...' : '') + doc.content.substring(start, end) + (end < doc.content.length ? '...' : '');
      }

      return {
        id: doc.id,
        title: doc.title,
        category: String(doc.category),
        content: doc.content,
        snippet,
        sourceUrl: doc.sourceUrl,
        score,
      };
    });

    // Sort by score descending and take top N matches with score > 0 (or all if query is generic)
    const filtered = scoredDocs
      .filter((d) => d.score > 0 || terms.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const citations: ToolCallCitation[] = filtered.map((d) => ({
      documentId: d.id,
      title: d.title,
      snippet: d.snippet,
      url: d.sourceUrl || undefined,
    }));

    return { documents: filtered, citations };
  }
}
