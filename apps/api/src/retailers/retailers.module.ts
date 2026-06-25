import { Module } from '@nestjs/common';
import { RetailersController } from './retailers.controller';

@Module({ controllers: [RetailersController] })
export class RetailersModule {}
