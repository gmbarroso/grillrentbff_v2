import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SecurityObservabilityService } from '../shared/security/security-observability.service';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class EdgeRateLimitMiddleware implements NestMiddleware {
  private static parseRateLimitNumber(rawValue: string | undefined, fallback: number): number {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private readonly globalBuckets = new Map<string, Bucket>();
  private readonly loginBuckets = new Map<string, Bucket>();
  private readonly globalWindowMs = EdgeRateLimitMiddleware.parseRateLimitNumber(
    process.env.EDGE_RATE_LIMIT_WINDOW_MS,
    60_000,
  );
  private readonly globalMax = EdgeRateLimitMiddleware.parseRateLimitNumber(process.env.EDGE_RATE_LIMIT_MAX, 120);
  private readonly loginWindowMs = EdgeRateLimitMiddleware.parseRateLimitNumber(
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
    900_000,
  );
  private readonly loginMax = EdgeRateLimitMiddleware.parseRateLimitNumber(process.env.LOGIN_RATE_LIMIT_MAX, 8);

  constructor(private readonly securityObservability: SecurityObservabilityService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if ((req.method || '').toUpperCase() === 'OPTIONS') {
      next();
      return;
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const method = (req.method || '').toUpperCase();

    if (!this.consume(this.globalBuckets, `${ip}:global`, this.globalWindowMs, this.globalMax)) {
      this.securityObservability.recordRateLimitEvent('global', ip);
      this.reject(res, 'global');
      return;
    }

    if (method === 'POST' && path === '/users/login') {
      if (!this.consume(this.loginBuckets, `${ip}:login`, this.loginWindowMs, this.loginMax)) {
        this.securityObservability.recordRateLimitEvent('login', ip);
        this.reject(res, 'login');
        return;
      }
    }

    next();
  }

  private consume(store: Map<string, Bucket>, key: string, windowMs: number, max: number): boolean {
    const now = Date.now();
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (current.count >= max) {
      return false;
    }

    current.count += 1;
    store.set(key, current);
    return true;
  }

  private reject(res: Response, scope: 'global' | 'login'): void {
    const retryWindow = scope === 'login' ? this.loginWindowMs : this.globalWindowMs;
    res.setHeader('Retry-After', Math.ceil(retryWindow / 1000));
    res.status(429).json({
      message: scope === 'login' ? 'Too many login attempts. Try again later.' : 'Too many requests. Try again later.',
    });
  }
}
