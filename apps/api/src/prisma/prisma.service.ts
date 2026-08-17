import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaDatabase } from '@data-room/db';

import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PrismaService extends PrismaDatabase implements OnModuleInit, OnModuleDestroy {
  constructor(config: AppConfigService) {
    super(config.env.DATABASE_URL, { log: config.isDevelopment });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
