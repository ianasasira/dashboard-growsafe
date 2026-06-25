import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller('heatmaps')
export class HeatmapsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async layers(@CurrentUser() user: RequestUser) {
    const companyId = user.role === 'superadmin' ? null : user.companyId;
    const [density, hotspots, coverage] = await Promise.all([
      this.db.query(`SELECT latitude, longitude, count(*)::int AS intensity FROM scan_events WHERE latitude IS NOT NULL AND ($1::uuid IS NULL OR company_id = $1) GROUP BY latitude, longitude LIMIT 5000`, [companyId]),
      this.db.query(`SELECT latitude, longitude, count(*)::int AS intensity FROM scan_events WHERE result IN ('suspicious','invalid') AND latitude IS NOT NULL AND ($1::uuid IS NULL OR company_id = $1) GROUP BY latitude, longitude LIMIT 5000`, [companyId]),
      this.db.query(`SELECT latitude, longitude, partner_type, name FROM supply_chain_partners WHERE latitude IS NOT NULL AND ($1::uuid IS NULL OR company_id = $1)`, [companyId])
    ]);
    return { verificationDensity: density.rows, counterfeitHotspots: hotspots.rows, distributionCoverage: coverage.rows };
  }
}
