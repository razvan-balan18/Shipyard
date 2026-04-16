import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentDeploymentsComponent } from './recent-deployments';

describe('RecentDeployments', () => {
  let component: RecentDeploymentsComponent;
  let fixture: ComponentFixture<RecentDeploymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentDeploymentsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentDeploymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
