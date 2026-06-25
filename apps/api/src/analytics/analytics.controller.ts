import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly db: DatabaseService) {}

  @Get('overview')
  async overview(@CurrentUser() user: RequestUser) {
    const companyId = user.role === 'superadmin' ? null : user.companyId;
    const [products, batches, codes, scans, alerts, verifiedToday, recalls, recentScans, recentAlerts] = await Promise.all([
      this.count('products', companyId, 'deleted_at IS NULL'),
      this.count('batches', companyId),
      this.count('verification_codes', companyId),
      this.count('scan_events', companyId),
      this.count('fraud_alerts', companyId, "status <> 'resolved'"),
      this.count('scan_events', companyId, "result = 'genuine' AND scanned_at >= current_date"),
      this.count('recall_notices', companyId, 'is_active = true'),
      this.db.query('SELECT * FROM scan_events WHERE ($1::uuid IS NULL OR company_id = $1) ORDER BY scanned_at DESC LIMIT 10', [companyId]),
      this.db.query('SELECT * FROM fraud_alerts WHERE ($1::uuid IS NULL OR company_id = $1) ORDER BY created_at DESC LIMIT 10', [companyId])
    ]);
    return {
      kpis: {
        totalProducts: products,
        activeBatches: batches,
        generatedCodes: codes,
        totalScans: scans,
        counterfeitAlerts: alerts,
        verifiedToday,
        recallNotices: recalls
      },
      recentScans: recentScans.rows,
      recentAlerts: recentAlerts.rows
    };
  }

  @Get('scans')
  async scans(@CurrentUser() user: RequestUser, @Query('period') period = 'daily') {
    const bucket = period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : 'day';
    const result = await this.db.query(
      `SELECT date_trunc('${bucket}', scanned_at) AS period, count(*)::int AS scans
       FROM scan_events WHERE ($1::uuid IS NULL OR company_id = $1)
       GROUP BY 1 ORDER BY 1`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get('products')
  async products(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT p.name, count(se.id)::int AS scans,
       round(100.0 * count(*) FILTER (WHERE se.result = 'genuine') / NULLIF(count(se.id), 0), 2) AS genuine_rate
       FROM products p
       LEFT JOIN batches b ON b.product_id = p.id
       LEFT JOIN verification_codes vc ON vc.batch_id = b.id
       LEFT JOIN scan_events se ON se.verification_code_id = vc.id
       WHERE ($1::uuid IS NULL OR p.company_id = $1)
       GROUP BY p.id ORDER BY scans DESC LIMIT 20`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get('regions')
  async regions(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT region, district, count(*)::int AS scans FROM scan_events
       WHERE ($1::uuid IS NULL OR company_id = $1)
       GROUP BY region, district ORDER BY scans DESC`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get('channels')
  async channels(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT channel, count(*)::int AS scans FROM scan_events
       WHERE ($1::uuid IS NULL OR company_id = $1)
       GROUP BY channel ORDER BY scans DESC`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get('heatmap')
  async heatmap(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT latitude, longitude, result, district, region, count(*)::int AS intensity
       FROM scan_events
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND ($1::uuid IS NULL OR company_id = $1)
       GROUP BY latitude, longitude, result, district, region LIMIT 5000`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { points: result.rows };
  }

  private async count(table: string, companyId: string | null, extra = 'true') {
    const result = await this.db.query(
      `SELECT count(*)::int AS count FROM ${table} WHERE ($1::uuid IS NULL OR company_id = $1) AND ${extra}`,
      [companyId]
    );
    return result.rows[0].count;
  }
}
