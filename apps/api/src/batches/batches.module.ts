import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'qr-generation' })],
  controllers: [BatchesController]
})
export class BatchesModule {}
