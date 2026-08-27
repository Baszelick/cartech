import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContextSelect } from './context-select';

describe('ContextSelect', () => {
  let component: ContextSelect;
  let fixture: ComponentFixture<ContextSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(ContextSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
