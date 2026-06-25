import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Post()
  async create(@Body() body: Record<string, unknown>) {
    const company = body.companyId
      ? { rows: [{ id: body.companyId }] }
      : await this.db.query('SELECT company_id AS id FROM verification_codes WHERE code = $1', [body.code]);
    const result = await this.db.query(
      `INSERT INTO product_reports
       (company_id, product_id, batch_id, code, issue_type, description, image_urls, latitude, longitude, district, region, retailer_name, reporter_phone, reporter_name, severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [company.rows[0]?.id ?? null, body.productId ?? null, body.batchId ?? null, body.code ?? null, body.issueType, body.description, body.imageUrls ?? [], body.latitude ?? null, body.longitude ?? null, body.district ?? null, body.region ?? null, body.retailerName ?? null, body.reporterPhone ?? null, body.reporterName ?? null, body.severity ?? 'medium']
    );
    return result.rows[0];
  }

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT pr.*, p.name AS product_name FROM product_reports pr
       LEFT JOIN products p ON p.id = pr.product_id
       WHERE ($1::uuid IS NULL OR pr.company_id = $1)
       ORDER BY pr.created_at DESC LIMIT 100`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT * FROM product_reports WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return result.rows[0] ?? null;
  }

  @Patch(':id')
  @Roles('company_admin', 'company_staff', 'superadmin')
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `UPDATE product_reports SET status = COALESCE($3, status), severity = COALESCE($4, severity),
       resolution_notes = COALESCE($5, resolution_notes), resolved_at = CASE WHEN $3 IN ('resolved','closed') THEN now() ELSE resolved_at END
       WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2) RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId, body.status, body.severity, body.resolutionNotes]
    );
    return result.rows[0];
  }

  @Post(':id/assign')
  @Roles('company_admin', 'superadmin')
  async assign(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { userId: string }) {
    const result = await this.db.query(
      `UPDATE product_reports SET assigned_to = $3, status = 'under_review'
       WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2) RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId, body.userId]
    );
    return result.rows[0];
  }
}
