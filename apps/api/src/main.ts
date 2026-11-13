import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AeoNexusApi');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4000;
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  });

  await app.listen(port);
  logger.log(`🚀 AEO Nexus API server running on: http://localhost:${port}`);
  logger.log(`🩺 Health check available at: http://localhost:${port}/health`);
}

bootstrap();
