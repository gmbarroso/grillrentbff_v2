import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { JoiValidationPipe } from '../../shared/pipes/joi-validation.pipe';
import {
  ContactEmailSettingsDto,
  CreateContactMessageDto,
  CreateContactMessageSchema,
  CreateMessageReplyDto,
  CreateMessageReplySchema,
  MessageListResponseDto,
  MessageUnreadStateDto,
  UpdateContactEmailSettingsDto,
  UpdateContactEmailSettingsSchema,
} from '../dto/message.dto';
import { UserRole } from '../entities/user.entity';
import { MessageService } from '../services/message.service';

@Controller('messages')
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(private readonly messageService: MessageService) {}

  @UseGuards(JwtAuthGuard)
  @Post('contact')
  async createContactMessage(@Body(new JoiValidationPipe(CreateContactMessageSchema)) body: CreateContactMessageDto, @Req() req: any) {
    this.logger.log('Received POST /messages/contact request');
    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    return this.messageService.createContactMessage(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  async getAdminMessages(@Req() req: any, @Query() query: Record<string, unknown>): Promise<MessageListResponseDto> {
    this.logger.log('Received GET /messages/admin request');
    const token = this.ensureAdminAndGetToken(req);

    return this.messageService.getAdminMessages(token, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async getResidentMessages(@Req() req: any, @Query() query: Record<string, unknown>): Promise<MessageListResponseDto> {
    this.logger.log('Received GET /messages/mine request');
    const token = this.ensureResidentAndGetToken(req);

    return this.messageService.getResidentMessages(token, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@Req() req: any): Promise<MessageUnreadStateDto> {
    this.logger.log('Received GET /messages/unread-count request');
    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    return this.messageService.getUnreadCount(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/mark-read')
  async markAsRead(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    this.logger.log(`Received POST /messages/${id}/mark-read request`);
    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    return this.messageService.markAsRead(id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/replies')
  async replyAsAdmin(@Param('id', new ParseUUIDPipe()) id: string, @Body(new JoiValidationPipe(CreateMessageReplySchema)) body: CreateMessageReplyDto, @Req() req: any) {
    this.logger.log(`Received POST /messages/${id}/replies request`);
    const token = this.ensureAdminAndGetToken(req);

    return this.messageService.replyAsAdmin(id, body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/replies/mine')
  async replyAsResident(@Param('id', new ParseUUIDPipe()) id: string, @Body(new JoiValidationPipe(CreateMessageReplySchema)) body: CreateMessageReplyDto, @Req() req: any) {
    this.logger.log(`Received POST /messages/${id}/replies/mine request`);
    const token = this.ensureResidentAndGetToken(req);

    return this.messageService.replyAsResident(id, body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteMessage(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    this.logger.log(`Received DELETE /messages/${id} request`);
    const token = this.ensureAdminAndGetToken(req);
    return this.messageService.deleteMessage(id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings/contact-email')
  async getContactEmailSettings(@Req() req: any): Promise<ContactEmailSettingsDto> {
    this.logger.log('Received GET /messages/settings/contact-email request');
    const token = this.ensureAdminAndGetToken(req);
    return this.messageService.getContactEmailSettings(token);
  }

  @UseGuards(JwtAuthGuard)
  @Put('settings/contact-email')
  async updateContactEmailSettings(
    @Body(new JoiValidationPipe(UpdateContactEmailSettingsSchema)) body: UpdateContactEmailSettingsDto,
    @Req() req: any,
  ): Promise<ContactEmailSettingsDto> {
    this.logger.log('Received PUT /messages/settings/contact-email request');
    const token = this.ensureAdminAndGetToken(req);
    return this.messageService.updateContactEmailSettings(body, token);
  }

  private ensureAdminAndGetToken(req: any): string {
    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    if (req.user?.role !== UserRole.ADMIN) {
      this.logger.error('User does not have admin permissions to perform this action');
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return token;
  }

  private ensureResidentAndGetToken(req: any): string {
    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    if (req.user?.role !== UserRole.RESIDENT) {
      this.logger.error('User does not have resident permissions to perform this action');
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return token;
  }
}
