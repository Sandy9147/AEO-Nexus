import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const httpStatus = health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(httpStatus).json({
      success: health.status === 'ok',
      data: health,
      timestamp: health.timestamp,
    });
  }

  @Get('live')
  async getLiveness() {
    return this.healthService.isLivenessOk();
  }

  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const isReady = health.status === 'ok';
    return res.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: isReady ? 'ready' : 'not_ready',
      dependencies: health.dependencies,
      timestamp: health.timestamp,
    });
  }
}
