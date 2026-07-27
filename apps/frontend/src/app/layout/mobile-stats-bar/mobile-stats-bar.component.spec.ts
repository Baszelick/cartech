import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileStatsBarComponent } from './mobile-stats-bar.component';

describe('MobileStatsBarComponent', () => {
  let component: MobileStatsBarComponent;
  let fixture: ComponentFixture<MobileStatsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileStatsBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileStatsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
