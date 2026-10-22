import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ViewRouteComponent } from './view-route.component';

describe('ViewRouteComponent', () => {
  let component: ViewRouteComponent;
  let fixture: ComponentFixture<ViewRouteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewRouteComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
