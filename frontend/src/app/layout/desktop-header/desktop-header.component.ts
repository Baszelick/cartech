import {ChangeDetectionStrategy, Component} from '@angular/core';
import {InputComponent} from '../../ui/input/input.component';
import {IconComponent} from '../../ui/icon/icon.component';
import {DatePickerComponent} from '../../ui/date-picker/date-picker.component';

@Component({
  selector: 'app-desktop-header',
  imports: [
    InputComponent,
    IconComponent,
    DatePickerComponent
  ],
  templateUrl: './desktop-header.component.html',
  styleUrl: './desktop-header.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesktopHeaderComponent {

}
