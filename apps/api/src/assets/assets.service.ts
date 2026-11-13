import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { StorageService } from './storage.service';
import {
  CreateAssetFolderRequest,
  AssetFolderDto,
  CreateAssetMetadataRequest,
  AssetDto,
  PresignedUploadRequest,
  PresignedUploadResponseDto,
} from '@aeo-nexus/contracts';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
    private readonly storageService: StorageService,
  ) {}

  getStorageStatus() {
    return this.storageService.getStorageStatus();
  }

  async getFolders(workspaceId: string, userId: string): Promise<AssetFolderDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const folders = await this.prisma.assetFolder.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            children: true,
            assets: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return folders.map((f) => ({
      id: f.id,
      workspaceId: f.workspaceId,
      name: f.name,
      parentId: f.parentId,
      color: null,
      subfoldersCount: f._count.children,
      assetsCount: f._count.assets,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
  }

  async createFolder(
    workspaceId: string,
    userId: string,
    dto: CreateAssetFolderRequest,
  ): Promise<AssetFolderDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    if (dto.parentId) {
      const parent = await this.prisma.assetFolder.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.workspaceId !== workspaceId) {
        throw new BadRequestException('Parent folder not found in this workspace');
      }
    }

    const folder = await this.prisma.assetFolder.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        parentId: dto.parentId || null,
        createdById: userId,
      },
    });

    // Record activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'created',
        resourceType: 'folder',
        resourceId: folder.id,
        details: { name: folder.name },
      },
    });

    return {
      id: folder.id,
      workspaceId: folder.workspaceId,
      name: folder.name,
      parentId: folder.parentId,
      color: null,
      subfoldersCount: 0,
      assetsCount: 0,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  async deleteFolder(
    workspaceId: string,
    userId: string,
    folderId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const folder = await this.prisma.assetFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.workspaceId !== workspaceId) {
      throw new NotFoundException('Folder not found in this workspace');
    }

    await this.prisma.assetFolder.delete({
      where: { id: folderId },
    });

    return { deleted: true };
  }

  async requestPresignedUpload(
    workspaceId: string,
    userId: string,
    dto: PresignedUploadRequest,
  ): Promise<PresignedUploadResponseDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    if (dto.folderId) {
      const folder = await this.prisma.assetFolder.findUnique({
        where: { id: dto.folderId },
      });
      if (!folder || folder.workspaceId !== workspaceId) {
        throw new BadRequestException('Target folder not found in this workspace');
      }
    }

    return this.storageService.generatePresignedUpload(
      workspaceId,
      dto.filename,
      dto.contentType,
      dto.folderId,
    );
  }

  async createAsset(
    workspaceId: string,
    userId: string,
    dto: CreateAssetMetadataRequest,
  ): Promise<AssetDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    if (dto.folderId) {
      const folder = await this.prisma.assetFolder.findUnique({
        where: { id: dto.folderId },
      });
      if (!folder || folder.workspaceId !== workspaceId) {
        throw new BadRequestException('Folder not found in this workspace');
      }
    }

    const asset = await this.prisma.asset.create({
      data: {
        workspaceId,
        folderId: dto.folderId || null,
        name: dto.name.trim(),
        originalName: dto.name.trim(),
        storageKey: dto.storageKey,
        storageProvider: 's3',
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        uploadedById: userId,
        metadata: (dto.metadata as any) || undefined,
      },
      include: {
        folder: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Record activity
    await this.prisma.activityEvent.create({
      data: {
        workspaceId,
        userId,
        action: 'uploaded',
        resourceType: 'asset',
        resourceId: asset.id,
        details: { name: asset.name, sizeBytes: dto.sizeBytes },
      },
    });

    return {
      id: asset.id,
      workspaceId: asset.workspaceId,
      folderId: asset.folderId,
      folder: asset.folder,
      name: asset.name,
      storageKey: asset.storageKey,
      url: dto.url || this.storageService.getDownloadUrl(asset.storageKey),
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      uploadedById: asset.uploadedById,
      uploadedBy: asset.uploadedBy,
      metadata: (asset.metadata as Record<string, unknown>) || null,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  async getAssets(
    workspaceId: string,
    userId: string,
    params?: { folderId?: string; search?: string },
  ): Promise<AssetDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const where: any = { workspaceId };
    if (params?.folderId) {
      where.folderId = params.folderId;
    }
    if (params?.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      folderId: a.folderId,
      folder: a.folder,
      name: a.name,
      storageKey: a.storageKey,
      url: this.storageService.getDownloadUrl(a.storageKey),
      mimeType: a.mimeType,
      sizeBytes: Number(a.sizeBytes),
      uploadedById: a.uploadedById,
      uploadedBy: a.uploadedBy,
      metadata: (a.metadata as Record<string, unknown>) || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  async getAsset(workspaceId: string, userId: string, assetId: string): Promise<AssetDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        folder: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!asset || asset.workspaceId !== workspaceId) {
      throw new NotFoundException('Asset not found in this workspace');
    }

    return {
      id: asset.id,
      workspaceId: asset.workspaceId,
      folderId: asset.folderId,
      folder: asset.folder,
      name: asset.name,
      storageKey: asset.storageKey,
      url: this.storageService.getDownloadUrl(asset.storageKey),
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      uploadedById: asset.uploadedById,
      uploadedBy: asset.uploadedBy,
      metadata: (asset.metadata as Record<string, unknown>) || null,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  async deleteAsset(
    workspaceId: string,
    userId: string,
    assetId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.workspaceId !== workspaceId) {
      throw new NotFoundException('Asset not found in this workspace');
    }

    await this.prisma.asset.delete({
      where: { id: assetId },
    });

    return { deleted: true };
  }
}
