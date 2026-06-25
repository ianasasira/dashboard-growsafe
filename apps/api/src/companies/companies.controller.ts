import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';

@Controller('companies')
@Roles('superadmin')
export class CompaniesController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list() {
    const result = await this.db.query('SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY created_at DESC');
    return { items: result.rows };
  }

  @Post()
  async create(@Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `INSERT INTO companies (name, slug, country, address, contact_email, contact_phone, subscription_plan)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [body.name, body.slug, body.country ?? 'Uganda', body.address ?? null, body.contactEmail ?? null, body.contactPhone ?? null, body.subscriptionPlan ?? 'starter']
    );
    return result.rows[0];
  }
}
