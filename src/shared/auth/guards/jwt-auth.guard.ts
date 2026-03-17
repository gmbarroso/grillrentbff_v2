import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedToken } from '../../../api/entities/revoked-token.entity';
import { UserRole } from '../../../api/entities/user.entity';
import { getAuthTokenFromCookieHeader, getCsrfTokenFromCookieHeader } from '../auth-cookie.util';
import { SecurityObservabilityService } from '../../security/security-observability.service';
import { RequestContextService } from '../../request-context/request-context.service';
import { HttpServiceWrapper } from '../../http/http.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private static readonly ONBOARDING_CACHE_TTL_MS = 60_000;
  private static readonly ONBOARDING_CACHE_MAX_SIZE = 1000;
  private static readonly ONBOARDING_CACHE_CLEANUP_INTERVAL_MS = 30_000;
  private static readonly CSRF_HEADER = 'x-csrf-token';
  private static readonly ONBOARDING_ALLOWED_PATHS = new Set([
    '/users/profile',
    '/users/logout',
    '/users/onboarding/email',
    '/users/onboarding/verify',
    '/users/onboarding/change-password',
  ]);
  private readonly onboardingCache = new Map<
    string,
    {
      flags: {
        mustProvideEmail: boolean;
        mustVerifyEmail: boolean;
        mustChangePassword: boolean;
        onboardingRequired: boolean;
      };
      expiresAt: number;
    }
  >();
  private lastOnboardingCacheCleanupAt = 0;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    private readonly securityObservability: SecurityObservabilityService,
    private readonly requestContextService: RequestContextService,
    private readonly httpService: HttpServiceWrapper,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('Validating JWT token');

    const request = context.switchToHttp().getRequest();
    const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((request.method || '').toUpperCase());
    const headerToken = request.headers.authorization?.split(' ')[1];
    const cookieToken = getAuthTokenFromCookieHeader(request.headers.cookie);
    const token = headerToken || cookieToken;
    const isCookieAuthenticated = !headerToken && Boolean(cookieToken);

    if (!token) {
      this.logger.error('Token not provided');
      this.securityObservability.recordAuthFailure('token_not_provided', request.url);
      throw new UnauthorizedException('Token not provided');
    }

    const isRevoked = await this.revokedTokenRepository.findOne({ where: { token } });
    if (isRevoked) {
      this.logger.error('Token has been revoked');
      this.securityObservability.recordRevocationDenial(request.url);
      throw new UnauthorizedException('Token has been revoked');
    }

    if (isMutationMethod && isCookieAuthenticated) {
      const rawCsrfFromHeader = request.headers[JwtAuthGuard.CSRF_HEADER];
      const csrfFromHeader = Array.isArray(rawCsrfFromHeader) ? rawCsrfFromHeader[0] : rawCsrfFromHeader;
      const csrfFromCookie = getCsrfTokenFromCookieHeader(request.headers.cookie);
      if (!csrfFromHeader || !csrfFromCookie || csrfFromHeader !== csrfFromCookie) {
        this.logger.error('Invalid CSRF token');
        this.securityObservability.recordCsrfRejection(request.url);
        throw new ForbiddenException('Invalid CSRF token');
      }
    }

    try {
      const decoded = this.jwtService.verify(token);

      const isValidRole = decoded?.role === UserRole.ADMIN || decoded?.role === UserRole.RESIDENT;
      const isValidOrganizationId = typeof decoded?.organizationId === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.organizationId);

      if (!decoded || !decoded.sub || !decoded.name || !decoded.exp || !isValidRole || !isValidOrganizationId) {
        this.logger.error('Invalid token payload');
        this.securityObservability.recordAuthFailure('invalid_token_payload', request.url);
        throw new UnauthorizedException('Invalid token payload');
      }

      this.requestContextService.setOrganizationId(decoded.organizationId);
      const onboarding = await this.resolveOnboardingFlags(token, decoded.role, decoded);
      const requestPath = this.normalizeRequestPath(request.url);
      if (
        decoded.role === UserRole.RESIDENT
        && onboarding.onboardingRequired
        && !JwtAuthGuard.ONBOARDING_ALLOWED_PATHS.has(requestPath)
      ) {
        this.logger.warn(`Blocked restricted session path: ${requestPath}`);
        throw new ForbiddenException('Complete onboarding before accessing this route');
      }

      request.user = {
        id: decoded.sub,
        name: decoded.name,
        role: decoded.role,
        organizationId: decoded.organizationId,
        token,
        ...onboarding,
      };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof UnauthorizedException && error.message === 'Invalid token payload') {
        throw error;
      }
      this.logger.error(`Token validation failed: ${error.message}`);
      this.securityObservability.recordAuthFailure('invalid_or_expired_token', request.url);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private normalizeRequestPath(url: string): string {
    const [path] = (url || '').split('?');
    return path || '/';
  }

  private async resolveOnboardingFlags(
    token: string,
    role: UserRole,
    decodedPayload?: {
      onboarding?: {
        mustProvideEmail?: boolean;
        mustVerifyEmail?: boolean;
        mustChangePassword?: boolean;
        onboardingRequired?: boolean;
      };
    },
  ): Promise<{
    mustProvideEmail: boolean;
    mustVerifyEmail: boolean;
    mustChangePassword: boolean;
    onboardingRequired: boolean;
  }> {
    if (role !== UserRole.RESIDENT) {
      return {
        mustProvideEmail: false,
        mustVerifyEmail: false,
        mustChangePassword: false,
        onboardingRequired: false,
      };
    }

    const now = Date.now();
    this.maybeCleanupOnboardingCache(now);
    const cached = this.onboardingCache.get(token);
    if (cached && cached.expiresAt > now) {
      return cached.flags;
    }

    const tokenFlags = this.tryResolveOnboardingFlagsFromToken(decodedPayload);
    if (tokenFlags) {
      this.onboardingCache.set(token, {
        flags: tokenFlags,
        expiresAt: now + JwtAuthGuard.ONBOARDING_CACHE_TTL_MS,
      });
      this.enforceOnboardingCacheSizeLimit(now);
      return tokenFlags;
    }

    let profile: {
      onboarding?: {
        mustProvideEmail?: boolean;
        mustVerifyEmail?: boolean;
        mustChangePassword?: boolean;
        onboardingRequired?: boolean;
      };
    } | null = null;
    try {
      profile = await this.httpService.get<{
        onboarding?: {
          mustProvideEmail?: boolean;
          mustVerifyEmail?: boolean;
          mustChangePassword?: boolean;
          onboardingRequired?: boolean;
        };
      }>('users/profile', undefined, token);
    } catch (error) {
      this.logger.warn(`Unable to resolve onboarding flags from profile service: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Unable to resolve onboarding status right now');
    }

    const onboarding = profile?.onboarding;
    const flags = {
      mustProvideEmail: Boolean(onboarding?.mustProvideEmail),
      mustVerifyEmail: Boolean(onboarding?.mustVerifyEmail),
      mustChangePassword: Boolean(onboarding?.mustChangePassword),
      onboardingRequired: Boolean(onboarding?.onboardingRequired),
    };

    this.onboardingCache.set(token, {
      flags,
      expiresAt: now + JwtAuthGuard.ONBOARDING_CACHE_TTL_MS,
    });
    this.enforceOnboardingCacheSizeLimit(now);

    return flags;
  }

  private maybeCleanupOnboardingCache(now: number, force = false): void {
    if (!force && now - this.lastOnboardingCacheCleanupAt < JwtAuthGuard.ONBOARDING_CACHE_CLEANUP_INTERVAL_MS) {
      return;
    }

    for (const [key, entry] of this.onboardingCache.entries()) {
      if (entry.expiresAt <= now) {
        this.onboardingCache.delete(key);
      }
    }
    this.lastOnboardingCacheCleanupAt = now;
  }

  private enforceOnboardingCacheSizeLimit(now: number): void {
    this.maybeCleanupOnboardingCache(now, true);
    if (this.onboardingCache.size <= JwtAuthGuard.ONBOARDING_CACHE_MAX_SIZE) {
      return;
    }

    const keysIterator = this.onboardingCache.keys();
    while (this.onboardingCache.size > JwtAuthGuard.ONBOARDING_CACHE_MAX_SIZE) {
      const next = keysIterator.next();
      if (next.done) {
        break;
      }
      this.onboardingCache.delete(next.value);
    }
  }

  private tryResolveOnboardingFlagsFromToken(decodedPayload?: {
    onboarding?: {
      mustProvideEmail?: boolean;
      mustVerifyEmail?: boolean;
      mustChangePassword?: boolean;
      onboardingRequired?: boolean;
    };
  }): {
    mustProvideEmail: boolean;
    mustVerifyEmail: boolean;
    mustChangePassword: boolean;
    onboardingRequired: boolean;
  } | null {
    const onboarding = decodedPayload?.onboarding;
    if (!onboarding || typeof onboarding !== 'object') {
      return null;
    }

    return {
      mustProvideEmail: Boolean(onboarding.mustProvideEmail),
      mustVerifyEmail: Boolean(onboarding.mustVerifyEmail),
      mustChangePassword: Boolean(onboarding.mustChangePassword),
      onboardingRequired: Boolean(onboarding.onboardingRequired),
    };
  }
}
