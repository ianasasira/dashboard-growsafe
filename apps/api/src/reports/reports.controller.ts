import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':report')
  async report(@CurrentUser() user: RequestUser, @Param('report') report: string, @Query('format') format = 'json') {
    const companyId = user.role === 'superadmin' ? null : user.companyId;
    const queries: Record<string, string> = {
      'verification-summary': `SELECT result, channel, count(*)::int AS total FROM scan_events WHERE ($1::uuid IS NULL OR company_id = $1) GROUP BY result, channel`,
      'fraud-activity': `SELECT alert_type, risk_level, status, count(*)::int AS total FROM fraud_alerts WHERE ($1::uuid IS NULL OR company_id = $1) GROUP BY alert_type, risk_level, status`,
      'product-performance': `SELECT p.name, count(se.id)::int AS scans FROM products p LEFT JOIN batches b ON b.product_id = p.id LEFT JOIN verification_codes vc ON vc.batch_id = b.id LEFT JOIN scan_events se ON se.verification_code_id = vc.id WHERE ($1::uuid IS NULL OR p.company_id = $1) GROUP BY p.name ORDER BY scans DESC`,
      'regional-demand': `SELECT region, district, count(*)::int AS scans FROM scan_events WHERE ($1::uuid IS NULL OR company_id = $1) GROUP BY region, district ORDER BY scans DESC`
    };
    const sql = queries[report];
    const result = await this.db.query(sql ?? queries['verification-summary'], [companyId]);
    return { report, format, generatedAt: new Date().toISOString(), rows: result.rows };
  }
}
