import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from '@prisma/config';

const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
  migrations: {
    seed: 'pnpm --filter @data-room/api run seed',
  },
});
