import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { AuthService } from '@cartech/auth/data-access';
import { WorkspaceStore } from '@cartech/core/data-access';
import { initializeApplication } from './app.config';

describe('initializeApplication', () => {
  it('waits for session restoration to complete', async () => {
    const restoration$ = new Subject<void>();
    const authService = {
      initializeSession: jasmine.createSpy().and.returnValue(restoration$),
      isAuthenticated: jasmine.createSpy().and.returnValue(false),
    };
    const workspaceStore = {
      loadWorkspace: jasmine.createSpy().and.returnValue(of(void 0)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: WorkspaceStore, useValue: workspaceStore },
      ],
    });

    let resolved = false;
    const initialization = TestBed.runInInjectionContext(
      initializeApplication,
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
    expect(workspaceStore.loadWorkspace).not.toHaveBeenCalled();
  });

  it('loads workspace after restoring an authenticated session', async () => {
    const authService = {
      initializeSession: jasmine.createSpy().and.returnValue(of(void 0)),
      isAuthenticated: jasmine.createSpy().and.returnValue(true),
    };
    const workspaceStore = {
      loadWorkspace: jasmine.createSpy().and.returnValue(of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: WorkspaceStore, useValue: workspaceStore },
      ],
    });

    await TestBed.runInInjectionContext(initializeApplication);

    expect(authService.initializeSession).toHaveBeenCalledTimes(1);
    expect(workspaceStore.loadWorkspace).toHaveBeenCalledTimes(1);
  });
});
