import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ct-admin-page',
  imports: [],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {}
