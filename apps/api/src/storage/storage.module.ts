import { Global, Module } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { LocalStorageController } from './local-storage.controller';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Global()
@Module({
  controllers: [LocalStorageController],
  providers: [
    LocalStorageService,
    {
      provide: StorageService,
      inject: [AppConfigService, LocalStorageService],
      useFactory: (config: AppConfigService, local: LocalStorageService): StorageService =>
        config.env.storageDriver === 'supabase' ? new SupabaseStorageService(config) : local,
    },
  ],
  exports: [StorageService, LocalStorageService],
})
export class StorageModule {}
