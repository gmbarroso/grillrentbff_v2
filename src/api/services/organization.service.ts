import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { normalizeSlug } from '../../shared/slug/normalize-slug.util';

@Injectable()
export class OrganizationService {
  constructor(private readonly httpService: HttpServiceWrapper) {}

  async create(createOrganizationDto: CreateOrganizationDto, token: string) {
    return this.httpService.post('organizations', createOrganizationDto, token);
  }

  async findBySlug(slug: string): Promise<{ id: string; slug: string; name: string }> {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) {
      throw new BadRequestException('Invalid organization slug');
    }
    return this.httpService.get(`organizations/slug/${normalizedSlug}`);
  }
}
