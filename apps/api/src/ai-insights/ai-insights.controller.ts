import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('ai-insights')
export class AiInsightsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async generated(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      "SELECT * FROM ai_insights WHERE ($1::uuid IS NULL OR company_id = $1) ORDER BY generated_at DESC LIMIT 20",
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Post('query')
  async query(@CurrentUser() user: RequestUser, @Body() body: { query: string }) {
    const companyId = user.role === 'superadmin' ? null : user.companyId;
    const text = body.query.toLowerCase();
    if (text.includes('district') && text.includes('counterfeit')) {
      const result = await this.db.query(
        "SELECT district, count(*)::int AS alerts FROM scan_events WHERE result IN ('suspicious','invalid') AND ($1::uuid IS NULL OR company_id = $1) GROUP BY district ORDER BY alerts DESC LIMIT 5",
        [companyId]
      );
      return { insight: (result.rows[0]?.district ?? 'No district') + ' has the highest counterfeit signal.', chartData: result.rows };
    }
    if (text.includes('top') && text.includes('product')) {
      const result = await this.db.query(
        "SELECT p.name, count(se.id)::int AS scans FROM products p LEFT JOIN batches b ON b.product_id = p.id LEFT JOIN verification_codes vc ON vc.batch_id = b.id LEFT JOIN scan_events se ON se.verification_code_id = vc.id WHERE ($1::uuid IS NULL OR p.company_id = $1) GROUP BY p.name ORDER BY scans DESC LIMIT 5",
        [companyId]
      );
      return { insight: (result.rows[0]?.name ?? 'No product') + ' is the top product by verification volume.', chartData: result.rows };
    }
    const result = await this.db.query(
      "SELECT alert_type, count(*)::int AS alerts FROM fraud_alerts WHERE ($1::uuid IS NULL OR company_id = $1) GROUP BY alert_type ORDER BY alerts DESC",
      [companyId]
    );
    return { insight: 'Fraud activity is summarized by alert type for the selected tenant.', chartData: result.rows };
  }
}
