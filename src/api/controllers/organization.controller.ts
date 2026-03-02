import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CreateOrganizationDto, CreateOrganizationSchema } from '../dto/create-organization.dto';
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
}
