import { Module } from '@nestjs/common';
import { SupplyChainController } from './supply-chain.controller';

@Module({ controllers: [SupplyChainController] })
export class SupplyChainModule {}
