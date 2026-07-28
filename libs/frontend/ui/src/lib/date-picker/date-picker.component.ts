import { ChangeDetectionStrategy, Component, forwardRef, input, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import {DateTime, Info} from 'luxon';
import {IconComponent} from '../icon/icon.component';

export interface CalendarDay {
  date: DateTime;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'ct-date-picker',
  standalone: true,
  imports: [OverlayModule, IconComponent],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ct-date-picker--open]': 'isOpen()',
    '[class.ct-date-picker--disabled]': 'isDisabled()'
  }
})
export class DatePickerComponent implements ControlValueAccessor {
  readonly label = input<string>();
  readonly placeholder = input<string>('Выберите дату...');
  readonly format = input<string>('dd.MM.yyyy');

  readonly value = signal<DateTime | null>(null);
  readonly isOpen = signal<boolean>(false);
  readonly isDisabled = signal<boolean>(false);

  readonly activeMonth = signal<DateTime>(DateTime.now().startOf('month'));

  readonly weekDays = Info.weekdays('short', { locale: 'ru' })

  private onChange: (value: DateTime | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly displayValue = computed(() => {
    const val = this.value();
    return val ? val.toFormat(this.format()) : '';
  });


  writeValue(val: DateTime | string | null): void {
    if (!val) {
      this.value.set(null);
      return;
    }

    const parsed = typeof val === 'string' ? DateTime.fromISO(val) : val;
    if (parsed.isValid) {
      this.value.set(parsed);
      this.activeMonth.set(parsed.startOf('month'));
    } else {
      this.value.set(null);
    }
  }

  registerOnChange(fn: (value: DateTime | null) => void): void {
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
    this.isOpen() ? this.close() : this.open();
  }

  open(): void {
    if (this.isDisabled()) return;
    if (this.value()) {
      this.activeMonth.set(this.value()!.startOf('month'));
    }
    this.isOpen.set(true);
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  selectDate(day: CalendarDay): void {
    if (day.isDisabled) return;

    this.value.set(day.date);
    this.onChange(day.date);
    this.close();
  }

  prevMonth(): void {
    this.activeMonth.update(m => m.minus({ months: 1 }));
  }

  nextMonth(): void {
    this.activeMonth.update(m => m.plus({ months: 1 }));
  }

  readonly calendarGrid = computed<CalendarDay[]>(() => {
    const monthStart = this.activeMonth().startOf('month');
    const monthEnd = this.activeMonth().endOf('month');

    let cursor = monthStart.startOf('week');
    const gridEnd = monthEnd.endOf('week');

    const days: CalendarDay[] = [];
    const today = DateTime.now().startOf('day');
    const selected = this.value()?.startOf('day');

    while (cursor <= gridEnd) {
      const currentDay = cursor.startOf('day');

      days.push({
        date: currentDay,
        isCurrentMonth: currentDay.hasSame(monthStart, 'month'),
        isToday: currentDay.hasSame(today, 'day'),
        isSelected: selected ? currentDay.hasSame(selected, 'day') : false,
        isDisabled: false
      });

      cursor = cursor.plus({ days: 1 });
    }

    return days;
  });
}
