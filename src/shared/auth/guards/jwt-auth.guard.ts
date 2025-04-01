import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedToken } from '../../../api/entities/revoked-token.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('Validating JWT token');

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('Token not provided');
      throw new UnauthorizedException('Token not provided');
    }

    const isRevoked = await this.revokedTokenRepository.findOne({ where: { token } });
    if (isRevoked) {
      this.logger.error('Token has been revoked');
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const decoded = this.jwtService.verify(token);

      if (!decoded || !decoded.sub || !decoded.name || !decoded.role) {
        this.logger.error('Invalid token payload');
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = { id: decoded.sub, name: decoded.name, role: decoded.role };
      return true;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
