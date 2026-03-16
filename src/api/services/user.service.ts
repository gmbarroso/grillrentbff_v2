import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../shared/auth/services/auth.service';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { RevokedToken } from '../entities/revoked-token.entity';
import { OrganizationService } from './organization.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    private readonly authService: AuthService,
    private readonly httpService: HttpServiceWrapper,
    private readonly organizationService: OrganizationService,
  ) {}

  async findUserByApartmentAndBlock(
    apartment: string,
    block: number,
    organizationId: string,
  ): Promise<User | undefined> {
    this.logger.log(`Searching for user in apartment: ${apartment}, block: ${block}`);
    const user = await this.userRepository.findOne({ where: { apartment, block, organizationId } });
    return user || undefined;
  }

  async register(createUserDto: CreateUserDto) {
    this.logger.log(`Registering user: ${createUserDto.email}, organization slug: ${createUserDto.organizationSlug}`);
    const organization = await this.resolveOrganizationBySlug(createUserDto.organizationSlug);
    const normalizedEmail = createUserDto.email?.trim().toLowerCase() || null;
    const duplicateWhere: Array<{ apartment: string; block: number; organizationId: string } | { email: string; organizationId: string }> = [
      { apartment: createUserDto.apartment, block: createUserDto.block, organizationId: organization.id },
    ];

    if (normalizedEmail) {
      duplicateWhere.push({ email: normalizedEmail, organizationId: organization.id });
    }

    const userExists = await this.userRepository.findOne({
      where: duplicateWhere,
    });
    
    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const { organizationSlug: _organizationSlug, ...userPayload } = createUserDto;
    const hashedPassword = await this.authService.hashPassword(createUserDto.password);
    const newUser = this.userRepository.create({
      ...userPayload,
      email: normalizedEmail,
      password: hashedPassword,
      organizationId: organization.id,
      mustChangePassword: true,
    });

    await this.userRepository.save(newUser);

    this.logger.log(`User registered successfully: ${newUser.email}`);
    return { message: 'User registered successfully', user: newUser };
  }

  async login(loginUserDto: LoginUserDto) {
    this.logger.log(
      `Logging in user from apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}, organization slug: ${loginUserDto.organizationSlug}`,
    );
    const organization = await this.resolveOrganizationBySlug(loginUserDto.organizationSlug);
    const user = await this.findUserByApartmentAndBlock(loginUserDto.apartment, loginUserDto.block, organization.id);

    if (!user) {
      this.logger.warn(`User not found for apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.authService.comparePasswords(loginUserDto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user in apartment: ${loginUserDto.apartment}, block: ${loginUserDto.block}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { name: user.name, id: user.id, role: user.role, organizationId: organization.id };
    const token = this.authService.generateToken(payload);
    const decoded = this.authService.decodeToken(token);

    this.logger.log(`User logged in successfully: ${user.email}`);
    return { message: 'User logged in successfully', token, access_token: token, exp: decoded?.exp };
  }

  async getProfile(token: string) {
    this.logger.log('Entering UserService.getProfile');

    this.logger.log('Redirecting GET profile request to API');
    return this.httpService.get('users/profile', undefined, token);
  }

  async getAllUsers(token: string) {
    this.logger.log('Entering UserService.getAllUsers');

    this.logger.log('Redirecting GET all users request to API');
    return this.httpService.get('users', undefined, token);
  }

  async updateProfile(updateData: UpdateUserDto, token: string) {
    this.logger.log('Entering UserService.updateProfile');
    this.logger.log(`Data received: ${JSON.stringify(updateData)}`);
    this.logger.log('Redirecting PUT profile update request to API');

    return this.httpService.put('users/profile', updateData, token);
  }

  async updateUser(userId: string, updateData: UpdateUserDto, token: string) {
    this.logger.log('Entering UserService.updateUser');
    this.logger.log(`User ID to update: ${userId}`);
    this.logger.log('Redirecting PUT user update request to API');

    return this.httpService.put(`users/${userId}`, updateData, token);
  }

  async logout(token: string) {
    this.logger.log('Entering UserService.logout');
    const decoded = this.authService.decodeToken(token);
    if (!decoded || !decoded.exp) {
      this.logger.error('Invalid token: Unable to extract expiration date');
      throw new UnauthorizedException('Invalid token');
    }

    const expirationDate = new Date(decoded.exp * 1000);
    const organizationId = typeof decoded?.organizationId === 'string' ? decoded.organizationId : undefined;
    const existingRevocation = await this.revokedTokenRepository.findOne({ where: { token } });
    if (existingRevocation) {
      this.logger.log('Token already revoked in BFF');
      return { message: 'User logged out successfully' };
    }

    const revokedToken = this.revokedTokenRepository.create({ token, expirationDate, organizationId });
    await this.revokedTokenRepository.save(revokedToken);

    this.logger.log('Token invalidated successfully');
    return { message: 'User logged out successfully' };
  }

  async deleteUser(userId: string, token: string) {
    this.logger.log('Entering UserService.deleteUser');
    this.logger.log(`User ID to delete: ${userId}`);
    this.logger.log('Redirecting DELETE user request to API');

    return this.httpService.delete(`users/${userId}`, token);
  }

  private async resolveOrganizationBySlug(slug: string): Promise<{ id: string; slug: string; name: string }> {
    try {
      return await this.organizationService.findBySlug(slug);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        throw new UnauthorizedException('Invalid condominium code');
      }
      throw error;
    }
  }
}
