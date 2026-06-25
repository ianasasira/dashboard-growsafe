import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class QrEngineService {
  generateVerificationCode(companyPrefix: string, batchPrefix: string): string {
    const random = crypto.randomBytes(8);
    const body = Array.from(random, (byte) => alphabet[byte % alphabet.length]).join('');
    const payload = `${companyPrefix}-${batchPrefix}-${body}`;
    return `${payload}-${this.luhn(payload)}`;
  }

  async toPngBuffer(code: string) {
    const baseUrl = process.env.VERIFY_BASE_URL ?? 'https://verify.growsafe.com/v';
    return QRCode.toBuffer(`${baseUrl}/${code}`, {
      width: 300,
      errorCorrectionLevel: 'M',
      margin: 2
    });
  }

  private luhn(input: string) {
    const digits = input
      .replace(/[^A-Z0-9]/gi, '')
      .split('')
      .map((char) => char.charCodeAt(0) % 10);
    const sum = digits.reverse().reduce((total, digit, index) => {
      let value = index % 2 === 0 ? digit * 2 : digit;
      if (value > 9) value -= 9;
      return total + value;
    }, 0);
    return (10 - (sum % 10)) % 10;
  }
}
