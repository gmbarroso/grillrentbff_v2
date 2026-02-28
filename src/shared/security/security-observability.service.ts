import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SecurityObservabilityService {
  private readonly logger = new Logger(SecurityObservabilityService.name);
  private readonly counters = {
    authFailures: 0,
    csrfRejections: 0,
    revocationDenials: 0,
    rateLimitEvents: 0,
  };

  recordAuthFailure(reason: string, context: string): void {
    this.counters.authFailures += 1;
    this.logger.warn(`event=auth_failure context=${context} reason="${reason}" count=${this.counters.authFailures}`);
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
