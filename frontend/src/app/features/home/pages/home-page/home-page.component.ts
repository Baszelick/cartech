import { ChangeDetectionStrategy, Component } from '@angular/core';
import {LoginFormComponent} from '../../../auth/components/login-form/login-form.component';

@Component({
  selector: 'app-home-page',
  imports: [
    LoginFormComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {

}
