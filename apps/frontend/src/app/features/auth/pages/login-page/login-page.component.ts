import { ChangeDetectionStrategy, Component } from '@angular/core';
import {LoginFormComponent} from '../../components/login-form/login-form.component';

@Component({
  selector: 'app-login-page',
  imports: [
    LoginFormComponent
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {

}
