export interface UpdateWhatsappSettingsDto {
  baseUrl: string;
  instanceName: string;
  apiKey?: string;
  whatsappNumber?: string | null;
  autoSendNotices?: boolean;
}

export interface TestWhatsappConnectionDto {
  baseUrl?: string;
  instanceName?: string;
  apiKey?: string;
}

export interface UpsertWhatsappGroupBindingDto {
  groupJid: string;
  groupName?: string | null;
}

export interface WhatsappGroupOptionDto {
  groupJid: string;
  groupName: string;
}

export interface WhatsappGroupBindingDto {
  feature: string;
  groupJid: string;
  groupName: string | null;
}

export interface WhatsappSettingsViewDto {
  provider: string;
  status: 'connected' | 'disconnected';
  baseUrl: string;
  instanceName: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  whatsappNumber: string | null;
  autoSendNotices: boolean;
  noticeGroupJid: string | null;
  noticeGroupName: string | null;
}
