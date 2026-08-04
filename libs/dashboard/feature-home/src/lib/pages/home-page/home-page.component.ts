import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TabItem, TabsComponent } from '@cartech/frontend/ui';

@Component({
  selector: 'app-home-page',
  imports: [TabsComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  selectedLocation = signal('all')

  locations: TabItem[] = [
    {
      value: 'all',
      label: 'Все',
      count: 164,
    },
    {
      value: 'x1',
      label: 'Х1',
      count: 82,
    },
    {
      value: 'v27',
      label: 'В27',
      count: 46,
    },
  ];
}
