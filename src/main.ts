import 'dotenv/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const CORS_ENV_KEYS = [
  'BFF_CORS_ALLOWED_ORIGINS',
  'CORS_ALLOWED_ORIGINS',
  'FRONTEND_URL',
  'APP_URL',
  'WEB_URL',
  'PUBLIC_APP_URL',
] as const;

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, '').toLowerCase();

const parseAllowedOrigins = (): string[] => {
  const fromEnv = CORS_ENV_KEYS
    .flatMap((key) => (process.env[key] || '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv].map(normalizeOrigin)));
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const allowedOrigins = parseAllowedOrigins();

  app.use('/messages/contact', json({ limit: '10mb' }));
  app.use('/messages/contact', urlencoded({ extended: true, limit: '10mb' }));
  app.use('/organizations', json({ limit: '10mb' }));
  app.use('/organizations', urlencoded({ extended: true, limit: '10mb' }));

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      logger.warn(`Blocked CORS origin: ${origin}`);
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, X-CSRF-Token',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(new ValidationPipe());
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`BFF service listening on port ${port}`);
  logger.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
