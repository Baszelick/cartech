import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {log} from "@angular-devkit/build-angular/src/builders/ssr-dev-server";

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  #breakpointObserver = inject(BreakpointObserver)

  isMobile = signal(false)
  sidebarOpened = signal(true)
  dashboardOpened = signal(true)
  sidebarCollapsed = signal(false)

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
    this.sidebarCollapsed.update(v=> !v)
  }

  toggleDashboard () {
    this.dashboardOpened.update(v=> !v)
  }


}
