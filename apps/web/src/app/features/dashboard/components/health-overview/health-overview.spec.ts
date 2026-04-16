import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthOverview } from './health-overview';
import { provideRouter } from '@angular/router';

describe('HealthOverview', () => {
  let component: HealthOverview;
  let fixture: ComponentFixture<HealthOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthOverview],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthOverview);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
