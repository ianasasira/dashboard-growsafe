import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DatabaseService } from '../common/database/database.service';
import { QrEngineService } from './qr-engine.service';

interface GenerateCodesJob {
  batchId: string;
  companyId: string | null;
}

@Processor('qr-generation')
export class QrGenerationProcessor extends WorkerHost {
  constructor(
    private readonly db: DatabaseService,
    private readonly qr: QrEngineService
  ) {
    super();
  }

  async process(job: Job<GenerateCodesJob>) {
    const batchResult = await this.db.query(
      `SELECT b.*, c.slug AS company_slug, p.sku
       FROM batches b
       JOIN companies c ON c.id = b.company_id
       JOIN products p ON p.id = b.product_id
       WHERE b.id = $1 AND ($2::uuid IS NULL OR b.company_id = $2)`,
      [job.data.batchId, job.data.companyId]
    );
    const batch = batchResult.rows[0];
    if (!batch) throw new Error('Batch not found');

    const companyPrefix = String(batch.company_slug).slice(0, 3).toUpperCase();
    const batchPrefix = String(batch.batch_number).replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase();
    const rows: string[][] = [];
    const total = Number(batch.quantity);

    for (let i = 0; i < total; i += 1) {
      const code = this.qr.generateVerificationCode(companyPrefix, batchPrefix);
      rows.push([batch.company_id, batch.id, code, `/${batch.company_slug}/batches/${batch.batch_number}/${code}.png`]);
      if (rows.length === 5000 || i === total - 1) {
        await this.insertChunk(rows);
        rows.length = 0;
      }
      if (i % 1000 === 0) await job.updateProgress(Math.round((i / total) * 100));
    }

    await this.db.query(
      `UPDATE batches SET codes_generated = true, codes_generated_at = now(), status = 'active' WHERE id = $1`,
      [batch.id]
    );
    await this.db.query(
      `INSERT INTO notifications (company_id, type, title, message, metadata)
       VALUES ($1, 'codes_generated', 'Codes generated', $2, $3)`,
      [batch.company_id, `Verification codes generated for batch ${batch.batch_number}.`, { batchId: batch.id, quantity: total }]
    );
    await job.updateProgress(100);
    return { inserted: total };
  }

  private async insertChunk(rows: string[][]) {
    const values: unknown[] = [];
    const placeholders = rows
      .map((row, rowIndex) => {
        values.push(...row);
        const start = rowIndex * 4;
        return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4})`;
      })
      .join(',');
    await this.db.query(
      `INSERT INTO verification_codes (company_id, batch_id, code, qr_image_url)
       VALUES ${placeholders}
       ON CONFLICT (code) DO NOTHING`,
      values
    );
  }
}
