import { HttpServiceWrapper } from './http.service';

describe('HttpServiceWrapper', () => {
  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'API_URL') return 'http://api.internal';
      if (key === 'INTERNAL_SERVICE_TOKEN') return 'internal-secret';
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    }),
  };
  const requestContextService = {
    getRequestId: jest.fn(() => 'req-123'),
  };

  let service: HttpServiceWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HttpServiceWrapper(httpService as any, configService as any, requestContextService as any);
  });

  it('adds auth, internal trust, and request id headers on GET', async () => {
    httpService.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { ok: true } }),
    });

    await service.get('users/profile', undefined, 'jwt-token');

    expect(httpService.get).toHaveBeenCalledWith('http://api.internal/users/profile', {
      params: undefined,
      headers: {
        Authorization: 'Bearer jwt-token',
        'x-internal-service-token': 'internal-secret',
        'x-request-id': 'req-123',
      },
    });
  });

  it('sends internal trust and request id headers on anonymous GET', async () => {
    httpService.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { ok: true } }),
    });

    await service.get('bookings/availability/1', { start: 'x' });

    expect(httpService.get).toHaveBeenCalledWith('http://api.internal/bookings/availability/1', {
      params: { start: 'x' },
      headers: {
        'x-internal-service-token': 'internal-secret',
        'x-request-id': 'req-123',
      },
    });
  });

  it('does not require INTERNAL_SERVICE_TOKEN when NODE_ENV is unset', () => {
    const localConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'API_URL') return 'http://api.internal';
        if (key === 'INTERNAL_SERVICE_TOKEN') return undefined;
        if (key === 'NODE_ENV') return undefined;
        return undefined;
      }),
    };

    expect(
      () => new HttpServiceWrapper(httpService as any, localConfigService as any, requestContextService as any),
    ).not.toThrow();
  });
});
