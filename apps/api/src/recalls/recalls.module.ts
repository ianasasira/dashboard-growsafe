import { Module } from '@nestjs/common';
import { RecallsController } from './recalls.controller';

@Module({ controllers: [RecallsController] })
export class RecallsModule {}
