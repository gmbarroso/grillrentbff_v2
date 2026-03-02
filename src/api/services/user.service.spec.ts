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
});
