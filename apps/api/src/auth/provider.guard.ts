import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Used after JwtAuthGuard. Only service providers may use these routes.
@Injectable()
export class ProviderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== 'provider') {
      throw new ForbiddenException('Providers only');
    }
    return true;
  }
}
