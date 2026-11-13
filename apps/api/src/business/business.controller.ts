import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import {
  SaveBusinessProfileRequest,
  SaveBrandProfileRequest,
  SaveOnboardingStepRequest,
  UpdateWorkspacePreferenceRequest,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // ============================================================================
  // Business Profile
  // ============================================================================

  @Get('business-profile')
  async getBusinessProfile(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const data = await this.businessService.getBusinessProfile(workspaceId, req.user.id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('business-profile')
  async saveBusinessProfile(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: SaveBusinessProfileRequest,
  ) {
    const data = await this.businessService.saveBusinessProfile(workspaceId, req.user.id, body);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Brand Profile
  // ============================================================================

  @Get('brand-profile')
  async getBrandProfile(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const data = await this.businessService.getBrandProfile(workspaceId, req.user.id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('brand-profile')
  async saveBrandProfile(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: SaveBrandProfileRequest,
  ) {
    const data = await this.businessService.saveBrandProfile(workspaceId, req.user.id, body);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Onboarding Progress
  // ============================================================================

  @Get('onboarding')
  async getOnboardingProgress(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const data = await this.businessService.getOnboardingProgress(workspaceId, req.user.id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('onboarding/step')
  async saveOnboardingStep(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: SaveOnboardingStepRequest,
  ) {
    const data = await this.businessService.saveOnboardingStep(workspaceId, req.user.id, body);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('onboarding/complete')
  async completeOnboarding(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const data = await this.businessService.completeOnboarding(workspaceId, req.user.id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Workspace Preferences
  // ============================================================================

  @Get('preferences')
  async getPreferences(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const data = await this.businessService.getPreferences(workspaceId, req.user.id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('preferences')
  async updatePreferences(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: UpdateWorkspacePreferenceRequest,
  ) {
    const data = await this.businessService.updatePreferences(workspaceId, req.user.id, body);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Dashboard Summary
  // ============================================================================

  @Get('dashboard-summary')
  async getDashboardSummary(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    const data = await this.businessService.getDashboardSummary(workspaceId, req.user.id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}

