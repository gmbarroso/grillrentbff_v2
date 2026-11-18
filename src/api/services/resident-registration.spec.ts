import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserService } from './user.service';
import { UserController } from '../controllers/user.controller';
import { UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';

describe('resident registration tenant and trial boundaries', () => {
  const userRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const http = { get: jest.fn() };
  const organization = { findBySlug: jest.fn() };
  const auth = { hashPassword: jest.fn(async () => 'private-password-hash') };
  const service = new UserService(
    userRepository as any,
    {} as any,
    auth as any,
    http as any,
    organization as any,
  );
  const body = {
    organizationSlug: 'test',
    name: 'Resident',
    email: 'resident@example.com',
    password: 'Teste123!',
    apartment: '101',
    block: 1,
    role: UserRole.RESIDENT,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    organization.findBySlug.mockResolvedValue({ id: 'org-1' });
  });
  it('requires JWT for the legacy endpoint', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, UserController.prototype.register),
    ).toContain(JwtAuthGuard);
  });
  it('rejects another organization and expired trials before writing users', async () => {
    await expect(service.register(body, 'jwt', 'other-org')).rejects.toThrow(
      ForbiddenException,
    );
    http.get.mockResolvedValue({ subscriptionStatus: 'trial_expired' });
    await expect(service.register(body, 'jwt', 'org-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });
  it.each([
    { subscriptionStatus: 'suspended', canWrite: false },
    { subscriptionStatus: 'past_due', canWrite: false },
  ])(
    'blocks resident creation when paid access is unavailable: %j',
    async (subscription) => {
      http.get.mockResolvedValue(subscription);
      await expect(service.register(body, 'jwt', 'org-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    },
  );
  it('preserves resident creation for legacy condos and never returns the password hash', async () => {
    http.get.mockResolvedValue({ subscriptionStatus: 'legacy' });
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockImplementation((payload) => ({
      id: 'resident-1',
      ...payload,
    }));
    userRepository.save.mockImplementation(async (user) => user);
    const result = await service.register(body, 'jwt', 'org-1');
    expect(result.user.organizationId).toBe('org-1');
    expect(result.user.role).toBe('resident');
    expect(JSON.stringify(result)).not.toContain('private-password-hash');
    expect(result.user).not.toHaveProperty('password');
  });
});
