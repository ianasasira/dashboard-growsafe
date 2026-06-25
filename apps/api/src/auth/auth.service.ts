import bcrypt from 'bcrypt';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../common/database/database.service';
import { RequestUser } from '../common/types';

interface UserRow {
  id: string;
  company_id: string | null;
  company_slug: string | null;
  email: string;
  password_hash: string;
  role: RequestUser['role'];
  is_active: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string, companySlug?: string) {
    const result = await this.db.query<UserRow>(
      `SELECT u.*, c.slug AS company_slug
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE lower(u.email) = lower($1)
       AND u.deleted_at IS NULL
       AND ($2::text IS NULL OR c.slug = $2 OR u.role = 'superadmin')
       LIMIT 1`,
      [email, companySlug ?? null]
    );
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new ForbiddenException('Account is inactive');
    if (user.locked_until && user.locked_until > new Date()) throw new ForbiddenException('Account is locked');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = user.failed_login_attempts + 1;
      await this.db.query(
        `UPDATE users
         SET failed_login_attempts = $1, locked_until = CASE WHEN $1 >= 5 THEN now() + interval '30 minutes' ELSE locked_until END
         WHERE id = $2`,
        [attempts, user.id]
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [
      user.id
    ]);
    return this.issueTokens(this.toTokenUser(user));
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    let payload: RequestUser;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret'
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const result = await this.db.query<UserRow>(
      `SELECT u.*, c.slug AS company_slug
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user?.is_active) throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(this.toTokenUser(user));
  }

  async logout(userId: string) {
    await this.db.query('UPDATE users SET refresh_token_hash = NULL WHERE id = $1', [userId]);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const result = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('Current password is invalid');
    }
    await this.db.query('UPDATE users SET password_hash = $1, refresh_token_hash = NULL WHERE id = $2', [
      await bcrypt.hash(newPassword, 12),
      userId
    ]);
  }

  private async issueTokens(user: RequestUser) {
    const accessToken = await this.jwt.signAsync(user, {
      secret: process.env.JWT_SECRET ?? 'dev-access-secret',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
    });
    const refreshToken = await this.jwt.signAsync(user, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
    });
    await this.db.query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [
      await bcrypt.hash(refreshToken, 12),
      user.sub
    ]);
    return { accessToken, refreshToken, user };
  }

  private toTokenUser(user: UserRow): RequestUser {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      companySlug: user.company_slug
    };
  }
}
