import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateToken(payload: {
    name: string;
    id: string;
    role: string;
    organizationId: string;
    onboarding?: {
      mustProvideEmail: boolean;
      mustVerifyEmail: boolean;
      mustChangePassword: boolean;
      onboardingRequired: boolean;
    };
  }): string {
    const tokenPayload = {
      name: payload.name,
      sub: payload.id,
      jti: randomUUID(),
      role: payload.role,
      organizationId: payload.organizationId,
      ...(payload.onboarding ? { onboarding: payload.onboarding } : {}),
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
