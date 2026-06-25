import { Module } from '@nestjs/common';
import { AiInsightsController } from './ai-insights.controller';

@Module({ controllers: [AiInsightsController] })
export class AiInsightsModule {}
