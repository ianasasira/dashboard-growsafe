import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('partners')
export class SupplyChainController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT * FROM supply_chain_partners WHERE ($1::uuid IS NULL OR company_id = $1) ORDER BY created_at DESC`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Post()
  @Roles('company_admin', 'superadmin')
  async create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `INSERT INTO supply_chain_partners
       (company_id, name, partner_type, location, district, region, latitude, longitude, contact_name, contact_phone, contact_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [body.companyId ?? user.companyId, body.name, body.partnerType, body.location, body.district, body.region, body.latitude, body.longitude, body.contactName, body.contactPhone, body.contactEmail]
    );
    return result.rows[0];
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT * FROM supply_chain_partners WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return result.rows[0] ?? null;
  }

  @Put(':id')
  @Roles('company_admin', 'superadmin')
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `UPDATE supply_chain_partners SET name = COALESCE($3, name), partner_type = COALESCE($4, partner_type),
       location = COALESCE($5, location), district = COALESCE($6, district), region = COALESCE($7, region),
       is_active = COALESCE($8, is_active)
       WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2) RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId, body.name, body.partnerType, body.location, body.district, body.region, body.isActive]
    );
    return result.rows[0];
  }
}
