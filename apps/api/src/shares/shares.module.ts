import { Module } from '@nestjs/common';

import { DataRoomsModule } from '../data-rooms/data-rooms.module';
import { FilesModule } from '../files/files.module';
import { NodesModule } from '../nodes/nodes.module';
import { PublicSharesController } from './public-shares.controller';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [DataRoomsModule, NodesModule, FilesModule],
  controllers: [SharesController, PublicSharesController],
  providers: [SharesService],
})
export class SharesModule {}
