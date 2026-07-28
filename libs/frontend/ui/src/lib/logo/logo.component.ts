import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {LogoTheme, LogoVariant} from "./logo.types";

@Component({
  selector: 'ct-logo',
  imports: [],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoComponent {
  readonly variant = input<LogoVariant>('full');

  readonly theme = input<LogoTheme>('default');

  readonly height = input<number | string>(32);

  readonly logoSrc = computed(() => {
    const variantVal = this.variant();
    const themeVal = this.theme();

    if (variantVal === 'icon') {
      if (themeVal === 'mono-black') return 'brand/icon-mono-black.svg';
      if (themeVal === 'mono-white') return 'brand/icon-mono-white.svg';
      return 'brand/logo.svg';
    }

    if (variantVal === 'raw') {
      return 'brand/logo-raw.svg';
    }

    switch (themeVal) {
      case 'light':
        return 'brand/logo-full-light.svg';
      case 'mono-black':
        return 'brand/logo-full-mono-black.svg';
      case 'mono-white':
        return 'brand/logo-full-mono-white.svg';
      default:
        return 'brand/logo-full-light.svg';
    }
  });
}
