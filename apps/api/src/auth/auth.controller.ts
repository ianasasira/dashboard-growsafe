import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types';
import { AuthService } from './auth.service';

interface LoginDto {
  email: string;
  password: string;
  companySlug?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body.email, body.password, body.companySlug);
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() request: { cookies?: Record<string, string> }, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(request.cookies?.refresh_token);
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(user.sub);
    response.clearCookie('refresh_token');
    return { loggedOut: true };
  }

  @Post('change-password')
  async changePassword(@CurrentUser() user: RequestUser, @Body() body: { currentPassword: string; newPassword: string }) {
    await this.auth.changePassword(user.sub, body.currentPassword, body.newPassword);
    return { changed: true };
  }
}
