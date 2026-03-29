import { Injectable, Logger } from '@nestjs/common';

export interface AuthFailureDetails {
  requestId?: string;
  origin?: string;
  userAgent?: string;
  authSource?: 'cookie' | 'bearer' | 'none';
  isBotTraffic?: boolean;
}

@Injectable()
export class SecurityObservabilityService {
  private readonly logger = new Logger(SecurityObservabilityService.name);
  private readonly counters = {
    authFailures: 0,
    csrfRejections: 0,
    revocationDenials: 0,
    rateLimitEvents: 0,
  };

  recordAuthFailure(reason: string, context: string, details?: AuthFailureDetails): void {
    this.counters.authFailures += 1;
    const requestId = details?.requestId || 'missing-request-id';
    const origin = details?.origin || 'missing-origin';
    const userAgent = details?.userAgent || 'missing-user-agent';
    const authSource = details?.authSource || 'none';
    const isBotTraffic = details?.isBotTraffic ? 'true' : 'false';
    this.logger.warn(
      `event=auth_failure requestId=${requestId} context=${context} reason="${reason}" authSource=${authSource} isBotTraffic=${isBotTraffic} origin="${origin}" userAgent="${userAgent}" count=${this.counters.authFailures}`,
    );
  }

  recordCsrfRejection(context: string): void {
    this.counters.csrfRejections += 1;
    this.logger.warn(`event=csrf_rejection context=${context} count=${this.counters.csrfRejections}`);
  }

  recordRevocationDenial(context: string): void {
    this.counters.revocationDenials += 1;
    this.logger.warn(`event=revocation_denial context=${context} count=${this.counters.revocationDenials}`);
  }

  recordRateLimitEvent(scope: string, ip: string): void {
    this.counters.rateLimitEvents += 1;
    this.logger.warn(
      `event=rate_limit scope=${scope} ip=${ip} count=${this.counters.rateLimitEvents}`,
    );
  }

  getCounters() {
    return { ...this.counters };
  }
}
