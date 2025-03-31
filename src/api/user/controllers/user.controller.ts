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
    this.logger.log(`Registering user: ${createUserDto.apartment}, block: ${createUserDto.block}`);
    const userExists = await this.userService.findUserByApartmentAndBlock(
      createUserDto.apartment,
      createUserDto.block,
    );
    if (userExists) {
      this.logger.error(`User already exists: ${createUserDto.apartment}, block: ${createUserDto.block}`);
      throw new UnauthorizedException('User already exists');
    }
    this.logger.log(`User registered successfully: ${createUserDto.apartment}, block: ${createUserDto.block}`);
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
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log(`Redirecting to API for user profile`);
    return this.userService.getProfile(token);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() updateData: Partial<CreateUserDto>) {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (!userId) {
      throw new UnauthorizedException('User ID is missing');
    }

    this.logger.log(`Redirecting to API to update profile for user ID: ${userId}`);
    return this.userService.updateProfile(userId, updateData, token);
  }
}
