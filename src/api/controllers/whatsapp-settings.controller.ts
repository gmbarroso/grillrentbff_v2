import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { JoiValidationPipe } from '../../shared/pipes/joi-validation.pipe';
import { UserRole } from '../entities/user.entity';
import { WhatsappSettingsService } from '../services/whatsapp-settings.service';
import {
  TestWhatsappConnectionSchema,
  TestWhatsappConnectionDto,
  UpdateWhatsappSettingsSchema,
  UpdateWhatsappSettingsDto,
  UpsertWhatsappGroupBindingSchema,
  UpsertWhatsappGroupBindingDto,
} from '../dto/whatsapp-settings.dto';

@Controller('whatsapp/settings')
export class WhatsappSettingsController {
  private readonly logger = new Logger(WhatsappSettingsController.name);
  private static readonly FEATURE_PARAM_PATTERN = /^[A-Za-z0-9-]+$/;

  constructor(private readonly whatsappSettingsService: WhatsappSettingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSettings(@Req() req: any) {
    this.logger.log('Received GET /whatsapp/settings request');
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.getSettings(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bootstrap-legacy')
  async bootstrapLegacy(@Req() req: any) {
    this.logger.log('Received POST /whatsapp/settings/bootstrap-legacy request');
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.bootstrapLegacy(token);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateSettings(
    @Body(new JoiValidationPipe(UpdateWhatsappSettingsSchema)) body: UpdateWhatsappSettingsDto,
    @Req() req: any,
  ) {
    this.logger.log('Received PUT /whatsapp/settings request');
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.updateSettings(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('test-connection')
  async testConnection(
    @Body(new JoiValidationPipe(TestWhatsappConnectionSchema)) body: TestWhatsappConnectionDto,
    @Req() req: any,
  ) {
    this.logger.log('Received POST /whatsapp/settings/test-connection request');
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.testConnection(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('groups')
  async getGroups(@Req() req: any) {
    this.logger.log('Received GET /whatsapp/settings/groups request');
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.getGroups(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bindings')
  async getBindings(@Req() req: any) {
    this.logger.log('Received GET /whatsapp/settings/bindings request');
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.getBindings(token);
  }

  @UseGuards(JwtAuthGuard)
  @Put('bindings/:feature')
  async upsertBinding(
    @Param('feature') feature: string,
    @Body(new JoiValidationPipe(UpsertWhatsappGroupBindingSchema)) body: UpsertWhatsappGroupBindingDto,
    @Req() req: any,
  ) {
    const normalizedFeature = feature.trim().toLowerCase();
    if (!WhatsappSettingsController.FEATURE_PARAM_PATTERN.test(normalizedFeature)) {
      this.logger.warn('Received invalid feature parameter in PUT /whatsapp/settings/bindings request');
      throw new BadRequestException('Invalid feature parameter');
    }

    this.logger.log(`Received PUT /whatsapp/settings/bindings/${normalizedFeature} request`);
    const token = this.ensureAdminAndGetToken(req);
    return this.whatsappSettingsService.upsertBinding(normalizedFeature, body, token);
  }

  private ensureAdminAndGetToken(req: any): string {
    const token = req.user?.token;
    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    if (req.user?.role !== UserRole.ADMIN) {
      this.logger.error('User does not have admin permissions for WhatsApp settings');
      throw new ForbiddenException('You do not have permission to manage WhatsApp settings');
    }

    return token;
  }
}
