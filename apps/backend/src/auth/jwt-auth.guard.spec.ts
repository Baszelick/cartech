import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard password-change policy', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const request = {
    user: {
      userId: 'user-id',
      mustChangePassword: true,
    },
  };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    request.user.mustChangePassword = true;
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('returns PASSWORD_CHANGE_REQUIRED for a regular protected API', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(() =>
      (
        guard as unknown as {
          checkPasswordRequirement(context: ExecutionContext): boolean;
        }
      ).checkPasswordRequirement(context),
    ).toThrow(ForbiddenException);

    try {
      (
        guard as unknown as {
          checkPasswordRequirement(context: ExecutionContext): boolean;
        }
      ).checkPasswordRequirement(context);
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Initial password change is required',
      });
    }
  });

  it('allows endpoints explicitly available during initial change', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(
      (
        guard as unknown as {
          checkPasswordRequirement(context: ExecutionContext): boolean;
        }
      ).checkPasswordRequirement(context),
    ).toBe(true);
  });

  it('allows regular API after password change', () => {
    request.user.mustChangePassword = false;
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(
      (
        guard as unknown as {
          checkPasswordRequirement(context: ExecutionContext): boolean;
        }
      ).checkPasswordRequirement(context),
    ).toBe(true);
  });
});
