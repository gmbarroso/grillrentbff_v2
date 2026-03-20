import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CreateOrganizationDto, CreateOrganizationSchema } from '../dto/create-organization.dto';
import { UpdateOrganizationDto, UpdateOrganizationSchema } from '../dto/update-organization.dto';
import { OrganizationService } from '../services/organization.service';
import { JoiValidationPipe } from '../../shared/pipes/joi-validation.pipe';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body(new JoiValidationPipe(CreateOrganizationSchema)) createOrganizationDto: CreateOrganizationDto,
    @Req() req: any,
  ) {
    if (req.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create organizations');
    }
    return this.organizationService.create(createOrganizationDto, req.user.token);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.organizationService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async findCurrent(@Req() req: any) {
    return this.organizationService.findCurrent(req.user.token);
  }

  @UseGuards(JwtAuthGuard)
  @Put('current')
  async updateCurrent(
    @Body(new JoiValidationPipe(UpdateOrganizationSchema)) updateOrganizationDto: UpdateOrganizationDto,
    @Req() req: any,
  ) {
    if (req.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update organization identity');
    }
    return this.organizationService.updateCurrent(updateOrganizationDto, req.user.token);
  }
}
