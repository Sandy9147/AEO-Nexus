import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { AppCatalogItemDto } from '@aeo-nexus/contracts';

@Controller('apps/catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list(
    @Query('category') category?: string,
    @Query('q') query?: string,
  ): { success: boolean; data: AppCatalogItemDto[]; timestamp: string } {
    const data = this.catalogService.list(category, query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':slug')
  getBySlug(
    @Param('slug') slug: string,
  ): { success: boolean; data: AppCatalogItemDto; timestamp: string } {
    const data = this.catalogService.getBySlug(slug);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}

