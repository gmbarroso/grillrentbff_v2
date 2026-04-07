import { ExecutionContext, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const BFF_PROTECTED_PATHS = ['/users/profile', '/users', '/resources', '/bookings', '/bookeddates', '/notices', '/messages'];

describe('BFF JwtAuthGuard - Phase 2 revocation enforcement', () => {
  const token = 'phase2-token';
  const jwtService = {
    verify: jest.fn(),
  };
  const revokedTokenRepository = {
    findOne: jest.fn(),
  };
  const securityObservability = {
    recordAuthFailure: jest.fn(),
    recordCsrfRejection: jest.fn(),
    recordRevocationDenial: jest.fn(),
  };
  const requestContextService = {
    setOrganizationId: jest.fn(),
  };
  const httpService = {
    get: jest.fn(),
  };

  let guard: JwtAuthGuard;

  const createContext = (
    path: string,
    options?: { token?: string; useCookie?: boolean; method?: string; csrfHeader?: string; csrfCookie?: string },
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: options?.method || 'GET',
          url: path,
          headers: options?.useCookie
            ? {
                'x-request-id': 'req-123',
                origin: 'https://app.example.com',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
                cookie: `grillrent_session=${options.token || token}; grillrent_csrf=${
                  options?.csrfCookie || 'csrf-ok'
                }`,
                ...(options?.csrfHeader ? { 'x-csrf-token': options.csrfHeader } : {}),
              }
            : {
                'x-request-id': 'req-123',
                origin: 'https://app.example.com',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                authorization: `Bearer ${options?.token || token}`,
                ...(options?.csrfHeader ? { 'x-csrf-token': options.csrfHeader } : {}),
                ...(options?.csrfCookie ? { cookie: `grillrent_csrf=${options.csrfCookie}` } : {}),
              },
        }),
      }),
    } as unknown as ExecutionContext);

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(
      jwtService as any,
      revokedTokenRepository as any,
      securityObservability as any,
      requestContextService as any,
      httpService as any,
    );
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      name: 'Test User',
      role: 'resident',
      organizationId: '4f5a8d5b-6fd0-4da0-bf96-c2454c6f8c99',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    httpService.get.mockResolvedValue({
      onboarding: {
        mustProvideEmail: false,
        mustVerifyEmail: false,
        mustChangePassword: false,
        onboardingRequired: false,
      },
    });
  });

  it.each(BFF_PROTECTED_PATHS)('allows valid token before logout on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(createContext(path))).resolves.toBe(true);
  });

  it.each(BFF_PROTECTED_PATHS)('allows cookie-based token on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    await expect(guard.canActivate(createContext(path, { useCookie: true }))).resolves.toBe(true);
  });

  it.each(BFF_PROTECTED_PATHS)('denies mutation with missing csrf token on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    await expect(guard.canActivate(createContext(path, { method: 'POST', useCookie: true }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(securityObservability.recordCsrfRejection).toHaveBeenCalledWith(path);
  });

  it.each(BFF_PROTECTED_PATHS)('allows bearer-auth mutation without csrf cookie/header on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    await expect(guard.canActivate(createContext(path, { method: 'POST', useCookie: false }))).resolves.toBe(true);
  });

  it.each(BFF_PROTECTED_PATHS)('allows mutation with matching csrf header/cookie on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        createContext(path, { method: 'POST', csrfHeader: 'csrf-ok', csrfCookie: 'csrf-ok', useCookie: true }),
      ),
    ).resolves.toBe(true);
  });

  it.each(BFF_PROTECTED_PATHS)('denies token after logout on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue({ id: 'revoked-entry' });

    await expect(guard.canActivate(createContext(path))).rejects.toThrow(UnauthorizedException);
    expect(securityObservability.recordRevocationDenial).toHaveBeenCalledWith(path);
  });

  it.each(BFF_PROTECTED_PATHS)(
    'post-cleanup, expired token without revoked record remains denied on %s',
    async (path) => {
      revokedTokenRepository.findOne.mockResolvedValue(null);
      jwtService.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        (error as Error & { name: string }).name = 'TokenExpiredError';
        throw error;
      });

      await expect(guard.canActivate(createContext(path))).rejects.toThrow(UnauthorizedException);
      expect(securityObservability.recordAuthFailure).toHaveBeenCalledWith(
        'invalid_or_expired_token',
        path,
        expect.objectContaining({
          requestId: 'req-123',
          origin: 'https://app.example.com',
          authSource: 'bearer',
          isBotTraffic: false,
        }),
      );
    },
  );

  it('denies resident restricted sessions on non-onboarding paths', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    httpService.get.mockResolvedValue({
      onboarding: {
        mustProvideEmail: true,
        mustVerifyEmail: false,
        mustChangePassword: true,
        onboardingRequired: true,
      },
    });

    await expect(guard.canActivate(createContext('/bookings'))).rejects.toThrow(ForbiddenException);
  });

  it('rejects tokens with role outside canonical enum', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      name: 'Test User',
      role: 'super-admin',
      organizationId: '4f5a8d5b-6fd0-4da0-bf96-c2454c6f8c99',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await expect(guard.canActivate(createContext('/users/profile'))).rejects.toThrow(UnauthorizedException);
    expect(securityObservability.recordAuthFailure).toHaveBeenCalledWith(
      'invalid_token_payload',
      '/users/profile',
      expect.objectContaining({
        requestId: 'req-123',
        authSource: 'bearer',
      }),
    );
  });

  it('records token_not_provided with auth source and bot tagging', async () => {
    const botContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/users/profile',
          headers: {
            'x-request-id': 'req-bot-1',
            origin: 'https://app.example.com',
            'user-agent': 'Read-Aloud Crawler/1.0',
            'x-organization-slug-hint': 'seuze',
            'x-user-apartment-hint': '1201',
            'x-user-block-hint': '2',
            cookie: 'other_cookie=123',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(botContext)).rejects.toThrow(UnauthorizedException);
    expect(securityObservability.recordAuthFailure).toHaveBeenCalledWith(
      'token_not_provided',
      '/users/profile',
      expect.objectContaining({
        requestId: 'req-bot-1',
        origin: 'https://app.example.com',
        authSource: 'none',
        isBotTraffic: true,
        organizationSlugHint: 'seuze',
        apartmentHint: '1201',
        blockHint: '2',
        hasAuthorizationHeader: false,
        hasCookieHeader: true,
        hasSessionCookie: false,
      }),
    );
  });

  it('records auth failure with hasSessionCookie=true and hasCookieHeader=true for cookie-auth requests', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    jwtService.verify.mockImplementation(() => {
      const error = new Error('jwt expired');
      (error as Error & { name: string }).name = 'TokenExpiredError';
      throw error;
    });

    await expect(guard.canActivate(createContext('/users/profile', { useCookie: true }))).rejects.toThrow(UnauthorizedException);
    expect(securityObservability.recordAuthFailure).toHaveBeenCalledWith(
      'invalid_or_expired_token',
      '/users/profile',
      expect.objectContaining({
        hasSessionCookie: true,
        hasCookieHeader: true,
        hasAuthorizationHeader: false,
        authSource: 'cookie',
      }),
    );
  });

  it('records auth failure with hasAuthorizationHeader=true for bearer-auth requests', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    jwtService.verify.mockImplementation(() => {
      const error = new Error('jwt expired');
      (error as Error & { name: string }).name = 'TokenExpiredError';
      throw error;
    });

    await expect(guard.canActivate(createContext('/users/profile', { useCookie: false }))).rejects.toThrow(UnauthorizedException);
    expect(securityObservability.recordAuthFailure).toHaveBeenCalledWith(
      'invalid_or_expired_token',
      '/users/profile',
      expect.objectContaining({
        hasAuthorizationHeader: true,
        hasCookieHeader: false,
        hasSessionCookie: false,
        authSource: 'bearer',
      }),
    );
  });

  it('returns service unavailable when onboarding profile lookup fails', async () => {
    revokedTokenRepository.findOne.mockResolvedValue(null);
    httpService.get.mockRejectedValue(new Error('upstream timeout'));

    await expect(guard.canActivate(createContext('/users/profile'))).rejects.toThrow(ServiceUnavailableException);
  });
});
