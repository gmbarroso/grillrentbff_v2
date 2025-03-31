import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../../shared/auth/services/auth.service';
import { HttpServiceWrapper } from '../../../shared/http/http.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
    private readonly httpService: HttpServiceWrapper,
  ) {}

  async findUserByApartmentAndBlock(apartment: string, block: number): Promise<User | undefined> {
    this.logger.log(`Searching for user in apartment: ${apartment}, block: ${block}`);
    const user = await this.userRepository.findOne({ where: { apartment, block } });
    return user || undefined;
  }

  async register(createUserDto: CreateUserDto) {
    this.logger.log(`Registering user: ${createUserDto.email}`);
    const userExists = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email },
        { apartment: createUserDto.apartment, block: createUserDto.block },
      ],
    });
    
    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.authService.hashPassword(createUserDto.password);
    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    await this.userRepository.save(newUser);

    this.logger.log(`User registered successfully: ${newUser.email}`);
    return { message: 'User registered successfully', user: newUser };
  }

  async login(loginUserDto: LoginUserDto) {
    this.logger.log(`Logging in user from apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
    const user = await this.findUserByApartmentAndBlock(loginUserDto.apartment, loginUserDto.block);

    if (!user) {
      this.logger.warn(`User not found for apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.authService.comparePasswords(loginUserDto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user in apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { name: user.name, sub: user.id, role: user.role };
    const token = this.authService.generateToken(payload);

    this.logger.log(`User logged in successfully: ${user.email}`);
    return { message: 'User logged in successfully', token };
  }

  async getProfile(token: string) {
    this.logger.log(`Redirecting GET profile request to API`);
    return this.httpService.get('users/profile', undefined, token);
  }

  async updateProfile(userId: string, updateData: Partial<CreateUserDto>, token: string) {
    this.logger.log(`Redirecting PUT profile update request for user ID: ${userId}`);
    return this.httpService.put(`users/${userId}`, updateData, token);
  }
}
