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

  generateToken(payload: { name: string; id: string; role: string }): string {
    const tokenPayload = {
      name: payload.name,
      sub: payload.id,
      role: payload.role,
    };

    const token = this.jwtService.sign(tokenPayload);
    return token;
  }

  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      console.error('Error decoding token:', error.message);
      return null;
    }
  }
}
