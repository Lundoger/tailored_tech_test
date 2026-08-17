import { Injectable } from '@nestjs/common';

import { allowedOrigins, type Env, validateEnv } from './env';

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get corsOrigins(): string[] {
    return allowedOrigins(this.env);
  }
}
