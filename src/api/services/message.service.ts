import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';
import {
  ContactEmailSettingsDto,
  CreateContactMessageDto,
  CreateMessageReplyDto,
  MessageDto,
  MessageListResponseDto,
  MessageReplyDto,
  MessageUnreadStateDto,
  UpdateContactEmailSettingsDto,
} from '../dto/message.dto';

@Injectable()
export class MessageService {
  private readonly logger = new WinstonLoggerService();
  private readonly apiUrl = 'messages';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createContactMessage(body: CreateContactMessageDto, token: string): Promise<MessageDto> {
    try {
      return await this.httpService.post(`${this.apiUrl}/contact`, body, token);
    } catch (error) {
      this.logger.error(`Error in createContactMessage: ${error.message}`);
      throw error;
    }
  }

  async getAdminMessages(token: string, query: Record<string, unknown>): Promise<MessageListResponseDto> {
    try {
      return await this.httpService.get(`${this.apiUrl}/admin`, query, token);
    } catch (error) {
      this.logger.error(`Error in getAdminMessages: ${error.message}`);
      throw error;
    }
  }

  async getUnreadCount(token: string): Promise<MessageUnreadStateDto> {
    try {
      return await this.httpService.get(`${this.apiUrl}/unread-count`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getUnreadCount: ${error.message}`);
      throw error;
    }
  }

  async markAsRead(id: string, token: string): Promise<MessageDto> {
    try {
      return await this.httpService.post(`${this.apiUrl}/${id}/mark-read`, {}, token);
    } catch (error) {
      this.logger.error(`Error in markAsRead: ${error.message}`);
      throw error;
    }
  }

  async replyAsAdmin(id: string, body: CreateMessageReplyDto, token: string): Promise<MessageReplyDto> {
    try {
      return await this.httpService.post(`${this.apiUrl}/${id}/replies`, body, token);
    } catch (error) {
      this.logger.error(`Error in replyAsAdmin: ${error.message}`);
      throw error;
    }
  }

  async deleteMessage(id: string, token: string): Promise<{ success: true }> {
    try {
      return await this.httpService.delete(`${this.apiUrl}/${id}`, token);
    } catch (error) {
      this.logger.error(`Error in deleteMessage: ${error.message}`);
      throw error;
    }
  }

  async getContactEmailSettings(token: string): Promise<ContactEmailSettingsDto> {
    try {
      return await this.httpService.get(`${this.apiUrl}/settings/contact-email`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getContactEmailSettings: ${error.message}`);
      throw error;
    }
  }

  async updateContactEmailSettings(
    body: UpdateContactEmailSettingsDto,
    token: string,
  ): Promise<ContactEmailSettingsDto> {
    try {
      return await this.httpService.put(`${this.apiUrl}/settings/contact-email`, body, token);
    } catch (error) {
      this.logger.error(`Error in updateContactEmailSettings: ${error.message}`);
      throw error;
    }
  }
}
