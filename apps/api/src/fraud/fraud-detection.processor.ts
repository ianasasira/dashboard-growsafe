import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DatabaseService } from '../common/database/database.service';
import { haversineKm } from '../common/utils/geo';

@Processor('fraud-detection')
export class FraudDetectionProcessor extends WorkerHost {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async process(_job: Job) {
    await this.detectHighFrequency();
    await this.detectInvalidSpike();
    await this.detectCodeCloning();
    return { evaluatedAt: new Date().toISOString() };
  }

  private async detectHighFrequency() {
    const result = await this.db.query(
      `SELECT company_id, code, array_agg(id) AS event_ids, count(*)::int AS scans
       FROM scan_events WHERE scanned_at >= now() - interval '24 hours'
       GROUP BY company_id, code HAVING count(*) > 20`
    );
    for (const row of result.rows) {
      await this.createAlert(row.company_id, row.code, 'high_frequency', 'medium', `Code ${row.code} scanned ${row.scans} times in 24 hours.`, row.event_ids);
    }
  }

  private async detectInvalidSpike() {
    const result = await this.db.query(
      `SELECT company_id, ip_address, region, array_agg(id) AS event_ids, count(*)::int AS attempts
       FROM scan_events
       WHERE result = 'invalid' AND scanned_at >= now() - interval '1 hour'
       GROUP BY company_id, ip_address, region HAVING count(*) > 500`
    );
    for (const row of result.rows) {
      await this.createAlert(row.company_id, null, 'invalid_spike', 'critical', `Invalid scan spike from ${row.ip_address ?? row.region}.`, row.event_ids);
    }
  }

  private async detectCodeCloning() {
    const result = await this.db.query(
      `SELECT company_id, code, json_agg(json_build_object('id', id, 'lat', latitude, 'lng', longitude, 'scanned_at', scanned_at, 'district', district)) AS events
       FROM scan_events
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND scanned_at >= now() - interval '30 minutes'
       GROUP BY company_id, code HAVING count(*) >= 2`
    );
    for (const row of result.rows) {
      const events = row.events as Array<{ id: number; lat: string; lng: string; scanned_at: string; district: string }>;
      const match = events.some((a, i) =>
        events.slice(i + 1).some((b) => haversineKm(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng)) > 50)
      );
      await this.db.query(
        `INSERT INTO fraud_rule_evaluations (company_id, rule_name, code, matched, metadata)
         VALUES ($1, 'code_cloning', $2, $3, $4)`,
        [row.company_id, row.code, match, JSON.stringify({ events })]
      );
      if (match) {
        await this.createAlert(row.company_id, row.code, 'code_cloning', 'high', `Code ${row.code} scanned from distant locations within 30 minutes.`, events.map((event) => event.id));
        await this.db.query(`UPDATE verification_codes SET status = 'flagged', risk_score = GREATEST(risk_score, 75) WHERE code = $1`, [row.code]);
      }
    }
  }

  private async createAlert(companyId: string, code: string | null, type: string, risk: string, description: string, ids: number[]) {
    await this.db.query(
      `INSERT INTO fraud_alerts (company_id, code, alert_type, risk_level, description, scan_event_ids)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [companyId, code, type, risk, description, ids]
    );
  }
}
