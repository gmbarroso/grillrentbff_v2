import { Injectable, Logger } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly apiUrl = 'bookings';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createBooking(body: any, token: string) {
    this.logger.log('Calling createBooking');
    this.logger.debug(`Body: ${JSON.stringify(body)}`);
    try {
      return await this.httpService.post(this.apiUrl, body, token);
    } catch (error) {
      this.logger.error(`Error in createBooking: ${error.message}`);
      throw error;
    }
  }

  async getBookingsByUser(userId: string, token: string) {
    this.logger.log(`Calling getBookingsByUser for user ID: ${userId}`);
    return this.httpService.get(`${this.apiUrl}/user/${userId}`, undefined, token);
  }

  async getAllBookings(query: any, token: string) {
    this.logger.log('Calling getAllBookings');
    this.logger.debug(`Query: ${JSON.stringify(query)}`);
    return this.httpService.get(this.apiUrl, query, token);
  }

  async deleteBooking(id: string, token: string) {
    this.logger.log(`Calling deleteBooking with ID: ${id}`);
    return this.httpService.delete(`${this.apiUrl}/${id}`, token);
  }

  async checkAvailability(resourceId: string, startTime: string, endTime: string) {
    this.logger.log(`Calling checkAvailability for resource ID: ${resourceId}`);
    const query = { startTime, endTime };
    return this.httpService.get(`${this.apiUrl}/availability/${resourceId}`, query);
  }

  async getReservedTimes(resourceType: string, date: string, token: string) {
    this.logger.log(`Calling getReservedTimes for resourceType: ${resourceType} on date: ${date}`);
    const query = { resourceType, date };
    return this.httpService.get(`${this.apiUrl}/reserved-times`, query, token);
  }
}
