import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PostalCodeService } from './postal-code.service';

describe('CEP lookup via ViaCEP', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let service: PostalCodeService;
  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new PostalCodeService();
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });
  it('rejects invalid input before accessing the provider', async () => {
    for (const cep of ['123', '../01001000', '01001-000', 'abcdefgh'])
      await expect(service.lookup(cep)).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('returns normalized fields and caches repeated lookups', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });
    expect(await service.lookup('01001000')).toEqual({
      postalCode: '01001000',
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      stateCode: 'SP',
    });
    await service.lookup('01001000');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://viacep.com.br/ws/01001000/json/',
    );
  });
  it('returns a not-found response for valid but unknown CEPs', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    });
    await expect(service.lookup('99999999')).rejects.toThrow(NotFoundException);
  });
  it('supports general municipal CEPs without a street', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        cep: '01001-000',
        logradouro: '',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });
    expect((await service.lookup('01001000')).street).toBe('');
  });
  it('handles provider timeouts and malformed responses without returning incorrect addresses', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.lookup('01001000')).rejects.toThrow(
      ServiceUnavailableException,
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        cep: '99999-999',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });
    await expect(service.lookup('01001000')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
