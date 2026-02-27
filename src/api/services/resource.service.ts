import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';

@Injectable()
export class ResourceService {
  private readonly logger = new WinstonLoggerService();
  private readonly apiUrl = 'resources';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createResource(body: any, token: string) {
    try {
      return await this.httpService.post(this.apiUrl, body, token);
    } catch (error) {
      this.logger.error(`Error in createResource: ${error.message}`);
      throw error;
    }
  }

  async getAllResources(token: string) {
    try {
      return await this.httpService.get(this.apiUrl, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getAllResources: ${error.message}`);
      throw error;
    }
  }

  async getResourceById(id: string, token: string) {
    try {
      return await this.httpService.get(`${this.apiUrl}/${id}`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getResourceById: ${error.message}`);
      throw error;
    }
  }

  async updateResource(id: string, body: any, token: string) {
    try {
      return await this.httpService.put(`${this.apiUrl}/${id}`, body, token);
    } catch (error) {
      this.logger.error(`Error in updateResource: ${error.message}`);
      throw error;
    }
  }

  async deleteResource(id: string, token: string) {
    try {
      return await this.httpService.delete(`${this.apiUrl}/${id}`, token);
    } catch (error) {
      this.logger.error(`Error in deleteResource: ${error.message}`);
      throw error;
    }
  }
}
