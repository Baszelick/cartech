import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

@Component({
  selector: 'ct-image-logo',
  imports: [],
  templateUrl: './image-logo.component.html',
  styleUrl: './image-logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageLogoComponent {
  /** Размер логотипа (квадрат). По умолчанию 48px */
  readonly size = input<number | string>(48);

  /** Цвет фона контейнера */
  readonly backgroundColor = input<string>('transparent');

  /** Цвет самой картинки (через CSS mask) */
  readonly imageColor = input<string>('#ffffff');

  /** Радиус скругления */
  readonly borderRadius = input<number | string>('0px');

  /** Путь к изображению */
  readonly imageSrc = '/images/logo.png'

  readonly containerStyle = computed(() => {
    const s = this.size();
    const sizePx = typeof s === 'number' ? `${s}px` : s;
    const br = this.borderRadius();
    const borderRadiusPx = typeof br === 'number' ? `${br}px` : br;

    return {
      width: sizePx,
      height: sizePx,
      'background-color': this.backgroundColor(),
      'border-radius': borderRadiusPx,
    };
  });

  readonly maskStyle = computed(() => ({
    'background-color': this.imageColor(),
    'mask-image': `url("${this.imageSrc}")`,
    '-webkit-mask-image': `url("${this.imageSrc}")`,
  }));
}
