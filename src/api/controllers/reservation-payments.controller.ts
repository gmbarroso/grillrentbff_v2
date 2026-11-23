import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { HttpServiceWrapper } from '../../shared/http/http.service';

@Controller('reservation-payments')
@UseGuards(JwtAuthGuard)
export class ReservationPaymentsController {
  constructor(private readonly http: HttpServiceWrapper) {}
  private token(req: any, admin = false) {
    if (admin && req.user?.role !== 'admin')
      throw new ForbiddenException(
        'Somente administradores podem configurar recebimentos.',
      );
    return req.user.token as string;
  }
  @Get('settings') settings(@Req() req: any) {
    return this.http.get(
      'reservation-payments/settings',
      undefined,
      this.token(req, true),
    );
  }
  @Get('catalog') catalog(@Req() req: any) {
    return this.http.get(
      'reservation-payments/catalog',
      undefined,
      this.token(req),
    );
  }
  @Get('reservations') list(@Req() req: any, @Query('mine') mine?: string) {
    return this.http.get(
      'reservation-payments/reservations',
      mine === 'true' ? { mine: 'true' } : undefined,
      this.token(req),
    );
  }
  @Post('receiver/onboard') onboard(@Req() req: any, @Body() body: unknown) {
    return this.http.post(
      'reservation-payments/receiver/onboard',
      body,
      this.token(req, true),
    );
  }
  @Post('receiver/sync') receiver(@Req() req: any, @Body() body: unknown) {
    return this.http.post(
      'reservation-payments/receiver/sync',
      body,
      this.token(req, true),
    );
  }
  @Post('resources/:id') policy(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return this.http.post(
      `reservation-payments/resources/${id}`,
      body,
      this.token(req, true),
    );
  }
  @Post('quote') quote(@Req() req: any, @Body() body: unknown) {
    return this.http.post('reservation-payments/quote', body, this.token(req));
  }
  @Post('reservations') reserve(
    @Req() req: any,
    @Body() body: unknown,
    @Headers('idempotency-key') key: string,
  ) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key || '',
      )
    )
      throw new BadRequestException('Chave de reserva inválida.');
    return this.http.post(
      'reservation-payments/reservations',
      body,
      this.token(req),
      key,
    );
  }
  @Post('reservations/:id/checkout') checkout(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.http.post(
      `reservation-payments/reservations/${id}/checkout`,
      {},
      this.token(req),
    );
  }
  @Post('reservations/:id/sync') sync(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.http.post(
      `reservation-payments/reservations/${id}/sync`,
      {},
      this.token(req),
    );
  }
  @Post('reservations/:id/cancel') cancel(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.http.post(
      `reservation-payments/reservations/${id}/cancel`,
      {},
      this.token(req),
    );
  }
  @Post('reservations/:id/refund') refund(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.http.post(
      `reservation-payments/reservations/${id}/refund`,
      {},
      this.token(req, true),
    );
  }
}

@Controller('legal')
export class LegalDocumentsController {
  constructor(private readonly http: HttpServiceWrapper) {}
  @Get('copies')
  @UseGuards(JwtAuthGuard)
  copies(@Req() req: any) {
    return this.http.get('legal/copies', undefined, req.user.token);
  }
  @Get(':purpose') current(@Param('purpose') purpose: string) {
    if (!['service', 'receiving', 'reservation'].includes(purpose))
      throw new BadRequestException('Documento inválido.');
    return this.http.get(`legal/${purpose}`);
  }
}
