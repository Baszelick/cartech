import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'ct-form-field',
  imports: [],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
  readonly label = input<string>();
  readonly required = input(false);
  readonly hint = input<string>();
  readonly error = input<string>();
}
