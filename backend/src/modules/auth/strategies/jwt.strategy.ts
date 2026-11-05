import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { getAuthIdleTimeoutMs } from '../session-policy';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  session_version: number;
}

export function extractSessionCookie(request: { headers?: { cookie?: string } } | undefined): string | null {
  const cookieHeader = request?.headers?.cookie;
  if (!cookieHeader) return null;
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('hv_session='));
  if (!cookie) return null;
  try { return decodeURIComponent(cookie.slice('hv_session='.length)); } catch { return null; }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly config: ConfigService;

  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractSessionCookie]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
    this.config = config;
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersRepo.createQueryBuilder('user')
      .addSelect('user.session_version')
      .where('user.id = :id AND user.is_active = true', { id: payload.sub })
      .getOne();
    if (!user || payload.session_version !== user.session_version) throw new UnauthorizedException();
    const idleTimeoutMs = getAuthIdleTimeoutMs(this.config);
    if (!user.last_activity_at || Date.now() - user.last_activity_at.getTime() > idleTimeoutMs) {
      throw new UnauthorizedException('La sesión expiró por inactividad.');
    }
    await this.usersRepo.update({ id: user.id }, { last_activity_at: new Date() });
    return user;
  }
}
