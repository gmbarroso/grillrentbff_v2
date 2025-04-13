import { Controller, Post, Get, Delete, Body, Param, Query, Req, UseGuards, Logger, UnauthorizedException } from '@nestjs/common';
import { BookingService } from '../services/booking.service';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';

@Controller('bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createBooking(@Body() body: any, @Req() req: any) {
    this.logger.log('Received POST /bookings request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling BookingService to create a booking');
    return this.bookingService.createBooking(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async getBookingsByUser(@Param('userId') userId: string, @Req() req: any) {
    this.logger.log(`Received GET /bookings/user/${userId} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling BookingService to fetch bookings for user ID: ${userId}`);
    return this.bookingService.getBookingsByUser(userId, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllBookings(
    @Req() req: any,
    @Query() query: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log('Received GET /bookings request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling BookingService to fetch all bookings');
    return this.bookingService.getAllBookings({ ...query, startDate, endDate }, token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteBooking(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Received DELETE /bookings/${id} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling BookingService to delete booking with ID: ${id}`);
    return this.bookingService.deleteBooking(id, token);
  }

  @Get('availability/:resourceId')
  async checkAvailability(
    @Param('resourceId') resourceId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    this.logger.log(`Received GET /bookings/availability/${resourceId} request`);
    this.logger.log(`Checking availability for resource ID: ${resourceId}`);
    return this.bookingService.checkAvailability(resourceId, startTime, endTime);
  }

  @Get('reserved-times')
  async getReservedTimes(
    @Query('resourceType') resourceType: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    this.logger.log('Received GET /bookings/reserved-times request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Fetching reserved times for resourceType: ${resourceType} on date: ${date}`);
    return this.bookingService.getReservedTimes(resourceType, date, token);
  }
}
