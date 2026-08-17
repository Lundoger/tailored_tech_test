import { Module } from '@nestjs/common';

import { DataRoomsModule } from '../data-rooms/data-rooms.module';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';

@Module({
  imports: [DataRoomsModule],
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
