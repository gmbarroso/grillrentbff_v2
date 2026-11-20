import { ReservationPaymentsController } from './reservation-payments.controller';
describe('reservation payment BFF', () => {
  const http = { get: jest.fn(), post: jest.fn() };
  const controller = new ReservationPaymentsController(http as any);
  const resident = { user: { role: 'resident', token: 'resident-token' } },
    admin = { user: { role: 'admin', token: 'admin-token' } };
  beforeEach(() => jest.clearAllMocks());
  it('prevents residents configuring recipients, prices or administrative refunds', () => {
    expect(() => controller.settings(resident)).toThrow('administradores');
    expect(() => controller.policy(resident, 'resource', {})).toThrow(
      'administradores',
    );
    expect(() => controller.refund(resident, 'reservation')).toThrow(
      'administradores',
    );
    expect(http.post).not.toHaveBeenCalled();
  });
  it('forwards only the authenticated token and caller idempotency key', () => {
    const key = '320782c9-6711-4df6-8969-f0f38199dfe7';
    controller.reserve(resident, { resourceId: 'resource' }, key);
    expect(http.post).toHaveBeenCalledWith(
      'reservation-payments/reservations',
      { resourceId: 'resource' },
      'resident-token',
      key,
    );
  });
  it('rejects invalid idempotency keys before calling the API', () => {
    expect(() => controller.reserve(admin, {}, 'bad')).toThrow('inválida');
    expect(http.post).not.toHaveBeenCalled();
  });
});
