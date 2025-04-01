import { Controller, Post, Body, Logger, Get, Put, Delete, Param, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, CreateUserSchema } from '../dto/create-user.dto';
import { LoginUserDto, LoginUserSchema } from '../dto/login-user.dto';
import { UpdateUserDto, UpdateUserSchema } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';
import { JoiValidationPipe } from '../../shared/pipes/joi-validation.pipe';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';

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
    this.logger.log('Entering UserController.getProfile');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to fetch user profile');
    return this.userService.getProfile(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(@Req() req: any) {
    this.logger.log('Entering UserController.getAllUsers');

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to fetch all users');
    return this.userService.getAllUsers(token);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: any, @Body(new JoiValidationPipe(UpdateUserSchema)) updateData: UpdateUserDto) {
    this.logger.log('Entering UserController.updateProfile');

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to update user profile');
    return this.userService.updateProfile(updateData, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    this.logger.log('Entering UserController.logout');

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to handle logout');
    return this.userService.logout(token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Req() req: any, @Param('id') userId: string) {
    this.logger.log('Entering UserController.deleteUser');

    const token = req.headers.authorization?.split(' ')[1];
    const userRole = req.user?.role;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    if (userRole !== 'admin') {
      this.logger.error('Only admins can delete users');
      throw new UnauthorizedException('You do not have permission to delete users');
    }

    this.logger.log(`Calling UserService to delete user with ID: ${userId}`);
    return this.userService.deleteUser(userId, token);
  }
}
