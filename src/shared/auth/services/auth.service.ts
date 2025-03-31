import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateToken(payload: any): string {
    const tokenPayload = { ...payload, id: payload.sub };
    delete tokenPayload.sub;
    const token = this.jwtService.sign(tokenPayload);
    console.log('Generated JWT:', token, 'Payload:', tokenPayload);
    return token;
  }
}
