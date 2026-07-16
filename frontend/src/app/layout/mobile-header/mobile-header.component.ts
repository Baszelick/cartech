import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'app-mobile-header',
  imports: [],
  templateUrl: './mobile-header.component.html',
  styleUrl: './mobile-header.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileHeaderComponent {

}
