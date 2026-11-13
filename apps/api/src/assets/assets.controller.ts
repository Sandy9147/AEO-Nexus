import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import {
  CreateAssetFolderRequest,
  CreateAssetMetadataRequest,
  PresignedUploadRequest,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId/assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('storage-status')
  async getStorageStatus() {
    return {
      success: true,
      data: this.assetsService.getStorageStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('folders')
  async getFolders(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const folders = await this.assetsService.getFolders(workspaceId, req.user.id);
    return {
      success: true,
      data: folders,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('folders')
  async createFolder(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateAssetFolderRequest,
  ) {
    const folder = await this.assetsService.createFolder(workspaceId, req.user.id, body);
    return {
      success: true,
      data: folder,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('folders/:folderId')
  async deleteFolder(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
  ) {
    const result = await this.assetsService.deleteFolder(workspaceId, req.user.id, folderId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('upload-url')
  async requestUploadUrl(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: PresignedUploadRequest,
  ) {
    const result = await this.assetsService.requestPresignedUpload(workspaceId, req.user.id, body);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async getAssets(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
  ) {
    const assets = await this.assetsService.getAssets(workspaceId, req.user.id, {
      folderId,
      search,
    });
    return {
      success: true,
      data: assets,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  async createAsset(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateAssetMetadataRequest,
  ) {
    const asset = await this.assetsService.createAsset(workspaceId, req.user.id, body);
    return {
      success: true,
      data: asset,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':assetId')
  async getAsset(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('assetId') assetId: string,
  ) {
    const asset = await this.assetsService.getAsset(workspaceId, req.user.id, assetId);
    return {
      success: true,
      data: asset,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':assetId')
  async deleteAsset(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('assetId') assetId: string,
  ) {
    const result = await this.assetsService.deleteAsset(workspaceId, req.user.id, assetId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
