import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('recalls')
export class RecallsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT rn.*, b.batch_number, p.name AS product_name,
       count(se.id) FILTER (WHERE se.scanned_at >= rn.created_at)::int AS scans_since_recall
       FROM recall_notices rn
       JOIN batches b ON b.id = rn.batch_id
       JOIN products p ON p.id = b.product_id
       LEFT JOIN verification_codes vc ON vc.batch_id = b.id
       LEFT JOIN scan_events se ON se.verification_code_id = vc.id
       WHERE ($1::uuid IS NULL OR rn.company_id = $1)
       GROUP BY rn.id, b.batch_number, p.name ORDER BY rn.created_at DESC`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Post()
  @Roles('company_admin', 'superadmin')
  async create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    const batch = await this.db.query('SELECT company_id FROM batches WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)', [
      body.batchId,
      user.role === 'superadmin' ? null : user.companyId
    ]);
    const companyId = batch.rows[0].company_id;
    await this.db.query(`UPDATE batches SET status = 'recalled', recall_reason = $2, recall_initiated_at = now() WHERE id = $1`, [
      body.batchId,
      body.reason
    ]);
    const result = await this.db.query(
      `INSERT INTO recall_notices (company_id, batch_id, title, reason, instructions, severity, affected_regions, initiated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [companyId, body.batchId, body.title ?? 'RECALL ACTIVE', body.reason, body.instructions, body.severity ?? 'high', body.affectedRegions ?? [], user.sub]
    );
    return result.rows[0];
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT * FROM recall_notices WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return result.rows[0] ?? null;
  }

  @Patch(':id/deactivate')
  @Roles('company_admin', 'superadmin')
  async deactivate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `UPDATE recall_notices SET is_active = false WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2) RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return result.rows[0];
  }
}
