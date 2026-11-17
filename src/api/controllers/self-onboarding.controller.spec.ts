import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { SelfOnboardingController } from './self-onboarding.controller';
import { CreateOnboardingSchema } from '../dto/self-onboarding.dto';
import { CreateUserSchema } from '../dto/create-user.dto';

describe('self-onboarding public bridge', () => {
  const http = { get: jest.fn(), post: jest.fn() };
  const auth = {
    generateToken: jest.fn(() => 'signed-session'),
    decodeToken: jest.fn(() => ({ exp: 9999999999 })),
  };
  const config = {
    get: (key: string) =>
      key === 'SELF_ONBOARDING_WEB_ORIGIN' ? 'https://seuze.tech' : undefined,
  } as ConfigService;
  const controller = new SelfOnboardingController(
    http as any,
    auth as any,
    config,
    { lookup: jest.fn() } as any,
  );
  const request = { headers: { origin: 'https://seuze.tech' } } as any;
  const body = {
    organization: { name: 'Condomínio Teste', slug: 'teste' },
    administrator: {
      name: 'Administrador',
      email: 'test@example.com',
      password: 'Teste123!',
    },
    unitCount: 80,
    planId: 'essencial-ate-80',
    billingCycle: 'monthly' as const,
    pricingVersion: '2026-11-17',
  };
  beforeEach(() => jest.clearAllMocks());
  it('forwards the complete registration and idempotency key in one request', async () => {
    http.post.mockResolvedValue({ status: 'pending_verification' });
    await controller.create(
      body,
      'b9bbe4c9-af06-4a30-8f7d-dd6ff2534929',
      request,
    );
    expect(http.post).toHaveBeenCalledWith(
      'onboarding/organizations',
      body,
      undefined,
      'b9bbe4c9-af06-4a30-8f7d-dd6ff2534929',
    );
  });
  it('rejects untrusted origins before calling the API', () => {
    expect(() =>
      controller.create(body, 'b9bbe4c9-af06-4a30-8f7d-dd6ff2534929', {
        headers: { origin: 'https://evil.example' },
      } as any),
    ).toThrow(ForbiddenException);
    expect(http.post).not.toHaveBeenCalled();
  });
  it('issues session and CSRF cookies after successful verification of the administrator', async () => {
    const user = {
      id: 'admin-1',
      name: 'Administrador',
      role: 'admin',
      organizationId: 'org-1',
      apartment: '000',
      block: 1,
    };
    http.post.mockResolvedValue({
      user,
      organization: { id: 'org-1', slug: 'teste', name: 'Teste' },
    });
    const res = { cookie: jest.fn() } as any;
    const response = await controller.verify(
      { token: 'a'.repeat(64) },
      request,
      res,
    );
    expect(auth.generateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'admin-1',
        organizationId: 'org-1',
        onboarding: expect.objectContaining({ onboardingRequired: false }),
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.any(String),
      'signed-session',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.any(String),
      response.csrfToken,
      expect.objectContaining({ httpOnly: false }),
    );
  });
  it('does not issue session cookies when verification fails', async () => {
    http.post.mockRejectedValue(new Error('expired'));
    const res = { cookie: jest.fn() } as any;
    await expect(
      controller.verify({ token: 'a'.repeat(64) }, request, res),
    ).rejects.toThrow();
    expect(res.cookie).not.toHaveBeenCalled();
  });
  it('rejects role injection in both the new registration and legacy public user schema', () => {
    expect(
      CreateOnboardingSchema.validate({ ...body, role: 'admin' }).error,
    ).toBeDefined();
    expect(
      CreateUserSchema.validate({
        organizationSlug: 'teste',
        name: 'Test',
        email: 'test@example.com',
        password: 'Teste123!',
        apartment: '1',
        block: 1,
        role: 'admin',
      }).error,
    ).toBeDefined();
  });
  it('restricts purchase requests to administrators and forwards their trusted token', async () => {
    const choice = {
      planId: 'essencial-ate-80',
      billingCycle: 'monthly' as const,
      pricingVersion: '2026-11-17',
    };
    expect(() =>
      controller.purchase({ user: { role: 'resident' } }, choice),
    ).toThrow(ForbiddenException);
    http.post.mockResolvedValue({ status: 'requested' });
    await controller.purchase(
      { user: { role: 'admin', token: 'trusted-token' } },
      choice,
    );
    expect(http.post).toHaveBeenCalledWith(
      'onboarding/purchase-request',
      choice,
      'trusted-token',
    );
  });
});
