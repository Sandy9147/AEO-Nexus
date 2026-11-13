import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.$on('error', (event: Prisma.LogEvent) => {
      this.logger.error(`Prisma Engine Error: ${event.message}`);
    });

    this.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn(`Prisma Engine Warning: ${event.message}`);
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  /**
   * Connect to Neon PostgreSQL with retry handling.
   * Neon serverless compute instances may require 1-3 seconds to resume from idle/suspend.
   */
  async connectWithRetry(maxRetries = 3, retryDelayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.isConnected = true;
        this.logger.log('Connected to Neon PostgreSQL database via Prisma (Pooled connection)');
        return;
      } catch (error) {
        this.isConnected = false;
        const errMsg = error instanceof Error ? error.message : String(error);
        if (attempt < maxRetries) {
          this.logger.warn(
            `Neon database connection attempt ${attempt}/${maxRetries} failed: ${errMsg}. Retrying in ${retryDelayMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        } else {
          this.logger.error(
            `Unable to connect to Neon PostgreSQL after ${maxRetries} attempts: ${errMsg}. Queries will attempt to connect on-demand.`,
          );
        }
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Disconnected gracefully from Neon PostgreSQL');
    } catch (error) {
      this.logger.error(
        `Error during Prisma disconnect: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  get connectionStatus(): boolean {
    return this.isConnected;
  }
}
