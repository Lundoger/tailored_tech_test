import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AppConfigModule } from './config/config.module';
import { DataRoomsModule } from './data-rooms/data-rooms.module';
import { FilesModule } from './files/files.module';
import { HealthController } from './health/health.controller';
import { NodesModule } from './nodes/nodes.module';
import { PrismaModule } from './prisma/prisma.module';
import { SharesModule } from './shares/shares.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    StorageModule,
    // A generous ceiling for ordinary browsing, plus a tight named limit the auth
    // routes opt into. Keyed on the client address, which `trust proxy` makes the
    // visitor's rather than the platform edge's.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', limit: 300, ttl: 60_000 }],
    }),
    AuthModule,
    DataRoomsModule,
    NodesModule,
    FilesModule,
    SharesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
