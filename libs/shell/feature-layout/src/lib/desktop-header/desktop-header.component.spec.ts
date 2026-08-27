import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@cartech/auth/data-access';
import { WorkspaceStore } from '@cartech/core/data-access';
import { of } from 'rxjs';

import { DesktopHeaderComponent } from './desktop-header.component';

describe('DesktopHeaderComponent', () => {
  let component: DesktopHeaderComponent;
  let fixture: ComponentFixture<DesktopHeaderComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let workspaceStore: {
    locations: ReturnType<typeof signal<never[]>>;
    sites: ReturnType<typeof signal<never[]>>;
    currentLocationId: ReturnType<typeof signal<string | null>>;
    currentSiteId: ReturnType<typeof signal<string | null>>;
    selectLocation: jasmine.Spy;
    selectSite: jasmine.Spy;
    reset: jasmine.Spy;
  };
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    authService.logout.and.returnValue(of({}));
    workspaceStore = {
      locations: signal([]),
      sites: signal([]),
      currentLocationId: signal(null),
      currentSiteId: signal(null),
      selectLocation: jasmine.createSpy(),
      selectSite: jasmine.createSpy(),
      reset: jasmine.createSpy(),
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [DesktopHeaderComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: WorkspaceStore, useValue: workspaceStore },
        { provide: Router, useValue: router },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DesktopHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets workspace before navigating to login on logout', () => {
    component.onLogout();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(workspaceStore.reset).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
