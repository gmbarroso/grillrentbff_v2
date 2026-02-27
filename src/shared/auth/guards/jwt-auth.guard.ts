import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedToken } from '../../../api/entities/revoked-token.entity';
import { UserRole } from '../../../api/entities/user.entity';
import { getAuthTokenFromCookieHeader, getCsrfTokenFromCookieHeader } from '../auth-cookie.util';
import { SecurityObservabilityService } from '../../security/security-observability.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private static readonly CSRF_HEADER = 'x-csrf-token';

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    private readonly securityObservability: SecurityObservabilityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('Validating JWT token');

    const request = context.switchToHttp().getRequest();
    const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((request.method || '').toUpperCase());
    const headerToken = request.headers.authorization?.split(' ')[1];
    const cookieToken = getAuthTokenFromCookieHeader(request.headers.cookie);
    const token = headerToken || cookieToken;

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

    if (isMutationMethod) {
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
      if (!decoded || !decoded.sub || !decoded.name || !decoded.exp || !isValidRole) {
        this.logger.error('Invalid token payload');
        this.securityObservability.recordAuthFailure('invalid_token_payload', request.url);
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = { id: decoded.sub, name: decoded.name, role: decoded.role, token };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException && error.message === 'Invalid token payload') {
        throw error;
      }
      this.logger.error(`Token validation failed: ${error.message}`);
      this.securityObservability.recordAuthFailure('invalid_or_expired_token', request.url);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
