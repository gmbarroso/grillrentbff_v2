import { WhatsappSettingsService } from './whatsapp-settings.service';

describe('WhatsappSettingsService', () => {
  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };

  let service: WhatsappSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsappSettingsService(httpService as any);
  });

  it('proxies start onboarding to API', async () => {
    httpService.post.mockResolvedValue({ state: 'qr_ready' });

    await service.startOnboarding('jwt-token');

    expect(httpService.post).toHaveBeenCalledWith('whatsapp/settings/onboarding/start', {}, 'jwt-token');
  });

  it('proxies onboarding status query to API', async () => {
    httpService.get.mockResolvedValue({ state: 'connecting' });

    await service.getOnboardingStatus({ forceQr: true }, 'jwt-token');

    expect(httpService.get).toHaveBeenCalledWith(
      'whatsapp/settings/onboarding/status',
      { forceQr: true },
      'jwt-token',
    );
  });

  it('proxies refresh qr to API', async () => {
    httpService.post.mockResolvedValue({ state: 'qr_ready' });

    await service.refreshOnboardingQr('jwt-token');

    expect(httpService.post).toHaveBeenCalledWith('whatsapp/settings/onboarding/refresh-qr', {}, 'jwt-token');
  });

  it('proxies onboarding disconnect to API', async () => {
    httpService.post.mockResolvedValue({ ok: true });

    await service.disconnectOnboarding('jwt-token');

    expect(httpService.post).toHaveBeenCalledWith('whatsapp/settings/onboarding/disconnect', {}, 'jwt-token');
  });
});
