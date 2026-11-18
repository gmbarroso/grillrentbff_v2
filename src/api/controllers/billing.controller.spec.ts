import { BillingController } from './billing.controller';
describe('billing BFF administrator boundary', () => {
  const http = { get: jest.fn(), post: jest.fn() };
  const controller = new BillingController(http as any);
  const admin = {
    user: { id: 'admin', role: 'admin', token: 'signed-session' },
  };
  beforeEach(() => jest.clearAllMocks());
  it('forwards server-authenticated token and checkout idempotency key', () => {
    const key = 'da9665f2-87ca-40f3-9cc1-613892850bb2';
    const body = {
      planId: 'essencial-81-160',
      billingCycle: 'monthly',
      pricingVersion: 'test',
    };
    controller.checkout(admin, body, key);
    expect(http.post).toHaveBeenCalledWith(
      'billing/checkout',
      body,
      'signed-session',
      key,
    );
  });
  it('denies residents for all billing management endpoints', () => {
    const resident = { user: { role: 'resident', token: 'resident' } };
    for (const action of [
      () => controller.current(resident),
      () => controller.manage(resident),
      () => controller.expire(resident),
      () => controller.sync(resident, { sessionId: 'cs_test_other' }),
      () => controller.checkout(resident, {}, 'anything'),
    ])
      expect(action).toThrow();
    expect(http.post).not.toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
  });
  it('rejects arbitrary sync payloads and invalid keys', () => {
    expect(() =>
      controller.sync(admin, { sessionId: 'https://other.example' }),
    ).toThrow();
    expect(() => controller.checkout(admin, {}, 'bad')).toThrow();
  });
});
