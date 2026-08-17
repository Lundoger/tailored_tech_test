import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { AuthUserDto, LoginInput, RegisterInput } from '@data-room/shared';
import type { CookieOptions } from 'express';

import { AppError } from '../common/app-error';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionTokenPayload, SessionUser } from './session.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async register(input: RegisterInput): Promise<AuthUserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw AppError.emailAlreadyRegistered();
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hash(input.password),
      },
    });

    await this.bindPendingInvites(user.id, user.email);

    return toAuthUserDto(user);
  }

  async login(input: LoginInput): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user?.passwordHash) {
      // Spend comparable time on an unknown email so this endpoint cannot be used
      // to tell which addresses have accounts.
      await verify(DUMMY_HASH, input.password).catch(() => false);
      throw AppError.invalidCredentials();
    }

    const passwordMatches = await verify(user.passwordHash, input.password).catch(() => false);
    if (!passwordMatches) {
      throw AppError.invalidCredentials();
    }

    await this.bindPendingInvites(user.id, user.email);

    return toAuthUserDto(user);
  }

  async findById(userId: string): Promise<AuthUserDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? toAuthUserDto(user) : null;
  }

  async issueSessionToken(user: AuthUserDto): Promise<string> {
    const payload: SessionTokenPayload = { sub: user.id, email: user.email, name: user.name };
    return this.jwt.signAsync(payload);
  }

  async verifySessionToken(token: string): Promise<SessionUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<SessionTokenPayload>(token);
      return { id: payload.sub, email: payload.email, name: payload.name };
    } catch {
      return null;
    }
  }

  sessionCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.isProduction,
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    };
  }

  clearedSessionCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.isProduction,
      path: '/',
    };
  }

  private async bindPendingInvites(userId: string, email: string): Promise<void> {
    try {
      await this.prisma.shareRecipient.updateMany({
        where: { email, userId: null },
        data: { userId },
      });
    } catch (error) {
      this.logger.warn(`Could not bind share invites for ${email}: ${String(error)}`);
    }
  }
}

const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZS1yYW5kb20tc2FsdA$Yx2ImmJmnRRQ7z1DfIJ6oh0OTgUmSHTNsRYX4jvKLM4';

function toAuthUserDto(user: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
