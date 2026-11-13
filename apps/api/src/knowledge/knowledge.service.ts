import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateKnowledgeDocumentRequest,
  UpdateKnowledgeDocumentRequest,
  KnowledgeDocumentDto,
  KnowledgeDocumentDetailDto,
  KnowledgeCategory,
  KnowledgeStatus,
} from '@aeo-nexus/contracts';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listDocuments(
    workspaceId: string,
    userId: string,
    params?: { category?: string; status?: string; search?: string },
  ): Promise<KnowledgeDocumentDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const where: any = { workspaceId };
    if (params?.category) {
      where.category = params.category;
    }
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
        { tags: { has: params.search } },
      ];
    }

    const docs = await this.prisma.knowledgeDocument.findMany({
      where,
      include: {
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
        versions: {
          select: { versionNumber: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      workspaceId: d.workspaceId,
      title: d.title,
      category: d.category as KnowledgeCategory,
      contentSnippet: d.content.slice(0, 180) + (d.content.length > 180 ? '...' : ''),
      status: d.status as KnowledgeStatus,
      tags: d.tags,
      sourceUrl: d.sourceUrl,
      authorId: d.authorId,
      author: d.author,
      currentVersion: d.versions[0]?.versionNumber || 1,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  async getDocument(
    workspaceId: string,
    userId: string,
    documentId: string,
  ): Promise<KnowledgeDocumentDetailDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      include: {
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
        versions: {
          include: {
            createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!doc || doc.workspaceId !== workspaceId) {
      throw new NotFoundException('Document not found in this workspace');
    }

    const currentVersion = doc.versions[0]?.versionNumber || 1;

    return {
      id: doc.id,
      workspaceId: doc.workspaceId,
      title: doc.title,
      category: doc.category as KnowledgeCategory,
      contentSnippet: doc.content.slice(0, 180) + (doc.content.length > 180 ? '...' : ''),
      content: doc.content,
      status: doc.status as KnowledgeStatus,
      tags: doc.tags,
      sourceUrl: doc.sourceUrl,
      authorId: doc.authorId,
      author: doc.author,
      currentVersion,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      versions: doc.versions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        version: v.versionNumber,
        title: v.title,
        content: v.content,
        changeNote: v.changeSummary,
        createdById: v.createdById,
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  async createDocument(
    workspaceId: string,
    userId: string,
    dto: CreateKnowledgeDocumentRequest,
  ): Promise<KnowledgeDocumentDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        workspaceId,
        title: dto.title.trim(),
        category: dto.category,
        content: dto.content,
        status: dto.status || 'PUBLISHED',
        tags: dto.tags || [],
        sourceUrl: dto.sourceUrl || null,
        authorId: userId,
        versions: {
          create: {
            versionNumber: 1,
            title: dto.title.trim(),
            content: dto.content,
            changeSummary: 'Initial publication',
            createdById: userId,
          },
        },
      },
      include: {
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'created',
        resourceType: 'knowledge_document',
        resourceId: doc.id,
        details: { title: doc.title, category: doc.category },
      },
    });

    return {
      id: doc.id,
      workspaceId: doc.workspaceId,
      title: doc.title,
      category: doc.category as KnowledgeCategory,
      contentSnippet: doc.content.slice(0, 180) + (doc.content.length > 180 ? '...' : ''),
      status: doc.status as KnowledgeStatus,
      tags: doc.tags,
      sourceUrl: doc.sourceUrl,
      authorId: doc.authorId,
      author: doc.author,
      currentVersion: 1,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async updateDocument(
    workspaceId: string,
    userId: string,
    documentId: string,
    dto: UpdateKnowledgeDocumentRequest,
  ): Promise<KnowledgeDocumentDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          select: { versionNumber: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!doc || doc.workspaceId !== workspaceId) {
      throw new NotFoundException('Document not found in this workspace');
    }

    const titleChanged = dto.title !== undefined && dto.title.trim() !== doc.title;
    const contentChanged = dto.content !== undefined && dto.content !== doc.content;
    const shouldCreateVersion = titleChanged || contentChanged;

    const latestVersion = doc.versions[0]?.versionNumber || 1;
    const newVersion = shouldCreateVersion ? latestVersion + 1 : latestVersion;

    const updated = await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : doc.title,
        category: dto.category !== undefined ? dto.category : doc.category,
        content: dto.content !== undefined ? dto.content : doc.content,
        status: dto.status !== undefined ? dto.status : doc.status,
        tags: dto.tags !== undefined ? dto.tags : doc.tags,
        sourceUrl: dto.sourceUrl !== undefined ? (dto.sourceUrl || null) : doc.sourceUrl,
        ...(shouldCreateVersion
          ? {
              versions: {
                create: {
                  versionNumber: newVersion,
                  title: dto.title !== undefined ? dto.title.trim() : doc.title,
                  content: dto.content !== undefined ? dto.content : doc.content,
                  changeSummary: dto.changeNote || 'Document updated',
                  createdById: userId,
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'updated',
        resourceType: 'knowledge_document',
        resourceId: updated.id,
        details: { title: updated.title, version: newVersion },
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      title: updated.title,
      category: updated.category as KnowledgeCategory,
      contentSnippet: updated.content.slice(0, 180) + (updated.content.length > 180 ? '...' : ''),
      status: updated.status as KnowledgeStatus,
      tags: updated.tags,
      sourceUrl: updated.sourceUrl,
      authorId: updated.authorId,
      author: updated.author,
      currentVersion: newVersion,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteDocument(
    workspaceId: string,
    userId: string,
    documentId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.workspaceId !== workspaceId) {
      throw new NotFoundException('Document not found in this workspace');
    }

    await this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });

    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'deleted',
        resourceType: 'knowledge_document',
        resourceId: documentId,
        details: { title: doc.title },
      },
    });

    return { deleted: true };
  }
}
