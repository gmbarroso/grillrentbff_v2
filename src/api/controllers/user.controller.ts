import { Controller, Post, Body, Logger, Get, Put, Delete, Param, Req, UseGuards, UnauthorizedException, Res } from '@nestjs/common';
import { CreateUserDto, CreateUserSchema } from '../dto/create-user.dto';
import { LoginUserDto, LoginUserSchema } from '../dto/login-user.dto';
import { UpdateUserDto, UpdateUserSchema } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';
import { JoiValidationPipe } from '../../shared/pipes/joi-validation.pipe';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { clearAuthCookie, clearCsrfCookie, setAuthCookie, setCsrfCookie } from '../../shared/auth/auth-cookie.util';
import { Response } from 'express';
import { randomBytes } from 'crypto';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body(new JoiValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto) {
    this.logger.log(`Registering user: ${createUserDto.apartment}, block: ${createUserDto.block}`);
    const result = await this.userService.register(createUserDto);
    this.logger.log(`User registered successfully: ${createUserDto.apartment}, block: ${createUserDto.block}`);
    return result;
  }

  @Post('login')
  async login(
    @Body(new JoiValidationPipe(LoginUserSchema)) loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Logging in user from apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
    const result = await this.userService.login(loginUserDto);
    const csrfToken = randomBytes(32).toString('hex');
    setAuthCookie(res, result.access_token, result.exp);
    setCsrfCookie(res, csrfToken);
    return {
      ...result,
      csrfToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    this.logger.log('Entering UserController.getProfile');
    const token = req.user?.token;

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

    const token = req.user?.token;

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

    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to update user profile');
    return this.userService.updateProfile(updateData, token);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(@Req() req: any, @Param('id') userId: string, @Body(new JoiValidationPipe(UpdateUserSchema)) updateData: UpdateUserDto) {
    this.logger.log('Entering UserController.updateUser');

    const token = req.user?.token;
    const userRole = req.user?.role;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    if (userRole !== UserRole.ADMIN) {
      this.logger.error('Only admins can update users');
      throw new UnauthorizedException('You do not have permission to update users');
    }

    this.logger.log(`Calling UserService to update user with ID: ${userId}`);
    return this.userService.updateUser(userId, updateData, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    this.logger.log('Entering UserController.logout');

    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to handle logout');
    const result = await this.userService.logout(token);
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Req() req: any, @Param('id') userId: string) {
    this.logger.log('Entering UserController.deleteUser');

    const token = req.user?.token;
    const userRole = req.user?.role;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    if (userRole !== UserRole.ADMIN) {
      this.logger.error('Only admins can delete users');
      throw new UnauthorizedException('You do not have permission to delete users');
    }

    this.logger.log(`Calling UserService to delete user with ID: ${userId}`);
    return this.userService.deleteUser(userId, token);
  }
}
