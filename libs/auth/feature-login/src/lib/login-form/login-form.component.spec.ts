import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@cartech/auth/data-access';
import { WorkspaceStore } from '@cartech/core/data-access';
import { of } from 'rxjs';

import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let workspaceStore: {
    loadWorkspace: jasmine.Spy;
    error: jasmine.Spy;
    reset: jasmine.Spy;
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'logout',
    ]);
    authService.login.and.returnValue(
      of({
        accessToken: 'access-token',
        user: {
          id: 'user-id',
          companyId: 'company-id',
          username: 'ivan',
          firstName: 'Иван',
          lastName: 'Талисов',
          roles: [],
          mustChangePassword: false,
        },
      }),
    );
    workspaceStore = {
      loadWorkspace: jasmine.createSpy().and.returnValue(of(void 0)),
      error: jasmine.createSpy().and.returnValue(null),
      reset: jasmine.createSpy(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: WorkspaceStore, useValue: workspaceStore },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']),
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('trims and uppercases companyCode before login', () => {
    component.form.setValue({
      companyCode: '  forsage ',
      username: 'ivan',
      password: '178Region',
    });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith({
      companyCode: 'FORSAGE',
      username: 'ivan',
      password: '178Region',
    });
    expect(workspaceStore.loadWorkspace).toHaveBeenCalledTimes(1);
  });

  it('loads workspace before navigating after login', () => {
    const router = TestBed.inject(Router);
    component.form.setValue({
      companyCode: 'FORSAGE',
      username: 'ivan',
      password: '178Region',
    });

    component.onSubmit();

    expect(workspaceStore.loadWorkspace).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('logs out and does not navigate when workspace loading fails', () => {
    authService.logout.and.returnValue(of({}));
    workspaceStore.error.and.returnValue('Не удалось загрузить рабочий контекст');
    component.form.setValue({
      companyCode: 'FORSAGE',
      username: 'ivan',
      password: '178Region',
    });
    const router = TestBed.inject(Router);

    component.onSubmit();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(workspaceStore.reset).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loginError()).toContain('не удалось загрузить рабочий контекст');
  });
});
