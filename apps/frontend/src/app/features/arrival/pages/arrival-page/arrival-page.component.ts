import { ChangeDetectionStrategy, Component } from '@angular/core';
import {TextareaComponent} from "../../../../ui/textarea/textarea.component";

@Component({
  selector: 'app-arrival.svg-page',
    imports: [
        TextareaComponent
    ],
  templateUrl: './arrival-page.component.html',
  styleUrl: './arrival-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArrivalPageComponent {

}
