import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client/client';

export * from '../generated/client/client';

export class PrismaDatabase extends PrismaClient {
  constructor(connectionString: string, options?: { log?: boolean }) {
    super({
      adapter: new PrismaPg({ connectionString }),
      log: options?.log ? ['warn', 'error'] : ['error'],
    });
  }
}
