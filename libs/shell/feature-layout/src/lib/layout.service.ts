import { DestroyRef, Injectable, inject, signal } from '@angular/core';

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);
  readonly sidebarOpened = signal(true);
  readonly dashboardOpened = signal(true);

  private readonly mobileMediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  readonly isMobile = signal(this.mobileMediaQuery.matches);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const updateMobileState = (event: MediaQueryListEvent): void => {
      this.isMobile.set(event.matches);
    };

    this.mobileMediaQuery.addEventListener('change', updateMobileState);
    this.destroyRef.onDestroy(() => {
      this.mobileMediaQuery.removeEventListener('change', updateMobileState);
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }
}
