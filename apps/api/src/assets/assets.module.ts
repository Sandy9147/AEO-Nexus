import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { StorageService } from './storage.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [AssetsController],
  providers: [AssetsService, StorageService],
  exports: [AssetsService, StorageService],
})
export class AssetsModule {}
