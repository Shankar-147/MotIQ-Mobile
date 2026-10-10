import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let userId: string;
    try {
      userId = this.jwt.verify<{ sub: string }>(token).sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Checked against the DB on every request so a suspended user is
    // locked out immediately instead of when the token expires.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Unknown user');
    if (user.status === 'suspended') throw new ForbiddenException('Account suspended');

    const authUser: AuthUser = { id: user.id, phoneNumber: user.phoneNumber, role: user.role };
    req.user = authUser;
    return true;
  }
}
