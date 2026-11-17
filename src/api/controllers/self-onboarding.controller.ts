import { PostalCodeService } from '../services/postal-code.service';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { AuthService } from '../../shared/auth/services/auth.service';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import {
  setAuthCookie,
  setCsrfCookie,
} from '../../shared/auth/auth-cookie.util';
import {
  CreateOnboardingDto,
  CreateOnboardingSchema,
  OnboardingValidationPipe,
  PurchaseRequestSchema,
  ResendOnboardingSchema,
  VerifyOnboardingSchema,
} from '../dto/self-onboarding.dto';

@Controller('onboarding')
export class SelfOnboardingController {
  constructor(
    private readonly http: HttpServiceWrapper,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly postalCode: PostalCodeService,
  ) {}
  @Get('postal-code/:postalCode')
  address(@Param('postalCode') postalCode: string) {
    return this.postalCode.lookup(postalCode);
  }

  @Get('plans') catalog() {
    return this.http.get('onboarding/plans');
  }
  @Post('organizations')
  create(
    @Body(new OnboardingValidationPipe(CreateOnboardingSchema))
    body: CreateOnboardingDto,
    @Headers('idempotency-key') key: string,
    @Req() req: Request,
  ) {
    this.validateOrigin(req);
    if (!/^[0-9a-f-]{36}$/i.test(key || ''))
      throw new BadRequestException('Chave de cadastro inválida.');
    return this.http.post('onboarding/organizations', body, undefined, key);
  }
  @Post('verify-email')
  async verify(
    @Body(new OnboardingValidationPipe(VerifyOnboardingSchema))
    body: { token: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.validateOrigin(req);
    const result = await this.http.post<{
      user: {
        id: string;
        name: string;
        role: string;
        organizationId: string;
        apartment: string;
        block: number;
      };
      organization: { id: string; slug: string; name: string };
    }>('onboarding/verify-email', body);
    const token = this.auth.generateToken({
      ...result.user,
      onboarding: {
        mustProvideEmail: false,
        mustVerifyEmail: false,
        mustChangePassword: false,
        onboardingRequired: false,
      },
    });
    const exp = this.auth.decodeToken(token)?.exp;
    const csrfToken = randomBytes(32).toString('hex');
    setAuthCookie(res, token, exp);
    setCsrfCookie(res, csrfToken);
    return { ...result, access_token: token, exp, csrfToken };
  }
  @Post('resend-verification')
  resend(
    @Body(new OnboardingValidationPipe(ResendOnboardingSchema))
    body: { slug: string; email: string },
    @Req() req: Request,
  ) {
    this.validateOrigin(req);
    return this.http.post('onboarding/resend-verification', body);
  }
  @Post('purchase-request')
  @UseGuards(JwtAuthGuard)
  purchase(
    @Req() req: any,
    @Body(new OnboardingValidationPipe(PurchaseRequestSchema))
    body: {
      planId: string;
      billingCycle: 'monthly' | 'annual';
      pricingVersion: string;
    },
  ) {
    if (req.user.role !== 'admin')
      throw new ForbiddenException(
        'Somente administradores podem contratar planos.',
      );
    return this.http.post('onboarding/purchase-request', body, req.user.token);
  }
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  current(@Req() req: any) {
    return this.http.get('onboarding/subscription', undefined, req.user.token);
  }

  private validateOrigin(req: Request) {
    const keys = [
      'SELF_ONBOARDING_WEB_ORIGIN',
      'BFF_CORS_ALLOWED_ORIGINS',
      'CORS_ALLOWED_ORIGINS',
      'FRONTEND_URL',
      'APP_URL',
      'WEB_URL',
      'PUBLIC_APP_URL',
    ];
    const configured = keys
      .flatMap((key) => (this.config.get<string>(key) || '').split(','))
      .filter(Boolean);
    const local = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ];
    const values = configured.length
      ? configured
      : ['local', 'development', 'dev', 'test'].includes(
            this.config.get('NODE_ENV') || '',
          )
        ? local
        : [];
    const allowed = values.flatMap((value) => {
      try {
        return [new URL(value.trim()).origin];
      } catch {
        return [];
      }
    });
    if (!req.headers.origin || !allowed.includes(req.headers.origin))
      throw new ForbiddenException({
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Origem não autorizada.',
      });
  }
}
