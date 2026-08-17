import { Module } from '@nestjs/common';

import { DataRoomsModule } from '../data-rooms/data-rooms.module';
import { NodesModule } from '../nodes/nodes.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [NodesModule, DataRoomsModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
