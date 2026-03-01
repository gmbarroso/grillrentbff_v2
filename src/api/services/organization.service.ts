import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { HttpServiceWrapper } from '../../shared/http/http.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly httpService: HttpServiceWrapper) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    return this.httpService.post('organizations', createOrganizationDto);
  }

  async findBySlug(slug: string): Promise<{ id: string; slug: string; name: string }> {
    const normalizedSlug = slug
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
    return this.httpService.get(`organizations/slug/${normalizedSlug}`);
  }
}
