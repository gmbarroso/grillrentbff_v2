import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { AuthService } from '../../shared/auth/services/auth.service';
import { HttpServiceModule } from '../../shared/http/http.module';
import { User } from './entities/user.entity';
import { RevokedToken } from './entities/revoked-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RevokedToken]),
    HttpServiceModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService, AuthService],
  exports: [UserService, JwtModule],
})
export class UserModule {}
