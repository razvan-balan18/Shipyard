import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCardComponent } from './service-card';
import { provideRouter } from '@angular/router';
import { ServiceSummary } from '@shipyard/shared';

describe('ServiceCardComponent', () => {
  let component: ServiceCardComponent;
  let fixture: ComponentFixture<ServiceCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    const mockService: ServiceSummary = {
      id: '1',
      name: 'web-app',
      displayName: 'Web App',
      repositoryUrl: 'https://github.com/shipyard/web',
      environments: [],
      lastDeployment: null,
    };

    fixture.componentRef.setInput('service', mockService);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
