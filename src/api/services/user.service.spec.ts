import { UserService } from './user.service';
import { BadRequestException } from '@nestjs/common';

describe('UserService - BFF-owned logout revocation', () => {
  const token = 'phase2-token';
  const decodedToken = { exp: Math.floor(Date.now() / 1000) + 3600 };

  const userRepository = {};
  const revokedTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const authService = {
    decodeToken: jest.fn(),
    generateToken: jest.fn(),
  };
  const organizationService = {
    findBySlug: jest.fn(),
  };
  const httpService = {
    post: jest.fn(),
  };

  let service: UserService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    service = new UserService(
      userRepository as any,
      revokedTokenRepository as any,
      authService as any,
      httpService as any,
      organizationService as any,
    );

    authService.decodeToken.mockReturnValue({ ...decodedToken, organizationId: 'org-1' });
    revokedTokenRepository.findOne.mockResolvedValue(null);
    revokedTokenRepository.create.mockImplementation((payload) => payload);
    revokedTokenRepository.save.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('persists local revocation and does not call API logout endpoint', async () => {
    await expect(service.logout(token)).resolves.toEqual({ message: 'User logged out successfully' });

    expect(revokedTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('returns success when token is already revoked in BFF', async () => {
    revokedTokenRepository.findOne.mockResolvedValue({ token });
    await expect(service.logout(token)).resolves.toEqual({ message: 'User logged out successfully' });
    expect(revokedTokenRepository.save).not.toHaveBeenCalled();
  });

  it('merges nested onboarding flags and returns refreshed token metadata', () => {
    const currentToken = 'current-token';
    const refreshedToken = 'refreshed-token';

    authService.decodeToken.mockImplementation((value: string) => {
      if (value === currentToken) {
        return {
          sub: 'user-1',
          name: 'Resident',
          role: 'RESIDENT',
          organizationId: 'org-1',
          onboarding: {
            mustProvideEmail: false,
            mustVerifyEmail: true,
            mustChangePassword: false,
            onboardingRequired: true,
          },
        };
      }

      if (value === refreshedToken) {
        return { exp: 1234567890 };
      }

      return null;
    });
    authService.generateToken.mockReturnValue(refreshedToken);

    const response = service.issueRefreshedSessionToken(currentToken, {
      onboarding: { mustProvideEmail: true },
    });

    expect(authService.generateToken).toHaveBeenCalledWith({
      id: 'user-1',
      name: 'Resident',
      role: 'RESIDENT',
      organizationId: 'org-1',
      onboarding: {
        mustProvideEmail: true,
        mustVerifyEmail: true,
        mustChangePassword: false,
        onboardingRequired: true,
      },
    });
    expect(response).toEqual({
      token: refreshedToken,
      access_token: refreshedToken,
      exp: 1234567890,
    });
  });

  it('merges flat onboarding flags when onboarding object is absent in response', () => {
    const currentToken = 'current-token';
    const refreshedToken = 'refreshed-token';

    authService.decodeToken.mockImplementation((value: string) => {
      if (value === currentToken) {
        return {
          sub: 'user-1',
          name: 'Resident',
          role: 'RESIDENT',
          organizationId: 'org-1',
          onboarding: {
            mustProvideEmail: false,
            mustVerifyEmail: false,
            mustChangePassword: false,
            onboardingRequired: false,
          },
        };
      }

      if (value === refreshedToken) {
        return { exp: 1234567890 };
      }

      return null;
    });
    authService.generateToken.mockReturnValue(refreshedToken);

    service.issueRefreshedSessionToken(currentToken, {
      mustVerifyEmail: true,
      onboardingRequired: true,
    });

    expect(authService.generateToken).toHaveBeenCalledWith({
      id: 'user-1',
      name: 'Resident',
      role: 'RESIDENT',
      organizationId: 'org-1',
      onboarding: {
        mustProvideEmail: false,
        mustVerifyEmail: true,
        mustChangePassword: false,
        onboardingRequired: true,
      },
    });
  });

  it('normalizes forgot-password request payload before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.requestForgotPassword({
      organizationSlug: '  Chacara-Sacopa ',
      email: '  Resident@Example.COM ',
    });

    expect(httpService.post).toHaveBeenCalledWith('users/forgot-password/request', {
      organizationSlug: 'chacara-sacopa',
      email: 'resident@example.com',
      redirectUrl: undefined,
    });
  });

  it('normalizes forgot-password request redirect url before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });
    process.env.AUTH_REDIRECT_ALLOWED_ORIGINS = 'https://seuze.tech';

    await service.requestForgotPassword({
      organizationSlug: 'chacara-sacopa',
      email: 'resident@example.com',
      redirectUrl: '  https://seuze.tech/reset-password?token={{token}}  ',
    });

    expect(httpService.post).toHaveBeenCalledWith('users/forgot-password/request', {
      organizationSlug: 'chacara-sacopa',
      email: 'resident@example.com',
      redirectUrl: 'https://seuze.tech/reset-password?token={{token}}',
    });
  });

  it('rejects redirect urls with disallowed origin', async () => {
    process.env.AUTH_REDIRECT_ALLOWED_ORIGINS = 'https://seuze.tech';

    await expect(service.requestForgotPassword({
      organizationSlug: 'chacara-sacopa',
      email: 'resident@example.com',
      redirectUrl: 'https://evil.example/reset?token=1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects redirect urls with invalid protocol', async () => {
    await expect(service.requestForgotPassword({
      organizationSlug: 'chacara-sacopa',
      email: 'resident@example.com',
      redirectUrl: 'javascript:alert(1)',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects redirect url when allowlist env is configured but invalid', async () => {
    process.env.AUTH_REDIRECT_ALLOWED_ORIGINS = 'not-a-valid-origin';

    await expect(service.requestForgotPassword({
      organizationSlug: 'chacara-sacopa',
      email: 'resident@example.com',
      redirectUrl: 'https://seuze.tech/reset-password?token=1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes forgot-password confirmation payload before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.confirmForgotPassword({
      organizationSlug: '  Chacara-Sacopa ',
      token: '  abc123token  ',
      newPassword: 'SomeStrongPass#1',
    });

    expect(httpService.post).toHaveBeenCalledWith('users/forgot-password/confirm', {
      organizationSlug: 'chacara-sacopa',
      token: 'abc123token',
      newPassword: 'SomeStrongPass#1',
    });
  });

  it('normalizes onboarding email payload before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });
    process.env.AUTH_REDIRECT_ALLOWED_ORIGINS = 'https://seuze.tech';

    await service.setOnboardingEmail(
      {
        email: '  Resident@Example.COM ',
        redirectUrl: '  https://seuze.tech/onboarding/verify-email?token={{token}}  ',
      },
      'jwt-token',
    );

    expect(httpService.post).toHaveBeenCalledWith('users/onboarding/email', {
      email: 'resident@example.com',
      redirectUrl: 'https://seuze.tech/onboarding/verify-email?token={{token}}',
    }, 'jwt-token');
  });

  it('normalizes onboarding verify token payload before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.verifyOnboardingEmail(
      {
        token: '  verify-token  ',
      },
      'jwt-token',
    );

    expect(httpService.post).toHaveBeenCalledWith('users/onboarding/verify', {
      token: 'verify-token',
    }, 'jwt-token');
  });

  it('normalizes request-email-change payload before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.requestEmailChange(
      {
        email: '  NewEmail@Example.COM ',
        redirectUrl: '  https://seuze.tech/profile/verify-email?token={{token}}  ',
      },
      'jwt-token',
    );

    expect(httpService.post).toHaveBeenCalledWith('users/email/change/request', {
      email: 'newemail@example.com',
      redirectUrl: 'https://seuze.tech/profile/verify-email?token={{token}}',
    }, 'jwt-token');
  });

  it('normalizes confirm-email-change payload before proxying', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.confirmEmailChange(
      {
        token: '  email-change-token  ',
      },
      'jwt-token',
    );

    expect(httpService.post).toHaveBeenCalledWith('users/email/change/confirm', {
      token: 'email-change-token',
    }, 'jwt-token');
  });
});
