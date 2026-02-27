import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const BFF_PROTECTED_PATHS = ['/users/profile', '/users', '/resources', '/bookings', '/notices'];

describe('BFF JwtAuthGuard - Phase 2 revocation enforcement', () => {
  const token = 'phase2-token';
  const jwtService = {
    verify: jest.fn(),
  };
  const revokedTokenRepository = {
    findOne: jest.fn(),
  };

  let guard: JwtAuthGuard;

  const createContext = (path: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          url: path,
          headers: { authorization: `Bearer ${token}` },
        }),
      }),
    } as unknown as ExecutionContext);

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(jwtService as any, revokedTokenRepository as any);
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      name: 'Test User',
      role: 'resident',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  it.each(BFF_PROTECTED_PATHS)('allows valid token before logout on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(createContext(path))).resolves.toBe(true);
  });

  it.each(BFF_PROTECTED_PATHS)('denies token after logout on %s', async (path) => {
    revokedTokenRepository.findOne.mockResolvedValue({ id: 'revoked-entry' });

    await expect(guard.canActivate(createContext(path))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(createContext(path))).rejects.toThrow('Token has been revoked');
  });
});
