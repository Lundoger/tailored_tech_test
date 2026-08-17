import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { loadRootEnv } from './config/load-env';

async function bootstrap(): Promise<void> {
  loadRootEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(AppConfigService);

  app.use(cookieParser());

  // `nosniff` is the one that matters most here: the local storage driver serves
  // uploaded files from this origin, and without it a browser could sniff a
  // mislabelled file into something executable. The relaxed script/style sources
  // are for the Swagger page, the only HTML this service returns.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          // `'self'` rather than `'none'`: this header also travels with the files
          // the local driver serves, and the viewer loads those in an iframe that
          // is same-origin once proxied through the web app.
          frameAncestors: ["'self'"],
        },
      },
    }),
  );

  app.set('trust proxy', 1);

  app.enableCors({ origin: config.corsOrigins, credentials: true });

  const openApi = new DocumentBuilder()
    .setTitle('Data Room API')
    .setDescription(
      [
        'Backend for the Data Room app.',
        '',
        'Authentication uses an httpOnly session cookie. To try endpoints from this',
        'page, call POST /auth/login first — the browser stores the cookie and sends',
        'it automatically with every following request.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addCookieAuth('data_room_session')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi), {
    swaggerOptions: { withCredentials: true, persistAuthorization: true },
  });

  await app.listen(config.env.PORT, '0.0.0.0');

  new Logger('Bootstrap').log(
    `API listening on port ${config.env.PORT} · storage driver: ${config.env.storageDriver} · docs at /docs`,
  );
}

void bootstrap();
