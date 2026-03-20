import * as Joi from '@hapi/joi';

export type ContactMessageCategory = 'suggestion' | 'complaint' | 'question';
export type ContactMessageStatus = 'unread' | 'read' | 'replied';
export type MessageEmailDeliveryStatus = 'not_requested' | 'pending' | 'sent' | 'failed' | 'skipped';
export type MessageReplyOriginRole = 'admin' | 'resident';
export type MessageReplyOriginChannel = 'in_app' | 'email_inbound';
export type ContactEmailDeliveryMode = 'in_app_only' | 'in_app_and_email';
export type ContactEmailReplyToMode = 'resident_email' | 'custom';

export const CreateContactMessageSchema = Joi.object({
  subject: Joi.string().trim().max(255).required(),
  category: Joi.string().valid('suggestion', 'complaint', 'question').required(),
  content: Joi.string().trim().max(10000).required(),
});

export const CreateMessageReplySchema = Joi.object({
  content: Joi.string().trim().max(10000).required(),
  sendViaEmail: Joi.boolean().optional(),
});

export const UpdateContactEmailSettingsSchema = Joi.object({
  deliveryMode: Joi.string().valid('in_app_only', 'in_app_and_email').required(),
  recipientEmails: Joi.array().items(Joi.string().trim().email()).optional(),
  fromName: Joi.string().trim().max(120).allow('', null).optional(),
  fromEmail: Joi.string().trim().email().max(150).allow('', null).optional(),
  replyToMode: Joi.string().valid('resident_email', 'custom').required(),
  customReplyTo: Joi.string().trim().email().max(150).allow('', null).optional(),
  smtpHost: Joi.string().trim().max(255).allow('', null).optional(),
  smtpPort: Joi.number().integer().min(1).max(65535).allow(null).optional(),
  smtpSecure: Joi.boolean().allow(null).optional(),
  smtpUser: Joi.string().trim().max(255).allow('', null).optional(),
  smtpFrom: Joi.string().trim().email().max(150).allow('', null).optional(),
  smtpAppPassword: Joi.string().trim().max(500).allow('', null).optional(),
});

export interface CreateContactMessageDto {
  subject: string;
  category: ContactMessageCategory;
  content: string;
}

export interface CreateMessageReplyDto {
  content: string;
  sendViaEmail?: boolean;
}

export interface MessageReplyDto {
  id: string;
  messageId: string;
  authorUserId: string;
  authorName: string;
  originRole: MessageReplyOriginRole;
  originChannel: MessageReplyOriginChannel;
  content: string;
  sendViaEmail: boolean;
  emailDeliveryStatus: MessageEmailDeliveryStatus;
  emailProviderMessageId?: string | null;
  emailSentAt?: string | null;
  emailLastError?: string | null;
  externalMessageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  senderApartment?: string | null;
  senderBlock?: number | null;
  subject: string;
  category: ContactMessageCategory;
  content: string;
  status: ContactMessageStatus;
  readAt?: string | null;
  adminEmailDeliveryStatus: MessageEmailDeliveryStatus;
  adminEmailProviderMessageId?: string | null;
  adminEmailSentAt?: string | null;
  adminEmailLastError?: string | null;
  organizationId?: string;
  replies?: MessageReplyDto[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageListResponseDto {
  data: MessageDto[];
  total: number;
  page: number;
  lastPage: number;
}

export interface MessageUnreadStateDto {
  unreadCount: number;
  hasUnread: boolean;
}

export interface ContactEmailSettingsDto {
  deliveryMode: ContactEmailDeliveryMode;
  recipientEmails: string[];
  fromName: string | null;
  fromEmail: string | null;
  replyToMode: ContactEmailReplyToMode;
  customReplyTo: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  hasSmtpPassword: boolean;
  canSendEmail: boolean;
  validationErrors: string[];
}

export interface UpdateContactEmailSettingsDto {
  deliveryMode: ContactEmailDeliveryMode;
  recipientEmails?: string[];
  fromName?: string | null;
  fromEmail?: string | null;
  replyToMode: ContactEmailReplyToMode;
  customReplyTo?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpFrom?: string | null;
  smtpAppPassword?: string | null;
}
