import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ContextSelectItem } from './context.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ct-context-select',
  imports: [IconComponent],
  templateUrl: './context-select.html',
  styleUrl: './context-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextSelect {
  items = input<ContextSelectItem[]>([]);
  disabled = input(false);
  selectedId = input<string | null>(null);
  placeholder = input('Выберите');

  selected = output<string>();

  readonly isOpen = signal(false);

  readonly selectedItem = computed(
    () => this.items().find((item) => item.id === this.selectedId()) ?? null,
  );

  toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.isOpen.update((value) => !value);
  }

  selectItem(id: string): void {
    this.selected.emit(id);
    this.isOpen.set(false);
  }
}
