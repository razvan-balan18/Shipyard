import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentDeploymentsComponent } from './recent-deployments';
import { provideRouter } from '@angular/router';

describe('RecentDeployments', () => {
  let component: RecentDeploymentsComponent;
  let fixture: ComponentFixture<RecentDeploymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentDeploymentsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentDeploymentsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('deployments', []);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
