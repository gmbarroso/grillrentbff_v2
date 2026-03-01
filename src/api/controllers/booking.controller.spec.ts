import { UnauthorizedException } from '@nestjs/common';
import { BookingController } from './booking.controller';

describe('BFF BookingController', () => {
  let controller: BookingController;
  const bookingService = {
    createBooking: jest.fn(),
    getBookingsByUser: jest.fn(),
    getAllBookings: jest.fn(),
    deleteBooking: jest.fn(),
    checkAvailability: jest.fn(),
    getReservedTimes: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BookingController(bookingService as any);
  });

  it('forwards availability checks with token', async () => {
    const payload = { available: true, message: 'Available' };
    bookingService.checkAvailability.mockResolvedValue(payload);

    await expect(
      controller.checkAvailability(
        'resource-1',
        '2026-06-10T10:00:00.000Z',
        '2026-06-10T11:00:00.000Z',
        { user: { token: 'jwt-token' } },
      ),
    ).resolves.toEqual(payload);

    expect(bookingService.checkAvailability).toHaveBeenCalledWith(
      'resource-1',
      '2026-06-10T10:00:00.000Z',
      '2026-06-10T11:00:00.000Z',
      'jwt-token',
    );
  });

  it('throws UnauthorizedException when availability token is missing', async () => {
    await expect(
      controller.checkAvailability(
        'resource-1',
        '2026-06-10T10:00:00.000Z',
        '2026-06-10T11:00:00.000Z',
        { user: {} },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
