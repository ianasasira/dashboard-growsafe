import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { TenantQueryService } from './database/tenant-query.service';

@Global()
@Module({
  providers: [DatabaseService, TenantQueryService],
  exports: [DatabaseService, TenantQueryService]
})
export class CommonModule {}
