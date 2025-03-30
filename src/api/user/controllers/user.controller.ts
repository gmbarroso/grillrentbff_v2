import { Controller, Post, Body, Logger, Get, Put, Delete, Param, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, CreateUserSchema } from '../dto/create-user.dto';
import { LoginUserDto, LoginUserSchema } from '../dto/login-user.dto';
import { UserService } from '../services/user.service';
import { JoiValidationPipe } from '../../../shared/pipes/joi-validation.pipe';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body(new JoiValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto) {
    this.logger.log(`Registering apartment: ${createUserDto.apartment}, block: ${createUserDto.block}`);
    return this.userService.register(createUserDto);
  }

  @Post('login')
  async login(@Body(new JoiValidationPipe(LoginUserSchema)) loginUserDto: LoginUserDto) {
    this.logger.log(`Logging in user from apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
    return this.userService.login(loginUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User ID is missing');
    }

    this.logger.log(`Fetching profile for user ID: ${userId}`);
    return this.userService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() updateData: Partial<CreateUserDto>) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User ID is missing');
    }

    this.logger.log(`Updating profile for user ID: ${userId}`);
    return this.userService.updateProfile(userId, updateData);
  }
}
