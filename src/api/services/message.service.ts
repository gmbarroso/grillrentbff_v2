import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';
import {
  ContactEmailSettingsDto,
  CreateContactMessageDto,
  MessageDto,
  MessageListResponseDto,
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
      return await this.httpService.post(`${this.apiUrl}/contact`, this.normalizeCreateContactMessage(body), token);
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

  async getResidentMessages(token: string, query: Record<string, unknown>): Promise<MessageListResponseDto> {
    try {
      return await this.httpService.get(`${this.apiUrl}/mine`, query, token);
    } catch (error) {
      this.logger.error(`Error in getResidentMessages: ${error.message}`);
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
      return await this.httpService.put(`${this.apiUrl}/settings/contact-email`, this.normalizeContactEmailSettings(body), token);
    } catch (error) {
      this.logger.error(`Error in updateContactEmailSettings: ${error.message}`);
      throw error;
    }
  }

  private normalizeCreateContactMessage(body: CreateContactMessageDto): CreateContactMessageDto {
    return {
      ...body,
      subject: body.subject.trim(),
      content: body.content.trim(),
      attachments: body.attachments?.map((attachment) => attachment.trim()),
    };
  }

  private normalizeContactEmailSettings(body: UpdateContactEmailSettingsDto): UpdateContactEmailSettingsDto {
    return {
      ...body,
      recipientEmails: body.recipientEmails?.map((email) => email.trim().toLowerCase()),
      fromName: this.normalizeOptionalString(body.fromName),
      fromEmail: this.normalizeOptionalEmail(body.fromEmail),
      customReplyTo: this.normalizeOptionalEmail(body.customReplyTo),
    };
  }

  private normalizeOptionalEmail(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const normalized = value.trim().toLowerCase();
    return normalized || null;
  }

  private normalizeOptionalString(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const normalized = value.trim();
    return normalized || null;
  }
}
