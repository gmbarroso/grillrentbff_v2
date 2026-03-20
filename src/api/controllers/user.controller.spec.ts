import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { setAuthCookie, setCsrfCookie } from '../../shared/auth/auth-cookie.util';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

jest.mock('../../shared/auth/auth-cookie.util', () => ({
  setAuthCookie: jest.fn(),
  setCsrfCookie: jest.fn(),
  clearAuthCookie: jest.fn(),
  clearCsrfCookie: jest.fn(),
}));

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            getProfile: jest.fn(),
            getAllUsers: jest.fn(),
            updateProfile: jest.fn(),
            updateUser: jest.fn(),
            logout: jest.fn(),
            deleteUser: jest.fn(),
            setOnboardingEmail: jest.fn(),
            verifyOnboardingEmail: jest.fn(),
            changeOnboardingPassword: jest.fn(),
            completeFirstAccessTour: jest.fn(),
            resetFirstAccessTour: jest.fn(),
            issueRefreshedSessionToken: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService) as jest.Mocked<UserService>;
    jest.clearAllMocks();
  });

  it('returns csrfToken on login and sets auth/csrf cookies', async () => {
    service.login.mockResolvedValue({
      message: 'User logged in successfully',
      access_token: 'jwt-token',
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as any);

    const loginUserDto = {
      organizationSlug: 'chacara-sacopa',
      apartment: '101',
      block: 1,
      password: 'password123',
    } as any;

    const res = {} as any;
    const response = await controller.login(loginUserDto, res);

    expect(response.csrfToken).toMatch(/^[0-9a-f]{64}$/);
    expect(setAuthCookie).toHaveBeenCalledWith(res, 'jwt-token', expect.any(Number));
    expect(setCsrfCookie).toHaveBeenCalledWith(res, response.csrfToken);
    expect(service.login).toHaveBeenCalledWith(loginUserDto);
  });

  it('proxies onboarding email endpoint with authenticated token', async () => {
    service.setOnboardingEmail.mockResolvedValue({ message: 'ok', onboarding: { onboardingRequired: true } } as any);
    service.issueRefreshedSessionToken.mockReturnValue({
      token: 'refreshed-token',
      access_token: 'refreshed-token',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const res = {} as any;
    await expect(
      controller.setOnboardingEmail(
        { user: { token: 'jwt-token' } } as any,
        { email: 'resident@example.com' },
        res,
      ),
    ).resolves.toEqual({
      message: 'ok',
      onboarding: { onboardingRequired: true },
      token: 'refreshed-token',
      access_token: 'refreshed-token',
      exp: expect.any(Number),
    });
    expect(service.issueRefreshedSessionToken).toHaveBeenCalledWith('jwt-token', {
      message: 'ok',
      onboarding: { onboardingRequired: true },
    });
    expect(setAuthCookie).toHaveBeenCalledWith(res, 'refreshed-token', expect.any(Number));
  });

  it('rejects password change through generic profile update', async () => {
    await expect(
      controller.updateProfile(
        { user: { token: 'jwt-token' } } as any,
        { password: 'Newpass123' } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('proxies first-access tour completion endpoint', async () => {
    service.completeFirstAccessTour.mockResolvedValue({
      message: 'First access tour marked as completed',
      tour: { firstAccessTourVersionCompleted: 1 },
    } as any);

    await expect(
      controller.completeFirstAccessTour(
        { user: { token: 'jwt-token' } } as any,
        { version: 1 },
      ),
    ).resolves.toEqual({
      message: 'First access tour marked as completed',
      tour: { firstAccessTourVersionCompleted: 1 },
    });
  });

  it('proxies first-access tour reset endpoint', async () => {
    service.resetFirstAccessTour.mockResolvedValue({
      message: 'First access tour reset successfully',
      tour: { firstAccessTourVersionCompleted: null },
    } as any);

    await expect(
      controller.resetFirstAccessTour(
        { user: { token: 'jwt-token' } } as any,
      ),
    ).resolves.toEqual({
      message: 'First access tour reset successfully',
      tour: { firstAccessTourVersionCompleted: null },
    });
  });
});
