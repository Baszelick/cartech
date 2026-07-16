import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  #breakpointObserver = inject(BreakpointObserver)

  isMobile = signal(false)
  sidebarOpened = signal(true)
  dashboardOpened = signal(true)

  constructor() {
    this.#breakpointObserver.observe([Breakpoints.Handset, '(max-width: 768px)'])
      .subscribe(res => this.isMobile.set(res.matches))

    effect(() => {
      if (this.isMobile()) {
        this.sidebarOpened.set(false)
        this.dashboardOpened.set(false)
      } else {
        this.sidebarOpened.set(true)
        this.dashboardOpened.set(true)
      }
    });
  }

  toggleSidebar () {
    this.sidebarOpened.set(!this.sidebarOpened)
  }

  toggleDashboard () {
    this.dashboardOpened.set(!this.dashboardOpened)
  }


}
