import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Instead of writing req.user everywhere, we use @CurrentUser()
// Usage: async getProfile(@CurrentUser() user: User) { ... }
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: unknown }>();
    return request.user;
  },
);
