import { ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/enums';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const context = (roles?: UserRole[]): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn() as unknown as () => Type<unknown>,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: 'user-id',
            companyId: 'company-id',
            username: 'operator',
            roles,
          },
        }),
      }),
    }) as unknown as ExecutionContext;
  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows a user with the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TECHNICIAN]);

    expect(guard.canActivate(context([UserRole.TECHNICIAN]))).toBe(true);
  });

  it('allows any matching role from several permitted roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.SYSTEM_OWNER,
      UserRole.OPERATIONS_MANAGER,
    ]);

    expect(guard.canActivate(context([UserRole.OPERATIONS_MANAGER]))).toBe(
      true,
    );
  });

  it('rejects a user without a permitted role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.OPERATIONS_MANAGER]);

    expect(() => guard.canActivate(context([UserRole.VIEWER]))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an authenticated context without roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.SYSTEM_OWNER]);

    expect(() => guard.canActivate(context(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('allows SYSTEM_OWNER for owner-only metadata', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.SYSTEM_OWNER]);

    expect(guard.canActivate(context([UserRole.SYSTEM_OWNER]))).toBe(true);
  });

  it('allows OPERATIONS_MANAGER when explicitly permitted', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.SYSTEM_OWNER,
      UserRole.OPERATIONS_MANAGER,
    ]);

    expect(guard.canActivate(context([UserRole.OPERATIONS_MANAGER]))).toBe(
      true,
    );
  });

  it('does not alter endpoints without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context(undefined))).toBe(true);
  });
});
