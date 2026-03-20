import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { MessageController } from './message.controller';
import { MessageService } from '../services/message.service';

describe('BFF MessageController', () => {
  let controller: MessageController;
  let service: jest.Mocked<MessageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        {
          provide: MessageService,
          useValue: {
            createContactMessage: jest.fn(),
            getAdminMessages: jest.fn(),
            getResidentMessages: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
            replyAsAdmin: jest.fn(),
            replyAsResident: jest.fn(),
            deleteMessage: jest.fn(),
            getContactEmailSettings: jest.fn(),
            updateContactEmailSettings: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MessageController>(MessageController);
    service = module.get(MessageService) as jest.Mocked<MessageService>;
  });

  it('proxies contact email settings read for admin', async () => {
    service.getContactEmailSettings.mockResolvedValue({ deliveryMode: 'in_app_only' } as any);

    await expect(
      controller.getContactEmailSettings({ user: { role: UserRole.ADMIN, token: 'jwt-token' } } as any),
    ).resolves.toEqual({ deliveryMode: 'in_app_only' });

    expect(service.getContactEmailSettings).toHaveBeenCalledWith('jwt-token');
  });

  it('rejects contact email settings read for non-admin users', async () => {
    await expect(
      controller.getContactEmailSettings({ user: { role: UserRole.RESIDENT, token: 'jwt-token' } } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects admin inbox for non-admin users', async () => {
    await expect(
      controller.getAdminMessages(
        { user: { role: UserRole.RESIDENT, token: 'jwt-token' } } as any,
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects admin replies for non-admin users', async () => {
    await expect(
      controller.replyAsAdmin(
        '11111111-1111-4111-8111-111111111111',
        { content: 'reply' } as any,
        { user: { role: UserRole.RESIDENT, token: 'jwt-token' } } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects contact email settings update without token', async () => {
    await expect(
      controller.updateContactEmailSettings(
        { deliveryMode: 'in_app_only', replyToMode: 'resident_email' } as any,
        { user: { role: UserRole.ADMIN } } as any,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('proxies delete message for admin', async () => {
    service.deleteMessage.mockResolvedValue({ success: true });

    await expect(
      controller.deleteMessage('message-1', { user: { role: UserRole.ADMIN, token: 'jwt-token' } } as any),
    ).resolves.toEqual({ success: true });

    expect(service.deleteMessage).toHaveBeenCalledWith('message-1', 'jwt-token');
  });
});
