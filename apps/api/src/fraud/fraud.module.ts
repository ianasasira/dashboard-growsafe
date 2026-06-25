import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FraudController } from './fraud.controller';
import { FraudDetectionProcessor } from './fraud-detection.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'fraud-detection' })],
  controllers: [FraudController],
  providers: [FraudDetectionProcessor]
})
export class FraudModule {}
