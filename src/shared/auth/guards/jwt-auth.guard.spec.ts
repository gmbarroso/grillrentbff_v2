import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const BFF_PROTECTED_PATHS = ['/users/profile', '/users', '/resources', '/bookings', '/notices', '/messages'];

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
                cookie: `grillrent_session=${options.token || token}; grillrent_csrf=${
                  options?.csrfCookie || 'csrf-ok'
                }`,
                ...(options?.csrfHeader ? { 'x-csrf-token': options.csrfHeader } : {}),
              }
            : {
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
      expect(securityObservability.recordAuthFailure).toHaveBeenCalledWith('invalid_or_expired_token', path);
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
    );
  });
});
