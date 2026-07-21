import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectOption } from './select.interface';
import {OverlayModule} from '@angular/cdk/overlay';
import {IconComponent} from '../icon/icon.component';

@Component({
  selector: 'ct-select',
  standalone: true,
  imports: [OverlayModule, IconComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ct-select--open]': 'isOpen()',
    '[class.ct-select--disabled]': 'isDisabled()'
  }
})
export class SelectComponent<T = unknown> implements ControlValueAccessor {

  private readonly elementRef = inject(ElementRef)

  readonly label = input<string>();
  readonly placeholder = input<string>('Выберите значение...')
  readonly options = input<SelectOption<T>[]>([])

  readonly value = signal<T | null>(null)
  readonly isOpen = signal<boolean>(false)
  readonly isDisabled = signal<boolean>(false)

  private onChange: (value: T | null) => void = () => {}
  private onTouched: () => void = () => {}

  get triggerWidth(): number {
    return this.elementRef.nativeElement.getBoundingClientRect().width;
  }

  writeValue(val: T | null): void {
    this.value.set(val);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }


  toggle(): void {
    if (this.isDisabled()) return;

    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.isDisabled()) return;
    this.isOpen.set(true);
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  readonly selectedLabel = computed(() => {
    const current = this.options().find(opt => opt.value === this.value());
    return current?.label ?? null;
  });

  selectOption(option: SelectOption<T>): void {
    if (option.disabled || this.isDisabled()) return;

    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
  }
}
