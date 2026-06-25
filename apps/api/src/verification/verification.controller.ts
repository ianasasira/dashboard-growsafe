import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

@Controller()
export class VerificationController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get('verify/:code')
  async verify(@Param('code') code: string, @Req() request: { ip?: string; headers: Record<string, string> }) {
    const result = await this.db.query(
      `SELECT vc.*, b.batch_number, b.manufacture_date, b.expiry_date, b.manufacturing_plant, b.status AS batch_status,
       b.recall_reason, p.name AS product_name, p.image_url, p.usage_information, p.safety_information,
       c.name AS company_name, c.contact_email, c.contact_phone
       FROM verification_codes vc
       JOIN batches b ON b.id = vc.batch_id
       JOIN products p ON p.id = b.product_id
       JOIN companies c ON c.id = vc.company_id
       WHERE vc.code = $1`,
      [code]
    );
    const row = result.rows[0];
    let verificationResult = 'invalid';
    if (row) {
      if (row.batch_status === 'recalled' || row.status === 'recalled') verificationResult = 'recalled';
      else if (row.expiry_date && new Date(row.expiry_date) < new Date()) verificationResult = 'expired';
      else if (row.scan_count > 0) verificationResult = 'already_used';
      else verificationResult = 'genuine';
    }

    await this.db.query(
      `INSERT INTO scan_events
       (company_id, code, verification_code_id, result, channel, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,'qr_web',$5,$6)`,
      [row?.company_id ?? null, code, row?.id ?? null, verificationResult, request.ip ?? null, request.headers['user-agent'] ?? null]
    );
    if (row) {
      await this.db.query(
        `UPDATE verification_codes
         SET scan_count = scan_count + 1,
         first_scanned_at = COALESCE(first_scanned_at, now()),
         last_scanned_at = now(),
         status = CASE WHEN $2 IN ('genuine','already_used') THEN 'verified' ELSE $2 END
         WHERE id = $1`,
        [row.id, verificationResult]
      );
    }

    return { result: verificationResult, product: row ?? null };
  }

  @Public()
  @Post('verify/:code/feedback')
  async feedback(@Param('code') code: string, @Body() body: { rating: number; comment?: string; phoneNumber?: string }) {
    const found = await this.db.query(
      `SELECT vc.company_id, b.product_id FROM verification_codes vc JOIN batches b ON b.id = vc.batch_id WHERE vc.code = $1`,
      [code]
    );
    const row = found.rows[0];
    await this.db.query(
      `INSERT INTO consumer_feedback (company_id, product_id, code, rating, comment, phone_number)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [row?.company_id ?? null, row?.product_id ?? null, code, body.rating, body.comment ?? null, body.phoneNumber ?? null]
    );
    return { received: true };
  }

  @Get('verification/events')
  async events(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT * FROM scan_events WHERE ($1::uuid IS NULL OR company_id = $1) ORDER BY scanned_at DESC LIMIT 100`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }

  @Get('verification/stats')
  async stats(@CurrentUser() user: RequestUser) {
    const result = await this.db.query(
      `SELECT result, count(*)::int AS count FROM scan_events
       WHERE ($1::uuid IS NULL OR company_id = $1)
       GROUP BY result`,
      [user.role === 'superadmin' ? null : user.companyId]
    );
    return { items: result.rows };
  }
}
