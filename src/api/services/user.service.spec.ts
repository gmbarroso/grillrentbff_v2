import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService - Global Logout Invalidation', () => {
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
    );

    authService.decodeToken.mockReturnValue(decodedToken);
    revokedTokenRepository.findOne.mockResolvedValue(null);
    revokedTokenRepository.create.mockImplementation((payload) => payload);
    revokedTokenRepository.save.mockResolvedValue(undefined);
    httpService.post.mockResolvedValue({ message: 'Logout successful' });
  });

  it('revokes token in API first, then persists local revocation', async () => {
    await expect(service.logout(token)).resolves.toEqual({ message: 'User logged out successfully' });

    expect(httpService.post).toHaveBeenCalledWith('users/logout', {}, token);
    expect(revokedTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(httpService.post.mock.invocationCallOrder[0]).toBeLessThan(
      revokedTokenRepository.save.mock.invocationCallOrder[0],
    );
  });

  it('continues local revocation sync if API reports token already revoked', async () => {
    httpService.post.mockRejectedValue(new HttpException('Token has been revoked', 401));

    await expect(service.logout(token)).resolves.toEqual({ message: 'User logged out successfully' });
    expect(revokedTokenRepository.save).toHaveBeenCalledTimes(1);
  });

  it('fails logout when API revocation cannot be completed', async () => {
    httpService.post.mockRejectedValue(new HttpException('API Error', 500));

    await expect(service.logout(token)).rejects.toThrow(ServiceUnavailableException);
    expect(revokedTokenRepository.save).not.toHaveBeenCalled();
  });
});
