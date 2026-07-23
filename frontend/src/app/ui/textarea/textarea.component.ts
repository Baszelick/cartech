import {
    Component,
    ChangeDetectionStrategy,
    forwardRef,
    input,
    signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'ct-textarea',
    standalone: true,
    templateUrl: './textarea.component.html',
    styleUrl: './textarea.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextareaComponent),
            multi: true,
        },
    ],
})
export class TextareaComponent implements ControlValueAccessor {
    readonly label = input<string>('');
    readonly placeholder = input<string>('');
    readonly rows = input<number>(4);

    readonly value = signal<string>('');
    readonly disabled = signal<boolean>(false);

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(val: string): void {
        this.value.set(val ?? '');
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    onInput(event: Event): void {
        const val = (event.target as HTMLTextAreaElement).value;
        this.value.set(val);
        this.onChange(val);
    }

    onBlur(): void {
        this.onTouched();
    }
}