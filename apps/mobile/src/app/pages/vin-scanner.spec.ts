import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VinScanner } from './vin-scanner';

describe('VinScanner', () => {
  let component: VinScanner;
  let fixture: ComponentFixture<VinScanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VinScanner],
    }).compileComponents();

    fixture = TestBed.createComponent(VinScanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
