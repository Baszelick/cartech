import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AuthService } from '@cartech/auth/data-access';
import { initializeAuthSession } from './app.config';

describe('initializeAuthSession', () => {
  it('waits for session restoration to complete', async () => {
    const restoration$ = new Subject<void>();
    const authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'initializeSession',
    ]);
    authService.initializeSession.and.returnValue(restoration$);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    });

    let resolved = false;
    const initialization = TestBed.runInInjectionContext(
      initializeAuthSession,
    ).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBeFalse();

    restoration$.next();
    restoration$.complete();
    await initialization;

    expect(resolved).toBeTrue();
    expect(authService.initializeSession).toHaveBeenCalledTimes(1);
  });
});
