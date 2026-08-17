import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me-in-production'),
    });
  }

  /**
   * Re-checks the user against the database on every request instead of trusting the token's
   * embedded claims — a deactivated account (or one demoted from ADMIN) otherwise keeps its old
   * access for up to JWT_EXPIRES_IN (8h) after the change, since nothing invalidates an
   * already-issued token. `role`/`email` come from the fresh row, not the stale payload, so a
   * role change or e-mail change also takes effect immediately rather than at next login.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub).catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessão inválida.');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
