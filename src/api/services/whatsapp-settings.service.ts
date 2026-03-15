import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';
import {
  TestWhatsappConnectionDto,
  UpdateWhatsappSettingsDto,
  UpsertWhatsappGroupBindingDto,
  WhatsappGroupBindingDto,
  WhatsappGroupOptionDto,
  WhatsappSettingsViewDto,
} from '../dto/whatsapp-settings.dto';

@Injectable()
export class WhatsappSettingsService {
  private readonly logger = new WinstonLoggerService();
  private readonly apiUrl = 'whatsapp/settings';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async getSettings(token: string): Promise<WhatsappSettingsViewDto> {
    try {
      return await this.httpService.get(this.apiUrl, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getSettings: ${error.message}`);
      throw error;
    }
  }

  async updateSettings(body: UpdateWhatsappSettingsDto, token: string): Promise<WhatsappSettingsViewDto> {
    try {
      return await this.httpService.put(this.apiUrl, body, token);
    } catch (error) {
      this.logger.error(`Error in updateSettings: ${error.message}`);
      throw error;
    }
  }

  async bootstrapLegacy(token: string): Promise<WhatsappSettingsViewDto> {
    try {
      return await this.httpService.post(`${this.apiUrl}/bootstrap-legacy`, {}, token);
    } catch (error) {
      this.logger.error(`Error in bootstrapLegacy: ${error.message}`);
      throw error;
    }
  }

  async testConnection(body: TestWhatsappConnectionDto, token: string): Promise<{ ok: boolean; statusCode: number | null }> {
    try {
      return await this.httpService.post(`${this.apiUrl}/test-connection`, body, token);
    } catch (error) {
      this.logger.error(`Error in testConnection: ${error.message}`);
      throw error;
    }
  }

  async getGroups(token: string): Promise<WhatsappGroupOptionDto[]> {
    try {
      return await this.httpService.get(`${this.apiUrl}/groups`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getGroups: ${error.message}`);
      throw error;
    }
  }

  async getBindings(token: string): Promise<WhatsappGroupBindingDto[]> {
    try {
      return await this.httpService.get(`${this.apiUrl}/bindings`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getBindings: ${error.message}`);
      throw error;
    }
  }

  async upsertBinding(feature: string, body: UpsertWhatsappGroupBindingDto, token: string): Promise<WhatsappGroupBindingDto> {
    try {
      return await this.httpService.put(`${this.apiUrl}/bindings/${feature}`, body, token);
    } catch (error) {
      this.logger.error(`Error in upsertBinding: ${error.message}`);
      throw error;
    }
  }
}
