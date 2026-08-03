import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from './password-change.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const activation = super.canActivate(context);
    if (typeof activation === 'boolean') {
      return activation && this.checkPasswordRequirement(context);
    }
    if (activation instanceof Promise) {
      return activation.then(
        (allowed) => allowed && this.checkPasswordRequirement(context),
      );
    }
    return new Observable<boolean>((subscriber) => {
      const subscription = activation.subscribe({
        next: (allowed) => {
          try {
            subscriber.next(
              allowed && this.checkPasswordRequirement(context),
            );
          } catch (error) {
            subscriber.error(error);
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
      return () => subscription.unsubscribe();
    });
  }

  private checkPasswordRequirement(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.mustChangePassword && !allowed) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Initial password change is required',
      });
    }
    return true;
  }
}
