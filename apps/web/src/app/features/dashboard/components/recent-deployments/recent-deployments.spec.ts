import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentDeployments } from './recent-deployments';

describe('RecentDeployments', () => {
  let component: RecentDeployments;
  let fixture: ComponentFixture<RecentDeployments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentDeployments],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentDeployments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
