import { BadRequestException, Controller, Post, Body, Logger, Get, Put, Delete, Param, Req, UseGuards, UnauthorizedException, Res, ForbiddenException, Query } from '@nestjs/common';
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
import {
  ForgotPasswordConfirmDto,
  ForgotPasswordConfirmSchema,
  ForgotPasswordRequestDto,
  ForgotPasswordRequestSchema,
} from '../dto/forgot-password.dto';
import {
  ChangePasswordDto,
  ChangePasswordSchema,
  ChangeOnboardingPasswordDto,
  ChangeOnboardingPasswordSchema,
  ConfirmEmailChangeDto,
  ConfirmEmailChangeSchema,
  RequestEmailChangeDto,
  RequestEmailChangeSchema,
  SetOnboardingEmailDto,
  SetOnboardingEmailSchema,
  VerifyOnboardingEmailDto,
  VerifyOnboardingEmailSchema,
} from '../dto/onboarding.dto';
import { CompleteFirstAccessTourDto, CompleteFirstAccessTourSchema } from '../dto/tour.dto';

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

  @Post('forgot-password/request')
  async requestForgotPassword(
    @Body(new JoiValidationPipe(ForgotPasswordRequestSchema)) body: ForgotPasswordRequestDto,
  ) {
    return this.userService.requestForgotPassword(body);
  }

  @Post('forgot-password/confirm')
  async confirmForgotPassword(
    @Body(new JoiValidationPipe(ForgotPasswordConfirmSchema)) body: ForgotPasswordConfirmDto,
  ) {
    return this.userService.confirmForgotPassword(body);
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
  async getAllUsers(@Req() req: any, @Query() query: Record<string, unknown>) {
    this.logger.log('Entering UserController.getAllUsers');

    const token = req.user?.token;

    if (!token) {
      this.logger.error('Authorization token is missing in the request');
      throw new UnauthorizedException('Authorization token is missing');
    }

    this.logger.log('Calling UserService to fetch all users');
    return this.userService.getAllUsers(token, query);
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
    if (updateData.password !== undefined) {
      throw new BadRequestException('Use onboarding password endpoint to change password');
    }

    this.logger.log('Calling UserService to update user profile');
    return this.userService.updateProfile(updateData, token);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id([0-9a-fA-F-]{36})')
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
      throw new ForbiddenException('You do not have permission to update users');
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

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/email')
  async setOnboardingEmail(
    @Req() req: any,
    @Body(new JoiValidationPipe(SetOnboardingEmailSchema)) body: SetOnboardingEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.respondWithRefreshedSession(
      res,
      token,
      async () => this.userService.setOnboardingEmail(body, token) as Promise<Record<string, unknown>>,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/change/request')
  async requestEmailChange(
    @Req() req: any,
    @Body(new JoiValidationPipe(RequestEmailChangeSchema)) body: RequestEmailChangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.respondWithRefreshedSession(
      res,
      token,
      async () => this.userService.requestEmailChange(body, token) as Promise<Record<string, unknown>>,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/change/confirm')
  async confirmEmailChange(
    @Req() req: any,
    @Body(new JoiValidationPipe(ConfirmEmailChangeSchema)) body: ConfirmEmailChangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.respondWithRefreshedSession(
      res,
      token,
      async () => this.userService.confirmEmailChange(body, token) as Promise<Record<string, unknown>>,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/verify')
  async verifyOnboardingEmail(
    @Req() req: any,
    @Body(new JoiValidationPipe(VerifyOnboardingEmailSchema)) body: VerifyOnboardingEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.respondWithRefreshedSession(
      res,
      token,
      async () => this.userService.verifyOnboardingEmail(body, token) as Promise<Record<string, unknown>>,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/change-password')
  async changeOnboardingPassword(
    @Req() req: any,
    @Body(new JoiValidationPipe(ChangeOnboardingPasswordSchema)) body: ChangeOnboardingPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.respondWithRefreshedSession(
      res,
      token,
      async () => this.userService.changeOnboardingPassword(body, token) as Promise<Record<string, unknown>>,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @Req() req: any,
    @Body(new JoiValidationPipe(ChangePasswordSchema)) body: ChangePasswordDto,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.userService.changePassword(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tour/complete')
  async completeFirstAccessTour(
    @Req() req: any,
    @Body(new JoiValidationPipe(CompleteFirstAccessTourSchema)) body: CompleteFirstAccessTourDto,
  ) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.userService.completeFirstAccessTour(body, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tour/reset')
  async resetFirstAccessTour(@Req() req: any) {
    const token = req.user?.token;
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }
    return this.userService.resetFirstAccessTour(token);
  }

  private async respondWithRefreshedSession(
    res: Response,
    token: string,
    runOnboardingAction: () => Promise<Record<string, unknown>>,
  ) {
    const result = await runOnboardingAction();
    const refreshedSession = this.userService.issueRefreshedSessionToken(token, result);
    setAuthCookie(res, refreshedSession.access_token, refreshedSession.exp);
    return {
      ...result,
      ...refreshedSession,
    };
  }
}
