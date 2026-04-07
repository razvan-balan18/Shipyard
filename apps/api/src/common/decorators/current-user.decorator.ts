import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../../generated/prisma/client';

export interface JwtUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId: string;
}

// Instead of writing req.user everywhere, we use @CurrentUser()
// Usage: async getProfile(@CurrentUser() user: JwtUser) { ... }
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return request.user;
  },
);
