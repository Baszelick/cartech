import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-admin-page',
  imports: [],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {}
