import { Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(`SELECT * FROM notifications WHERE ($1::uuid IS NULL OR company_id = $1) AND (user_id IS NULL OR user_id = $2) ORDER BY created_at DESC LIMIT 100`, [user.role === 'superadmin' ? null : user.companyId, user.sub]);
    return { items: result.rows };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.db.query(`UPDATE notifications SET is_read = true WHERE ($1::uuid IS NULL OR company_id = $1) AND (user_id IS NULL OR user_id = $2)`, [user.role === 'superadmin' ? null : user.companyId, user.sub]);
    return { markedRead: true };
  }
}
