import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-workspace',
  imports: [
    RouterOutlet
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceComponent {

}
