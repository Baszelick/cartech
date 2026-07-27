import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {IconName} from './icon.types';
import {ICON_PATHS} from './icon.config';

@Component({
  selector: 'ct-icon',
  imports: [],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  readonly name = input.required<IconName>()
  readonly size = input(20)
  readonly color = input('currentColor')
  readonly path = computed(() => ICON_PATHS[this.name()])
}
