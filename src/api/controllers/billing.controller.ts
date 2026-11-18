import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import {
  OnboardingValidationPipe,
  PurchaseRequestSchema,
} from '../dto/self-onboarding.dto';
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly http: HttpServiceWrapper) {}
  private token(req: any) {
    if (req.user?.role !== 'admin')
      throw new ForbiddenException(
        'Somente administradores podem gerenciar assinaturas.',
      );
    return req.user.token as string;
  }
  @Get('subscription') current(@Req() req: any) {
    return this.http.get('billing/subscription', undefined, this.token(req));
  }
  @Post('checkout') checkout(
    @Req() req: any,
    @Body(new OnboardingValidationPipe(PurchaseRequestSchema)) body: unknown,
    @Headers('idempotency-key') key: string,
  ) {
    const token = this.token(req);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key || '',
      )
    )
      throw new BadRequestException('Chave de contratação inválida.');
    return this.http.post('billing/checkout', body, token, key);
  }
  @Post('checkout/expire') expire(@Req() req: any) {
    return this.http.post('billing/checkout/expire', {}, this.token(req));
  }
  @Post('manage') manage(@Req() req: any) {
    return this.http.post('billing/manage', {}, this.token(req));
  }
  @Post('sync') sync(@Req() req: any, @Body() body: { sessionId?: string }) {
    const token = this.token(req);
    if (
      !body ||
      Object.keys(body).some((k) => k !== 'sessionId') ||
      typeof body.sessionId !== 'string' ||
      !/^cs_[a-zA-Z0-9_]{5,250}$/.test(body.sessionId)
    )
      throw new BadRequestException('Checkout inválido.');
    return this.http.post('billing/sync', body, token);
  }
}
