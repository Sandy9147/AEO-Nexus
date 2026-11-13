import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiConfigSchema, validateConfig } from '@aeo-nexus/config';

async function bootstrap() {
  const logger = new Logger('AeoNexusApi');

  // Strict pre-flight environment configuration validation
  let config;
  try {
    config = validateConfig(ApiConfigSchema, process.env);
  } catch (error) {
    logger.error('CRITICAL: Server startup aborted due to configuration errors.');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  const corsOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  });

  await app.listen(config.PORT);
  logger.log(`🚀 AEO Nexus API server running on: http://localhost:${config.PORT}`);
  logger.log(`🩺 Health check available at: http://localhost:${config.PORT}/health`);
}

bootstrap();
