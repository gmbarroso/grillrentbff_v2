import { BookingService } from './booking.service';

describe('BFF BookingService', () => {
  let service: BookingService;
  const httpService = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingService(httpService as any);
  });

  it('forwards booking payload without timestamp transformation', async () => {
    const payload = {
      data: [
        {
          id: 'booking-1',
          startTime: '2026-06-10T11:00:00.000Z',
          endTime: '2026-06-10T12:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      lastPage: 1,
    };
    const expectedResult = JSON.parse(JSON.stringify(payload));

    httpService.get.mockResolvedValue(payload);

    const result = await service.getAllBookings({ page: 1 }, 'jwt-token');

    expect(result).toEqual(expectedResult);
    expect(httpService.get).toHaveBeenCalledWith('bookings', { page: 1 }, 'jwt-token');
  });
});
