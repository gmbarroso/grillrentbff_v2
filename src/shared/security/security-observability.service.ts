import { Injectable, Logger } from '@nestjs/common';

export interface AuthFailureDetails {
  requestId?: string;
  origin?: string;
  userAgent?: string;
  authSource?: 'cookie' | 'bearer' | 'none';
  isBotTraffic?: boolean;
  apartmentHint?: string;
  blockHint?: string;
  organizationSlugHint?: string;
  hasCookieHeader?: boolean;
  hasAuthorizationHeader?: boolean;
  hasSessionCookie?: boolean;
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

  private sanitizeLogValue(value: string, maxLength = 200): string {
    return value.replace(/[\r\n\t]/g, ' ').replace(/"/g, "'").slice(0, maxLength);
  }

  recordAuthFailure(reason: string, context: string, details?: AuthFailureDetails): void {
    this.counters.authFailures += 1;
    const requestId = this.sanitizeLogValue(details?.requestId || 'missing-request-id');
    const sanitizedContext = this.sanitizeLogValue(context);
    const sanitizedReason = this.sanitizeLogValue(reason);
    const origin = this.sanitizeLogValue(details?.origin || 'missing-origin');
    const userAgent = this.sanitizeLogValue(details?.userAgent || 'missing-user-agent');
    const authSource = details?.authSource || 'none';
    const isBotTraffic = details?.isBotTraffic ? 'true' : 'false';
    const apartmentHint = this.sanitizeLogValue(details?.apartmentHint || 'missing-apartment-hint');
    const blockHint = this.sanitizeLogValue(details?.blockHint || 'missing-block-hint');
    const organizationSlugHint = this.sanitizeLogValue(details?.organizationSlugHint || 'missing-organization-slug-hint');
    const hasCookieHeader = details?.hasCookieHeader ? 'true' : 'false';
    const hasAuthorizationHeader = details?.hasAuthorizationHeader ? 'true' : 'false';
    const hasSessionCookie = details?.hasSessionCookie ? 'true' : 'false';
    this.logger.warn(
      `event=auth_failure requestId=${requestId} context=${sanitizedContext} reason="${sanitizedReason}" authSource=${authSource} isBotTraffic=${isBotTraffic} hasAuthorizationHeader=${hasAuthorizationHeader} hasCookieHeader=${hasCookieHeader} hasSessionCookie=${hasSessionCookie} organizationSlugHint="${organizationSlugHint}" apartmentHint="${apartmentHint}" blockHint="${blockHint}" origin="${origin}" userAgent="${userAgent}" count=${this.counters.authFailures}`,
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
