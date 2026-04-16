import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCardComponent } from './service-card';

describe('ServiceCardComponent', () => {
  let component: ServiceCardComponent;
  let fixture: ComponentFixture<ServiceCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    fixture.componentRef.setInput('services', []);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
