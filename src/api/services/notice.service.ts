import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';
import { CreateNoticeDto, NoticeDto, NoticeUnreadStateDto } from '../dto/notice.dto';

@Injectable()
export class NoticeService {
  private readonly logger = new WinstonLoggerService();
  private readonly apiUrl = 'notices';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createNotice(body: CreateNoticeDto, token: string): Promise<NoticeDto> {
    try {
      return await this.httpService.post(this.apiUrl, body, token);
    } catch (error) {
      this.logger.error(`Error in createNotice: ${error.message}`);
      throw error;
    }
  }

  async getAllNotices(token: string): Promise<{ data: NoticeDto[]; total: number }> {
    try {
      return await this.httpService.get(this.apiUrl, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getAllNotices: ${error.message}`);
      throw error;
    }
  }

  async getAllNoticesWithQuery(token: string, query: Record<string, unknown>): Promise<{ data: NoticeDto[]; total: number }> {
    try {
      return await this.httpService.get(this.apiUrl, query, token);
    } catch (error) {
      this.logger.error(`Error in getAllNoticesWithQuery: ${error.message}`);
      throw error;
    }
  }

  async getUnreadCount(token: string): Promise<NoticeUnreadStateDto> {
    try {
      return await this.httpService.get(`${this.apiUrl}/unread-count`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getUnreadCount: ${error.message}`);
      throw error;
    }
  }

  async markAsSeen(token: string) {
    try {
      return await this.httpService.post(`${this.apiUrl}/mark-seen`, {}, token);
    } catch (error) {
      this.logger.error(`Error in markAsSeen: ${error.message}`);
      throw error;
    }
  }

  async updateNotice(id: string, body: Partial<CreateNoticeDto>, token: string): Promise<NoticeDto> {
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
