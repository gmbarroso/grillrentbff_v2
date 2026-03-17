export type NoticeWhatsappDeliveryStatus =
  | 'not_requested'
  | 'pending'
  | 'retrying'
  | 'sent'
  | 'failed'
  | 'skipped';

export interface CreateNoticeDto {
  title: string;
  subtitle?: string;
  content: string;
  sendViaWhatsapp?: boolean;
}

export interface NoticeDto {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  sendViaWhatsapp: boolean;
  whatsappDeliveryStatus: NoticeWhatsappDeliveryStatus;
  whatsappAttemptCount: number;
  whatsappLastAttemptAt?: string;
  whatsappSentAt?: string;
  whatsappProviderMessageId?: string;
  whatsappLastError?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeUnreadStateDto {
  unreadCount: number;
  hasUnread: boolean;
  lastSeenNoticesAt: string | null;
}
