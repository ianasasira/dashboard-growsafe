import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('retailers')
export class RetailersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @Roles('company_admin', 'superadmin')
  async list(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(`SELECT * FROM supply_chain_partners WHERE partner_type = 'retailer' AND ($1::uuid IS NULL OR company_id = $1) ORDER BY created_at DESC`, [user.role === 'superadmin' ? null : user.companyId]);
    return { items: result.rows };
  }

  @Get('portal')
  @Roles('retailer')
  async portal(@CurrentUser() user: RequestUser) {
    const stats = await this.db.query(`SELECT count(DISTINCT pj.batch_id)::int AS batches_verified, coalesce(sum(pj.quantity),0)::int AS stock_received FROM product_journey pj WHERE pj.company_id = $1 AND pj.stage = 'retailer'`, [user.companyId]);
    return { retailer: user.email, stats: stats.rows[0] };
  }

  @Post('portal/verify-stock')
  @Roles('retailer')
  async verifyStock(@CurrentUser() user: RequestUser, @Body() body: { batchNumber: string; quantity: number }) {
    const batch = await this.db.query('SELECT * FROM batches WHERE batch_number = $1 AND company_id = $2', [body.batchNumber, user.companyId]);
    return { verified: Boolean(batch.rows[0]), batch: batch.rows[0] ?? null, quantity: body.quantity };
  }
}
