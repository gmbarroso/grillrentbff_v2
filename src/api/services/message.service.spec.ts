import { MessageService } from './message.service';

describe('MessageService', () => {
  const httpService = {
    post: jest.fn(),
    put: jest.fn(),
  };

  let service: MessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessageService(httpService as any);
  });

  it('normalizes contact message payload before proxying', async () => {
    httpService.post.mockResolvedValue({ id: 'message-1' });

    await service.createContactMessage(
      {
        subject: '  Sugestao para portaria ',
        category: 'suggestion',
        content: '  Texto com espacos extras  ',
        attachments: ['  data:image/png;base64,AAAA  '],
      },
      'jwt-token',
    );

    expect(httpService.post).toHaveBeenCalledWith('messages/contact', {
      subject: 'Sugestao para portaria',
      category: 'suggestion',
      content: 'Texto com espacos extras',
      attachments: ['data:image/png;base64,AAAA'],
    }, 'jwt-token');
  });

  it('normalizes contact email settings payload before proxying', async () => {
    httpService.put.mockResolvedValue({ canSendEmail: true });

    await service.updateContactEmailSettings(
      {
        deliveryMode: 'in_app_and_email',
        replyToMode: 'custom',
        recipientEmails: ['  Syndic@Condo.com ', ' Support@Condo.com  '],
        fromName: '  Seu.Ze  ',
        fromEmail: '  NO-REPLY@SEUZE.TECH ',
        customReplyTo: '  FALE@SEUZE.TECH ',
        smtpHost: '  smtp.resend.com ',
        smtpUser: '  apikey ',
        smtpFrom: '  no-reply@seuze.tech ',
        smtpAppPassword: '  secret  ',
      },
      'jwt-token',
    );

    expect(httpService.put).toHaveBeenCalledWith('messages/settings/contact-email', {
      deliveryMode: 'in_app_and_email',
      replyToMode: 'custom',
      recipientEmails: ['syndic@condo.com', 'support@condo.com'],
      fromName: 'Seu.Ze',
      fromEmail: 'no-reply@seuze.tech',
      customReplyTo: 'fale@seuze.tech',
      smtpHost: 'smtp.resend.com',
      smtpUser: 'apikey',
      smtpFrom: 'no-reply@seuze.tech',
      smtpAppPassword: 'secret',
    }, 'jwt-token');
  });
});
