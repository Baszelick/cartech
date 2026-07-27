import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {DesktopHeaderComponent} from '../desktop-header/desktop-header.component';
import {SidebarComponent} from '../sidebar/sidebar.component';
import {WorkspaceComponent} from '../workspace/workspace.component';
import {ControlCenterComponent} from '../control-center/control-center.component';
import {BottomNavigationComponent} from '../bottom-navigation/bottom-navigation.component';
import {LayoutService} from '../../core/services/layout.service';
import {MobileHeaderComponent} from '../mobile-header/mobile-header.component';

@Component({
  selector: 'app-shell',
  imports: [
    DesktopHeaderComponent,
    SidebarComponent,
    WorkspaceComponent,
    ControlCenterComponent,
    BottomNavigationComponent,
    MobileHeaderComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  layout = inject(LayoutService)

}
