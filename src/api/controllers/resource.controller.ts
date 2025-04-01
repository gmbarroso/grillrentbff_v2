import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, Logger, UnauthorizedException } from '@nestjs/common';
import { ResourceService } from '../services/resource.service';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';

@Controller('resources')
export class ResourceController {
  private readonly logger = new Logger(ResourceController.name);

  constructor(private readonly resourceService: ResourceService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createResource(@Body() body: any, @Req() req: any) {
    this.logger.log('Received POST /resources request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling ResourceService to create a resource');
    return this.resourceService.createResource(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllResources(@Req() req: any) {
    this.logger.log('Received GET /resources request');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling ResourceService to fetch all resources');
    return this.resourceService.getAllResources(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getResource(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Received GET /resources/${id} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling ResourceService to fetch resource with ID: ${id}`);
    return this.resourceService.getResource(id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateResource(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    this.logger.log(`Received PUT /resources/${id} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling ResourceService to update resource with ID: ${id}`);
    return this.resourceService.updateResource(id, body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteResource(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Received DELETE /resources/${id} request`);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Calling ResourceService to delete resource with ID: ${id}`);
    return this.resourceService.deleteResource(id, token);
  }
}
