import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { CommonModule } from './common/common.module';
import { CompaniesModule } from './companies/companies.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { FraudModule } from './fraud/fraud.module';
import { HeatmapsModule } from './heatmaps/heatmaps.module';
import { AiInsightsModule } from './ai-insights/ai-insights.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProductsModule } from './products/products.module';
import { QrEngineModule } from './qr-engine/qr-engine.module';
import { RecallsModule } from './recalls/recalls.module';
import { ReportsModule } from './reports/reports.module';
import { RetailersModule } from './retailers/retailers.module';
import { SupplyChainModule } from './supply-chain/supply-chain.module';
import { UsersModule } from './users/users.module';
import { VerificationModule } from './verification/verification.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379'
      }
    }),
    CommonModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    ProductsModule,
    BatchesModule,
    QrEngineModule,
    VerificationModule,
    FraudModule,
    AnalyticsModule,
    ComplaintsModule,
    RecallsModule,
    ReportsModule,
    SupplyChainModule,
    HeatmapsModule,
    NotificationsModule,
    RetailersModule,
    AiInsightsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
