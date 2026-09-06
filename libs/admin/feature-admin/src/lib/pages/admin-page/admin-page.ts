import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TabsComponent } from '@cartech/frontend/ui';
import { ADMIN_TABS } from '../../config/admin-tabs.config';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'ct-admin-page',
  imports: [TabsComponent, RouterOutlet],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {
  readonly tabs = ADMIN_TABS;

  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  activeTab = this.#route.snapshot.firstChild?.url[0]?.path ?? 'company';

  onTabChange(tab: string) {
    this.activeTab = tab;

    this.#router.navigate([tab], {
      relativeTo: this.#route,
    });
  }
}
