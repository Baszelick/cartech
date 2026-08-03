import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@cartech/auth/data-access';
import { of } from 'rxjs';

import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
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

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
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
  });
});
