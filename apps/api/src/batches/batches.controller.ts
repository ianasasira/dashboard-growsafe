import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('batches')
export class BatchesController {
  constructor(
    private readonly db: DatabaseService,
    @InjectQueue('qr-generation') private readonly qrQueue: Queue
  ) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query('status') status?: string) {
    const params: unknown[] = user.role === 'superadmin' ? [] : [user.companyId];
    const tenant = user.role === 'superadmin' ? 'true' : `b.company_id = $1`;
    const statusSql = status ? ` AND b.status = $${params.length + 1}` : '';
    if (status) params.push(status);
    const result = await this.db.query(
      `SELECT b.*, p.name AS product_name, count(vc.id)::int AS total_codes
       FROM batches b
       JOIN products p ON p.id = b.product_id
       LEFT JOIN verification_codes vc ON vc.batch_id = b.id
       WHERE ${tenant}${statusSql}
       GROUP BY b.id, p.name
       ORDER BY b.created_at DESC
       LIMIT 50`,
      params
    );
    return { items: result.rows };
  }

  @Post()
  @Roles('company_admin', 'superadmin')
  async create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `INSERT INTO batches (company_id, product_id, batch_number, quantity, manufacture_date, expiry_date, manufacturing_plant)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        body.companyId ?? user.companyId,
        body.productId,
        body.batchNumber,
        body.quantity,
        body.manufactureDate,
        body.expiryDate,
        body.manufacturingPlant
      ]
    );
    return result.rows[0];
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT b.*, p.name AS product_name FROM batches b JOIN products p ON p.id = b.product_id
       WHERE b.id = $1 AND ($2::uuid IS NULL OR b.company_id = $2)`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return result.rows[0] ?? null;
  }

  @Post(':id/generate-codes')
  @Roles('company_admin', 'superadmin')
  async generateCodes(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const job = await this.qrQueue.add(
      'generate-codes',
      { batchId: id, companyId: user.role === 'superadmin' ? null : user.companyId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
    return { jobId: job.id, status: 'queued' };
  }

  @Get(':id/codes')
  async codes(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT code, status, scan_count, qr_image_url FROM verification_codes
       WHERE batch_id = $1 AND ($2::uuid IS NULL OR company_id = $2)
       ORDER BY id LIMIT 1000`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get(':id/codes/export')
  async exportCodes(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query('format') format = 'csv') {
    const result = await this.codes(user, id);
    return { format, generatedAt: new Date().toISOString(), rows: result.items };
  }

  @Post(':id/recall')
  @Roles('company_admin', 'superadmin')
  async recall(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const batch = await this.db.query(
      `UPDATE batches SET status = 'recalled', recall_reason = $3, recall_initiated_at = now()
       WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)
       RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId, body.reason]
    );
    await this.db.query(
      `INSERT INTO recall_notices (company_id, batch_id, title, reason, instructions, severity, affected_regions, initiated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        batch.rows[0].company_id,
        id,
        body.title ?? 'RECALL ACTIVE',
        body.reason,
        body.instructions ?? null,
        body.severity ?? 'high',
        body.affectedRegions ?? [],
        user.sub
      ]
    );
    return batch.rows[0];
  }

  @Get(':id/journey')
  async journey(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT pj.*, scp.name AS partner_name, scp.partner_type
       FROM product_journey pj
       LEFT JOIN supply_chain_partners scp ON scp.id = pj.partner_id
       WHERE pj.batch_id = $1 AND ($2::uuid IS NULL OR pj.company_id = $2)
       ORDER BY pj.event_at`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Post(':id/journey')
  @Roles('company_admin', 'retailer', 'superadmin')
  async createJourney(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `INSERT INTO product_journey (company_id, batch_id, partner_id, stage, quantity, notes, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [body.companyId ?? user.companyId, id, body.partnerId ?? null, body.stage, body.quantity, body.notes ?? null, body.latitude ?? null, body.longitude ?? null]
    );
    return result.rows[0];
  }
}
