import { UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';

describe('Phase 5 - BFF auth regression flow', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tokenByUserId = new Map<string, string>();
  const revokedTokens = new Set<string>();
  const userRecord = {
    id: 'user-1',
    organizationId: '9dd02335-74fa-487b-99f3-f3e6f9fba2af',
    name: 'Resident User',
    email: 'resident@example.com',
    password: 'hashed-password',
    apartment: '101',
    block: 1,
    role: UserRole.RESIDENT,
  };

  const organizationService = {
    findBySlug: jest.fn(async (slug: string) => {
      if (slug === 'chacara-sacopa') {
        return {
          id: '9dd02335-74fa-487b-99f3-f3e6f9fba2af',
          slug: 'chacara-sacopa',
          name: 'Chacara Sacopa',
        };
      }
      return null;
    }),
  };

  const userRepository = {
    findOne: jest.fn(async ({ where }: any) => {
      if (
        where?.apartment === userRecord.apartment
        && where?.block === userRecord.block
        && where?.organizationId === userRecord.organizationId
      ) {
        return userRecord;
      }
      return null;
    }),
  };

  const revokedTokenRepository = {
    findOne: jest.fn(async ({ where }: any) => {
      if (where?.token && revokedTokens.has(where.token)) {
        return { token: where.token };
      }
      return null;
    }),
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => {
      revokedTokens.add(payload.token);
      return payload;
    }),
  };

  const authService = {
    comparePasswords: jest.fn(async (plain: string, hashed: string) => plain === 'password123' && hashed === userRecord.password),
    generateToken: jest.fn((payload: { id: string }) => {
      const issuedToken = `phase5-token-${payload.id}`;
      tokenByUserId.set(payload.id, issuedToken);
      return issuedToken;
    }),
    decodeToken: jest.fn((token: string) => {
      if (!token.startsWith('phase5-token-')) {
        return null;
      }
      return { exp: nowSeconds + 3600, organizationId: userRecord.organizationId };
    }),
  };

  const httpService = {
    post: jest.fn(async () => ({ message: 'Logout successful' })),
    get: jest.fn(async () => ({
      onboarding: {
        mustProvideEmail: false,
        mustVerifyEmail: false,
        mustChangePassword: false,
        onboardingRequired: false,
      },
    })),
  };

  const jwtService = {
    verify: jest.fn((token: string) => {
      if (token.startsWith('phase5-token-')) {
        return {
          sub: 'user-1',
          name: 'Resident User',
          role: UserRole.RESIDENT,
          organizationId: userRecord.organizationId,
          exp: nowSeconds + 3600,
        };
      }
      throw new Error('invalid token');
    }),
  };
  const securityObservability = {
    recordAuthFailure: jest.fn(),
    recordCsrfRejection: jest.fn(),
    recordRevocationDenial: jest.fn(),
  };
  const requestContextService = {
    setOrganizationId: jest.fn(),
    getRequestId: jest.fn(() => 'req-phase5'),
  };

  const createContext = (token: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: `Bearer ${token}` },
          method: 'GET',
          url: '/users/profile',
        }),
      }),
    } as any);

  let userService: UserService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    revokedTokens.clear();
    tokenByUserId.clear();
    jest.clearAllMocks();

    userService = new UserService(
      userRepository as any,
      revokedTokenRepository as any,
      authService as any,
      httpService as any,
      organizationService as any,
    );

    guard = new JwtAuthGuard(
      jwtService as any,
      revokedTokenRepository as any,
      securityObservability as any,
      requestContextService as any,
      httpService as any,
    );
  });

  it('preserves login -> protected -> logout -> denied flow and token aliases', async () => {
    const loginResult = await userService.login({
      organizationSlug: 'chacara-sacopa',
      apartment: '101',
      block: 1,
      password: 'password123',
    });

    expect(loginResult).toEqual({
      message: 'User logged in successfully',
      token: 'phase5-token-user-1',
      access_token: 'phase5-token-user-1',
      exp: nowSeconds + 3600,
      mustProvideEmail: false,
      mustVerifyEmail: true,
      mustChangePassword: false,
      onboardingRequired: true,
    });

    await expect(guard.canActivate(createContext(loginResult.access_token))).resolves.toBe(true);

    await expect(userService.logout(loginResult.access_token)).resolves.toEqual({
      message: 'User logged out successfully',
    });

    await expect(guard.canActivate(createContext(loginResult.access_token))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(createContext(loginResult.access_token))).rejects.toThrow('Token has been revoked');
  });

  it('marks onboarding as required on login when resident has pending email verification', async () => {
    (userRepository.findOne as jest.Mock).mockImplementationOnce(async ({ where }: any) => {
      if (
        where?.apartment === userRecord.apartment
        && where?.block === userRecord.block
        && where?.organizationId === userRecord.organizationId
      ) {
        return {
          ...userRecord,
          emailVerifiedAt: new Date('2026-03-20T10:00:00.000Z'),
          pendingEmail: 'new-email@example.com',
          mustChangePassword: false,
        };
      }
      return null;
    });

    const loginResult = await userService.login({
      organizationSlug: 'chacara-sacopa',
      apartment: '101',
      block: 1,
      password: 'password123',
    });

    expect(loginResult.mustProvideEmail).toBe(false);
    expect(loginResult.mustVerifyEmail).toBe(true);
    expect(loginResult.mustChangePassword).toBe(false);
    expect(loginResult.onboardingRequired).toBe(true);
  });
});
