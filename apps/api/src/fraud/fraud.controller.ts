import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('fraud')
export class FraudController {
  constructor(private readonly db: DatabaseService) {}

  @Get('alerts')
  async alerts(@CurrentUser() user: RequestUser, @Query('riskLevel') riskLevel?: string) {
    const params: unknown[] = [user.role === 'superadmin' ? null : user.companyId];
    const risk = riskLevel ? ` AND risk_level = $${params.push(riskLevel)}` : '';
    const result = await this.db.query(
      `SELECT * FROM fraud_alerts WHERE ($1::uuid IS NULL OR company_id = $1)${risk} ORDER BY created_at DESC LIMIT 100`,
      params
    );
    return { items: result.rows };
  }

  @Get('alerts/:id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT * FROM fraud_alerts WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return result.rows[0] ?? null;
  }

  @Patch('alerts/:id/status')
  @Roles('company_admin', 'superadmin')
  async status(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { status: string }) {
    const result = await this.db.query(
      `UPDATE fraud_alerts SET status = $3, resolved_at = CASE WHEN $3 = 'resolved' THEN now() ELSE resolved_at END,
       resolved_by = CASE WHEN $3 = 'resolved' THEN $4 ELSE resolved_by END
       WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2) RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId, body.status, user.sub]
    );
    return result.rows[0];
  }

  @Get('stats')
  async stats(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT risk_level, status, count(*)::int AS count FROM fraud_alerts
       WHERE ($1::uuid IS NULL OR company_id = $1)
       GROUP BY risk_level, status`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }
}
