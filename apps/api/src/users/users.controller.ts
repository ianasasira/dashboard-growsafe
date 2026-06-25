import bcrypt from 'bcrypt';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('users')
export class UsersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @Roles('company_admin', 'superadmin')
  async list(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT id, company_id, first_name, last_name, email, role, is_active, last_login_at, created_at
       FROM users WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR company_id = $1)
       ORDER BY created_at DESC`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Post()
  @Roles('company_admin', 'superadmin')
  async create(@CurrentUser() user: RequestUser, @Body() body: Record<string, string>) {
    const result = await this.db.query(
      `INSERT INTO users (company_id, first_name, last_name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, company_id, first_name, last_name, email, role, is_active`,
      [body.companyId ?? user.companyId, body.firstName, body.lastName, body.email, await bcrypt.hash(body.password, 12), body.role]
    );
    return result.rows[0];
  }
}
