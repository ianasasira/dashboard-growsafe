import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { RequestUser } from '../types';

@Injectable()
export class TenantQueryService {
  constructor(private readonly db: DatabaseService) {}

  companyId(user: RequestUser) {
    if (user.role === 'superadmin') return user.companyId ?? null;
    if (!user.companyId) throw new ForbiddenException('Tenant context is required');
    return user.companyId;
  }

  async list(user: RequestUser, table: string, extraWhere = 'deleted_at IS NULL', params: unknown[] = []) {
    if (user.role === 'superadmin') {
      return this.db.query(`SELECT * FROM ${table} WHERE ${extraWhere} ORDER BY created_at DESC`, params);
    }
    return this.db.query(
      `SELECT * FROM ${table} WHERE company_id = $1 AND ${extraWhere} ORDER BY created_at DESC`,
      [user.companyId, ...params]
    );
  }
}
