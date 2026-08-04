import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TabItem } from './tabs.interface';

@Component({
  selector: 'ct-tabs',
  imports: [],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly items = input.required<TabItem[]>();
  readonly selected = input.required<string>();

  readonly selectedChange = output<string>();

  selectTab(item: TabItem) {
    if(item.disabled || item.value === this.selected()) return

    this.selectedChange.emit(item.value);
  }
}
