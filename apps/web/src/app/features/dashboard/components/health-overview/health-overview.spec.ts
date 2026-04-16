import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthOverview } from './health-overview';

describe('HealthOverview', () => {
  let component: HealthOverview;
  let fixture: ComponentFixture<HealthOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthOverview],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
