import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiConfigSchema, validateConfig } from '@aeo-nexus/config';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Ensure .env is loaded in development environments
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), 'apps/api/.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));
loadEnvFile(path.resolve(__dirname, '../../.env'));
loadEnvFile(path.resolve(__dirname, '../../../.env'));

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

  // Platform Hardening: Strict OWASP Security Headers Middleware
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; frame-ancestors 'none'; connect-src 'self' https:;",
    );
    next();
  });

  // Body payload limits to prevent buffer exhaustion / DoS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const corsOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-workspace-id',
      'x-idempotency-key',
      'x-request-id',
    ],
  });

  await app.listen(config.PORT);
  logger.log(`🚀 AEO Nexus API server running on: http://localhost:${config.PORT}`);
  logger.log(`🩺 Health check available at: http://localhost:${config.PORT}/health`);
}

bootstrap();
