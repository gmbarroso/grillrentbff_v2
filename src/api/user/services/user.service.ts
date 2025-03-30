import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../shared/auth/services/auth.service';
import { HttpServiceWrapper } from '../../../shared/http/http.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly httpService: HttpServiceWrapper,
  ) {}

  async register(createUserDto: CreateUserDto) {
    this.logger.log(`Registering user: ${createUserDto.email}`);
    const hashedPassword = await this.authService.hashPassword(createUserDto.password);
    const userPayload = { ...createUserDto, password: hashedPassword };

    return this.httpService.post('users/register', userPayload);
  }

  async login(loginUserDto: LoginUserDto) {
    this.logger.log(`Logging in user from apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
    return this.httpService.post('users/login', loginUserDto);
  }

  async getProfile(userId: string) {
    this.logger.log(`Fetching profile for user ID: ${userId}`);
    return this.httpService.get(`users/${userId}`);
  }

  async updateProfile(userId: string, updateData: Partial<CreateUserDto>) {
    this.logger.log(`Updating profile for user ID: ${userId}`);
    return this.httpService.put(`users/${userId}`, updateData);
  }
}
