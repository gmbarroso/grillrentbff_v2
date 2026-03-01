import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  const httpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  let service: OrganizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrganizationService(httpService as any);
  });

  it('proxies organization creation to API', async () => {
    httpService.post.mockResolvedValue({ message: 'ok' });

    await service.create({ name: 'Condominio Norte' });

    expect(httpService.post).toHaveBeenCalledWith('organizations', { name: 'Condominio Norte' });
  });

  it('normalizes slug before API lookup', async () => {
    httpService.get.mockResolvedValue({ id: 'org-1', slug: 'chacara-sacopa', name: 'Chacara Sacopa' });

    await service.findBySlug(' Chácara Sacopã ');

    expect(httpService.get).toHaveBeenCalledWith('organizations/slug/chacara-sacopa');
  });
});
