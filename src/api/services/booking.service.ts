import { Injectable } from '@nestjs/common';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';

@Injectable()
export class BookingService {
  private readonly logger = new WinstonLoggerService();
  private readonly apiUrl = 'bookings';

  constructor(private readonly httpService: HttpServiceWrapper) {}

  async createBooking(body: any, token: string) {
    try {
      return await this.httpService.post(this.apiUrl, body, token);
    } catch (error) {
      this.logger.error(`Error in createBooking: ${error.message}`);
      throw error;
    }
  }

  async getBookingsByUser(userId: string, token: string) {
    try {
      return await this.httpService.get(`${this.apiUrl}/user/${userId}`, undefined, token);
    } catch (error) {
      this.logger.error(`Error in getBookingsByUser: ${error.message}`);
      throw error;
    }
  }

  async getAllBookings(query: any, token: string) {
    try {
      return await this.httpService.get(this.apiUrl, query, token);
    } catch (error) {
      this.logger.error(`Error in getAllBookings: ${error.message}`);
      throw error;
    }
  }

  async deleteBooking(id: string, token: string) {
    try {
      return await this.httpService.delete(`${this.apiUrl}/${id}`, token);
    } catch (error) {
      this.logger.error(`Error in deleteBooking: ${error.message}`);
      throw error;
    }
  }

  async checkAvailability(resourceId: string, startTime: string, endTime: string) {
    const query = { startTime, endTime };
    try {
      return await this.httpService.get(`${this.apiUrl}/availability/${resourceId}`, query);
    } catch (error) {
      this.logger.error(`Error in checkAvailability: ${error.message}`);
      throw error;
    }
  }

  async getReservedTimes(resourceType: string, date: string, token: string) {
    const query = { resourceType, date };
    try {
      return await this.httpService.get(`${this.apiUrl}/reserved-times`, query, token);
    } catch (error) {
      this.logger.error(`Error in getReservedTimes: ${error.message}`);
      throw error;
    }
  }
}
