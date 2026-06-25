import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QrGenerationProcessor } from './qr-generation.processor';
import { QrEngineService } from './qr-engine.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'qr-generation' })],
  providers: [QrEngineService, QrGenerationProcessor],
  exports: [QrEngineService]
})
export class QrEngineModule {}
