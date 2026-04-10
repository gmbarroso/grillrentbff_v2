import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { WhatsappSettingsController } from './whatsapp-settings.controller';
import { WhatsappSettingsService } from '../services/whatsapp-settings.service';

describe('WhatsappSettingsController', () => {
  let controller: WhatsappSettingsController;
  let service: jest.Mocked<WhatsappSettingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappSettingsController],
      providers: [
        {
          provide: WhatsappSettingsService,
          useValue: {
            getSettings: jest.fn(),
            bootstrapLegacy: jest.fn(),
            updateSettings: jest.fn(),
            testConnection: jest.fn(),
            startOnboarding: jest.fn(),
            getOnboardingStatus: jest.fn(),
            refreshOnboardingQr: jest.fn(),
            disconnectOnboarding: jest.fn(),
            getGroups: jest.fn(),
            getBindings: jest.fn(),
            upsertBinding: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WhatsappSettingsController>(WhatsappSettingsController);
    service = module.get(WhatsappSettingsService) as jest.Mocked<WhatsappSettingsService>;
  });

  it('proxies onboarding start for admins', async () => {
    service.startOnboarding.mockResolvedValue({ state: 'qr_ready' } as any);

    await expect(controller.startOnboarding({ user: { role: UserRole.ADMIN, token: 'jwt-token' } } as any)).resolves.toEqual({
      state: 'qr_ready',
    });
    expect(service.startOnboarding).toHaveBeenCalledWith('jwt-token');
  });

  it('proxies onboarding status for admins', async () => {
    service.getOnboardingStatus.mockResolvedValue({ state: 'connecting' } as any);

    await expect(
      controller.getOnboardingStatus({ forceQr: true }, { user: { role: UserRole.ADMIN, token: 'jwt-token' } } as any),
    ).resolves.toEqual({ state: 'connecting' });
    expect(service.getOnboardingStatus).toHaveBeenCalledWith({ forceQr: true }, 'jwt-token');
  });

  it('proxies onboarding refresh qr for admins', async () => {
    service.refreshOnboardingQr.mockResolvedValue({ state: 'qr_ready' } as any);

    await expect(controller.refreshOnboardingQr({ user: { role: UserRole.ADMIN, token: 'jwt-token' } } as any)).resolves.toEqual({
      state: 'qr_ready',
    });
    expect(service.refreshOnboardingQr).toHaveBeenCalledWith('jwt-token');
  });

  it('proxies onboarding disconnect for admins', async () => {
    service.disconnectOnboarding.mockResolvedValue({ ok: true });

    await expect(
      controller.disconnectOnboarding({ user: { role: UserRole.ADMIN, token: 'jwt-token' } } as any),
    ).resolves.toEqual({ ok: true });
    expect(service.disconnectOnboarding).toHaveBeenCalledWith('jwt-token');
  });

  it('blocks onboarding mutations for non-admin users', async () => {
    await expect(
      controller.startOnboarding({ user: { role: UserRole.RESIDENT, token: 'jwt-token' } } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(service.startOnboarding).not.toHaveBeenCalled();
  });
});
