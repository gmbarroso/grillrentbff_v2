import { UserService } from './user.service';

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

  beforeEach(() => {
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
});
