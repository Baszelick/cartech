import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ct-company-page',
  imports: [],
  templateUrl: './company-page.html',
  styleUrl: './company-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyPage {}
