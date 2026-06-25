import { Module } from '@nestjs/common';
import { HeatmapsController } from './heatmaps.controller';

@Module({ controllers: [HeatmapsController] })
export class HeatmapsModule {}
