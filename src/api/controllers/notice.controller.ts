import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, Logger, UnauthorizedException } from '@nestjs/common';
import { NoticeService } from '../services/notice.service';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';

@Controller('notices')
export class NoticeController {
  private readonly logger = new Logger(NoticeController.name);

  constructor(private readonly noticeService: NoticeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createNotice(@Body() body: any, @Req() req: any) {
    this.logger.log('Received POST /notices request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling NoticeService to create a notice');
    return this.noticeService.createNotice(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllNotices(@Req() req: any) {
    this.logger.log('Received GET /notices request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling NoticeService to fetch all notices');
    return this.noticeService.getAllNotices(token);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateNotice(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    this.logger.log(`Received PUT /notices/${id} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling NoticeService to update notice with ID: ${id}`);
    return this.noticeService.updateNotice(id, body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteNotice(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Received DELETE /notices/${id} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling NoticeService to delete notice with ID: ${id}`);
    return this.noticeService.deleteNotice(id, token);
  }
}
