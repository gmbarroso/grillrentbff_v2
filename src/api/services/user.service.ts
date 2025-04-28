import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../shared/auth/services/auth.service';
import { HttpServiceWrapper } from '../../shared/http/http.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { RevokedToken } from '../entities/revoked-token.entity';
import { WinstonLoggerService } from '../../shared/logger/winston-logger.service';

@Injectable()
export class UserService {
  private readonly logger = new WinstonLoggerService();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    private readonly authService: AuthService,
    private readonly httpService: HttpServiceWrapper,
  ) {}

  async findUserByApartmentAndBlock(apartment: string, block: number): Promise<User | undefined> {
    try {
      const user = await this.userRepository.findOne({ where: { apartment, block } });
      return user ?? undefined;
    } catch (error) {
      this.logger.error(`Error in findUserByApartmentAndBlock: ${error.message}`);
      throw error;
    }
  }

  async register(createUserDto: CreateUserDto) {
    try {
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
      return { message: 'User registered successfully', user: newUser };
    } catch (error) {
      this.logger.error(`Error in register: ${error.message}`);
      throw error;
    }
  }

  async login(loginUserDto: LoginUserDto) {
    try {
      const user = await this.findUserByApartmentAndBlock(loginUserDto.apartment, loginUserDto.block);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await this.authService.comparePasswords(loginUserDto.password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { name: user.name, id: user.id, role: user.role };
      const token = this.authService.generateToken(payload);

      return { message: 'User logged in successfully', token };
    } catch (error) {
      this.logger.error(`Error in login: ${error.message}`);
      throw error;
    }
  }

  async getProfile(token: string) {
    try {
      return await this.httpService.get('users/profile', undefined, token);
    } catch (error) {
      this.logger.error(`Error in getProfile: ${error.message}`);
      throw error;
    }
  }

  async getAllUsers(token: string) {
    try {
      return await this.httpService.get('users', undefined, token);
    } catch (error) {
      this.logger.error(`Error in getAllUsers: ${error.message}`);
      throw error;
    }
  }

  async updateProfile(updateData: UpdateUserDto, token: string) {
    try {
      return await this.httpService.put('users/profile', updateData, token);
    } catch (error) {
      this.logger.error(`Error in updateProfile: ${error.message}`);
      throw error;
    }
  }

  async logout(token: string) {
    try {
      const decoded = this.authService.decodeToken(token);
      if (!decoded || !decoded.exp) {
        throw new UnauthorizedException('Invalid token');
      }

      const expirationDate = new Date(decoded.exp * 1000);
      const revokedToken = this.revokedTokenRepository.create({ token, expirationDate });
      await this.revokedTokenRepository.save(revokedToken);

      this.logger.log(`Token revoked for user ID: ${decoded.sub}`);
      return { message: 'User logged out successfully' };
    } catch (error) {
      this.logger.error(`Error in logout: ${error.message}`);
      throw error;
    }
  }

  async deleteUser(userId: string, token: string) {
    try {
      this.logger.log(`Deleting user with ID: ${userId}`);
      return await this.httpService.delete(`users/${userId}`, token);
    } catch (error) {
      this.logger.error(`Error in deleteUser: ${error.message}`);
      throw error;
    }
  }
}
