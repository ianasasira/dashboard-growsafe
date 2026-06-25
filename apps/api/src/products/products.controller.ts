import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('products')
export class ProductsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
    const where = user.role === 'superadmin' ? 'p.deleted_at IS NULL' : 'p.company_id = $1 AND p.deleted_at IS NULL';
    const params: unknown[] = user.role === 'superadmin' ? [] : [user.companyId];
    const searchSql = search ? ` AND (p.name ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 1})` : '';
    if (search) params.push(`%${search}%`);
    const result = await this.db.query(
      `SELECT p.*, c.name AS category,
       COUNT(DISTINCT b.id)::int AS active_batches,
       COUNT(vc.id)::int AS total_codes
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN batches b ON b.product_id = p.id AND b.status = 'active'
       LEFT JOIN verification_codes vc ON vc.batch_id = b.id
       WHERE ${where}${searchSql}
       GROUP BY p.id, c.name
       ORDER BY p.created_at DESC
       LIMIT 25`,
      params
    );
    return { items: result.rows };
  }

  @Post()
  @Roles('company_admin', 'company_staff', 'superadmin')
  async create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `INSERT INTO products
       (company_id, category_id, sku, name, description, active_ingredients, formulation, packaging_size, usage_information, safety_information, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        body.companyId ?? user.companyId,
        body.categoryId ?? null,
        body.sku,
        body.name,
        body.description ?? null,
        body.activeIngredients ?? null,
        body.formulation ?? null,
        body.packagingSize ?? null,
        body.usageInformation ?? null,
        body.safetyInformation ?? null,
        body.imageUrl ?? null
      ]
    );
    return result.rows[0];
  }

  @Get('categories')
  async categories(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      user.role === 'superadmin'
        ? 'SELECT * FROM product_categories ORDER BY name'
        : 'SELECT * FROM product_categories WHERE company_id = $1 ORDER BY name',
      user.role === 'superadmin' ? [] : [user.companyId]
    );
    return { items: result.rows };
  }

  @Post('categories')
  @Roles('company_admin', 'company_staff', 'superadmin')
  async createCategory(@CurrentUser() user: RequestUser, @Body() body: { name: string; description?: string; companyId?: string }) {
    const result = await this.db.query(
      `INSERT INTO product_categories (company_id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, name) DO UPDATE SET description = EXCLUDED.description
       RETURNING *`,
      [body.companyId ?? user.companyId, body.name, body.description ?? null]
    );
    return result.rows[0];
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const params = user.role === 'superadmin' ? [id] : [id, user.companyId];
    const result = await this.db.query(
      `SELECT p.*, c.name AS category FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.id = $1 ${user.role === 'superadmin' ? '' : 'AND p.company_id = $2'} AND p.deleted_at IS NULL`,
      params
    );
    return result.rows[0] ?? null;
  }

  @Put(':id')
  @Roles('company_admin', 'company_staff', 'superadmin')
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.db.query(
      `UPDATE products SET
       name = COALESCE($3, name), description = COALESCE($4, description),
       active_ingredients = COALESCE($5, active_ingredients), formulation = COALESCE($6, formulation),
       packaging_size = COALESCE($7, packaging_size), usage_information = COALESCE($8, usage_information),
       safety_information = COALESCE($9, safety_information), image_url = COALESCE($10, image_url)
       WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)
       RETURNING *`,
      [id, user.role === 'superadmin' ? null : user.companyId, body.name, body.description, body.activeIngredients, body.formulation, body.packagingSize, body.usageInformation, body.safetyInformation, body.imageUrl]
    );
    return result.rows[0];
  }

  @Delete(':id')
  @Roles('company_admin', 'superadmin')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.db.query('UPDATE products SET deleted_at = now() WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)', [
      id,
      user.role === 'superadmin' ? null : user.companyId
    ]);
    return { deleted: true };
  }

  @Get(':id/stats')
  async stats(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.db.query(
      `SELECT date_trunc('day', se.scanned_at) AS day, count(*)::int AS scans
       FROM scan_events se
       JOIN verification_codes vc ON vc.id = se.verification_code_id
       JOIN batches b ON b.id = vc.batch_id
       WHERE b.product_id = $1 AND ($2::uuid IS NULL OR se.company_id = $2)
       GROUP BY 1 ORDER BY 1`,
      [id, user.role === 'superadmin' ? null : user.companyId]
    );
    return { scans: result.rows };
  }
}
