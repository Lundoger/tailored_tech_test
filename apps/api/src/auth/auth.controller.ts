import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthUserDto,
  type LoginInput,
  loginInputSchema,
  type RegisterInput,
  registerInputSchema,
  SESSION_COOKIE_NAME,
} from '@data-room/shared';
import type { Response } from 'express';

import { AppError } from '../common/app-error';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import type { SessionUser } from './session.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Create an account and start a session' })
  async register(
    @Body(new ZodValidationPipe(registerInputSchema)) input: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserDto> {
    const user = await this.authService.register(input);
    await this.startSession(user, response);
    return user;
  }

  @Public()
  // Argon2 already makes each attempt expensive; this caps how many an attacker
  // gets to make. Ten a minute is invisible to a person who mistypes a password.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and start a session' })
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserDto> {
    const user = await this.authService.login(input);
    await this.startSession(user, response);
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the session' })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE_NAME, this.authService.clearedSessionCookieOptions());
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in user' })
  async me(@CurrentUser() sessionUser: SessionUser): Promise<AuthUserDto> {
    const user = await this.authService.findById(sessionUser.id);

    if (!user) {
      throw AppError.unauthenticated();
    }

    return user;
  }

  private async startSession(user: AuthUserDto, response: Response): Promise<void> {
    const token = await this.authService.issueSessionToken(user);
    response.cookie(SESSION_COOKIE_NAME, token, this.authService.sessionCookieOptions());
  }
}
