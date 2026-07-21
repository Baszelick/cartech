import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArrivalsRowComponent } from './arrivals-row.component';

describe('ArrivalsRowComponent', () => {
  let component: ArrivalsRowComponent;
  let fixture: ComponentFixture<ArrivalsRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArrivalsRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArrivalsRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
