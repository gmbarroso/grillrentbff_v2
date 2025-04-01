import { Injectable, Logger } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger(ResourceService.name);
  private readonly apiUrl = 'resources';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createResource(body: any, token: string) {
    this.logger.log('Calling createResource');
    this.logger.debug(`Body: ${JSON.stringify(body)}`);
    return this.httpService.post(this.apiUrl, body, token);
  }

  async getAllResources(token: string) {
    this.logger.log('Calling getAllResources');
    return this.httpService.get(this.apiUrl, undefined, token);
  }

  async getResource(id: string, token: string) {
    this.logger.log(`Calling getResource with ID: ${id}`);
    return this.httpService.get(`${this.apiUrl}/${id}`, undefined, token);
  }

  async updateResource(id: string, body: any, token: string) {
    this.logger.log(`Calling updateResource with ID: ${id}`);
    this.logger.debug(`Body: ${JSON.stringify(body)}`);
    return this.httpService.put(`${this.apiUrl}/${id}`, body, token);
  }

  async deleteResource(id: string, token: string) {
    this.logger.log(`Calling deleteResource with ID: ${id}`);
    return this.httpService.delete(`${this.apiUrl}/${id}`, token);
  }
}
