import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
    // Add custom logic before token validation
    const request = context.switchToHttp().getRequest();

    // Check for public routes
    const isPublic = Reflect.getMetadata(
        'isPublic',
        context.getHandler(),
    );

    if (isPublic) {
        return true;
    }

    return super.canActivate(context);
    }
}