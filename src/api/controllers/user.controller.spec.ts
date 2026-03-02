import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { setAuthCookie, setCsrfCookie } from '../../shared/auth/auth-cookie.util';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';

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
            logout: jest.fn(),
            deleteUser: jest.fn(),
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

    const response = await controller.login(loginUserDto, {} as any);

    expect(response.csrfToken).toMatch(/^[0-9a-f]{64}$/);
    expect(setAuthCookie).toHaveBeenCalledWith(expect.anything(), 'jwt-token', expect.any(Number));
    expect(setCsrfCookie).toHaveBeenCalledWith(expect.anything(), response.csrfToken);
    expect(service.login).toHaveBeenCalledWith(loginUserDto);
  });
});
