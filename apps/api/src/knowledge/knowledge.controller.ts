import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import {
  CreateKnowledgeDocumentRequest,
  UpdateKnowledgeDocumentRequest,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  async listDocuments(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const docs = await this.knowledgeService.listDocuments(workspaceId, req.user.id, {
      category,
      status,
      search,
    });
    return {
      success: true,
      data: docs,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  async createDocument(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateKnowledgeDocumentRequest,
  ) {
    const doc = await this.knowledgeService.createDocument(workspaceId, req.user.id, body);
    return {
      success: true,
      data: doc,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':documentId')
  async getDocument(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
  ) {
    const doc = await this.knowledgeService.getDocument(workspaceId, req.user.id, documentId);
    return {
      success: true,
      data: doc,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':documentId')
  async updateDocument(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Body() body: UpdateKnowledgeDocumentRequest,
  ) {
    const updated = await this.knowledgeService.updateDocument(
      workspaceId,
      req.user.id,
      documentId,
      body,
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':documentId')
  async deleteDocument(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
  ) {
    const result = await this.knowledgeService.deleteDocument(
      workspaceId,
      req.user.id,
      documentId,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
