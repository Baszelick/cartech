import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ButtonSize, ButtonVariant} from './button.type';

@Component({
  selector: 'ct-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly iconOnly = input(false);
  readonly fullWidth = input(false);

  protected readonly hostClasses = computed(() => [
    'ct-button',
    `ct-button--${this.variant()}`,
    `ct-button--${this.size()}`,
    this.iconOnly() && 'ct-button--icon',
    this.fullWidth() && 'ct-button--full',
  ]
    .filter(Boolean)
    .join(' '));
}
