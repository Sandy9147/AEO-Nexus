import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { EmailModule } from './email/email.module';
import { BusinessModule } from './business/business.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    EmailModule,
    BusinessModule,
    CatalogModule,
  ],
})
export class AppModule {}
