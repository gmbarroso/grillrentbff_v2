import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { AuthService } from '../../shared/auth/services/auth.service';
import { HttpServiceModule } from '../../shared/http/http.module';

@Module({
  imports: [HttpServiceModule],
  controllers: [UserController],
  providers: [UserService, AuthService],
  exports: [UserService],
})
export class UserModule {}
