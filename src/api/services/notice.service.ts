import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';

@Injectable()
export class NoticeService {
  private readonly logger = new WinstonLoggerService();
  private readonly apiUrl = 'notices';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createNotice(body: any, token: string) {
    try {
      return await this.httpService.post(this.apiUrl, body, token);
    } catch (error) {
      this.logger.error(`Error in createNotice: ${error.message}`);
      throw error;
    }
  }

  async getAllNotices(token: string) {
    try {
      return await this.httpService.get(this.apiUrl, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getAllNotices: ${error.message}`);
      throw error;
    }
  }

  async updateNotice(id: string, body: any, token: string) {
    try {
      return await this.httpService.put(`${this.apiUrl}/${id}`, body, token);
    } catch (error) {
      this.logger.error(`Error in updateNotice: ${error.message}`);
      throw error;
    }
  }

  async deleteNotice(id: string, token: string) {
    try {
      return await this.httpService.delete(`${this.apiUrl}/${id}`, token);
    } catch (error) {
      this.logger.error(`Error in deleteNotice: ${error.message}`);
      throw error;
    }
  }
}
