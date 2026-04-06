import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

// This strategy runs on every request that uses @UseGuards(AuthGuard('jwt')).
// It extracts the JWT from the Authorization header, verifies it, and attaches
// the user object to the request.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // Tell Passport where to find the JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // The secret used to verify the token signature
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      // Don't accept expired tokens
      ignoreExpiration: false,
    });
  }

  // This method is called after the JWT is verified.
  // Whatever it returns is attached to request.user.
  async validate(payload: {
    sub: string;
    email: string;
    teamId: string;
    role: string;
  }) {
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user; // This becomes req.user
  }
}
