import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface PostalAddress {
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  stateCode: string;
}
@Injectable()
export class PostalCodeService {
  private readonly cache = new Map<
    string,
    { value: PostalAddress; expiresAt: number }
  >();
  async lookup(postalCode: string): Promise<PostalAddress> {
    if (!/^\d{8}$/.test(postalCode))
      throw new BadRequestException({
        code: 'POSTAL_CODE_INVALID',
        message: 'Informe um CEP com 8 dígitos.',
      });
    const cached = this.cache.get(postalCode);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${postalCode}/json/`,
        { signal: AbortSignal.timeout(5000), redirect: 'error' },
      );
      if (!response.ok) throw new Error('Postal provider unavailable');
      const data = (await response.json()) as Record<string, unknown>;
      if (data.erro)
        throw new NotFoundException({
          code: 'POSTAL_CODE_NOT_FOUND',
          message:
            'CEP não encontrado. Confira o CEP e digite novamente.',
        });
      if (
        typeof data.cep !== 'string' ||
        data.cep.replace(/\D/g, '') !== postalCode ||
        typeof data.localidade !== 'string' ||
        typeof data.uf !== 'string' ||
        !/^[A-Z]{2}$/.test(data.uf)
      )
        throw new Error('Invalid postal provider response');
      const value: PostalAddress = {
        postalCode,
        street: typeof data.logradouro === 'string' ? data.logradouro : '',
        neighborhood: typeof data.bairro === 'string' ? data.bairro : '',
        city: data.localidade,
        stateCode: data.uf,
      };
      if (this.cache.size >= 500)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(postalCode, { value, expiresAt: Date.now() + 5 * 60_000 });
      return value;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException({
        code: 'POSTAL_CODE_UNAVAILABLE',
        message:
          'Não foi possível consultar o CEP agora. Tente novamente em instantes.',
      });
    }
  }
}
