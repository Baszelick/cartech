import {ChangeDetectionStrategy, Component, forwardRef, input, signal} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent implements ControlValueAccessor {

  readonly type = input<string>('text')
  readonly placeholder = input<string>('')
  readonly icon = input<string>()

  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false)

  onChange: (value: string) => void = () => {}
  onTouched: () => void = () => {}


    writeValue(val: string): void {
      this.value.set(val ?? '');
    }

    registerOnChange(fn: any): void {
      this.onChange = fn;
    }
    registerOnTouched(fn: any): void {
      this.onTouched = fn
    }

    setDisabledState?(isDisabled: boolean): void {
      this.disabled.set(isDisabled);
    }

  protected handleInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const val = inputEl.value;

    this.value.set(val);
    this.onChange(val);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

}
