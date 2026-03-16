export type ContactMessageCategory = 'suggestion' | 'complaint' | 'question';
export type ContactMessageStatus = 'unread' | 'read' | 'replied';
export type MessageEmailDeliveryStatus = 'not_requested' | 'pending' | 'sent' | 'failed' | 'skipped';
export type ContactEmailDeliveryMode = 'in_app_only' | 'in_app_and_email';
export type ContactEmailReplyToMode = 'resident_email' | 'custom';

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
  content: string;
  sendViaEmail: boolean;
  emailDeliveryStatus: MessageEmailDeliveryStatus;
  emailProviderMessageId?: string | null;
  emailSentAt?: string | null;
  emailLastError?: string | null;
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
