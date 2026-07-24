import { ChangeDetectionStrategy, Component } from '@angular/core';
import {ImageLogoComponent} from '../../../../ui/image-logo/image-logo.component';
import {InputComponent} from '../../../../ui/input/input.component';
import {IconComponent} from '../../../../ui/icon/icon.component';
import {CheckboxComponent} from '../../../../ui/checkbox/checkbox.component';
import {ButtonComponent} from '../../../../ui/button/button.component';

@Component({
  selector: 'app-login-form',
  imports: [
    ImageLogoComponent,
    InputComponent,
    IconComponent,
    CheckboxComponent,
    ButtonComponent
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginFormComponent {

}
