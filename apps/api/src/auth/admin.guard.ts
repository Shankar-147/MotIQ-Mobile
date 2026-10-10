import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Runs after JwtAuthGuard, which is what puts the user on the request.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== 'admin') throw new ForbiddenException('Admins only');
    return true;
  }
}
