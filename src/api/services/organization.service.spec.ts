import { BadRequestException } from '@nestjs/common';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  const httpService = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
  };

  let service: OrganizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrganizationService(httpService as any);
  });

  it('proxies organization creation to API', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.create({ name: 'Condominio Norte' }, 'jwt-token');

    expect(httpService.post).toHaveBeenCalledWith('organizations', { name: 'Condominio Norte' }, 'jwt-token');
  });

  it('normalizes slug before API lookup', async () => {
    httpService.get.mockResolvedValue({ id: 'org-1', slug: 'chacara-sacopa', name: 'Chacara Sacopa' });

    await service.findBySlug(' Chácara Sacopã ');

    expect(httpService.get).toHaveBeenCalledWith('organizations/slug/chacara-sacopa');
  });

  it('rejects slug input that normalizes to empty', async () => {
    await expect(service.findBySlug('---')).rejects.toThrow(BadRequestException);
    expect(httpService.get).not.toHaveBeenCalled();
  });

  it('proxies current organization lookup with auth token', async () => {
    httpService.get.mockResolvedValue({ id: 'org-1' });

    await service.findCurrent('jwt-token');

    expect(httpService.get).toHaveBeenCalledWith('organizations/current', undefined, 'jwt-token');
  });

  it('proxies current organization update with auth token', async () => {
    httpService.put.mockResolvedValue({ id: 'org-1', name: 'Condominio Norte' });

    await service.updateCurrent({ name: 'Condominio Norte' }, 'jwt-token');

    expect(httpService.put).toHaveBeenCalledWith('organizations/current', { name: 'Condominio Norte' }, 'jwt-token');
  });
});
