import { UnauthorizedException } from '@nestjs/common';
import { BookingController } from './booking.controller';

describe('BFF BookingController', () => {
  let controller: BookingController;
  const bookingService = {
    createBooking: jest.fn(),
    createBatchBooking: jest.fn(),
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

  it('forwards batch booking with token', async () => {
    const payload = { summary: { requested: 2, created: 1, skipped: 1 }, created: [], skipped: [] };
    const body = {
      resourceId: 'resource-1',
      slots: [
        { startTime: '2026-06-10T10:00:00.000Z', endTime: '2026-06-10T11:00:00.000Z' },
        { startTime: '2026-06-11T10:00:00.000Z', endTime: '2026-06-11T11:00:00.000Z' },
      ],
    };
    bookingService.createBatchBooking.mockResolvedValue(payload);

    await expect(
      controller.createBatchBooking(body, { user: { token: 'jwt-token' } }),
    ).resolves.toEqual(payload);

    expect(bookingService.createBatchBooking).toHaveBeenCalledWith(body, 'jwt-token');
  });

  it('throws UnauthorizedException when batch booking token is missing', async () => {
    await expect(
      controller.createBatchBooking(
        {
          resourceId: 'resource-1',
          slots: [{ startTime: '2026-06-10T10:00:00.000Z', endTime: '2026-06-10T11:00:00.000Z' }],
        },
        { user: {} },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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

  it('forwards getAllBookings query with token', async () => {
    const payload = { data: [], total: 0, page: 1, lastPage: 1 };
    bookingService.getAllBookings.mockResolvedValue(payload);

    await expect(
      controller.getAllBookings(
        { user: { token: 'jwt-token' } },
        { page: 2, limit: 10, sort: 'startTime', order: 'ASC' },
        undefined,
        undefined,
      ),
    ).resolves.toEqual(payload);

    expect(bookingService.getAllBookings).toHaveBeenCalledWith(
      { page: 2, limit: 10, sort: 'startTime', order: 'ASC', startDate: undefined, endDate: undefined },
      'jwt-token',
    );
  });

  it('throws UnauthorizedException when getAllBookings token is missing', async () => {
    await expect(
      controller.getAllBookings(
        { user: {} },
        { page: 1, limit: 10 },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
