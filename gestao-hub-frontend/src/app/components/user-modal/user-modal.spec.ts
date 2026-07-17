import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { UserModal } from './user-modal';

describe('UserModal', () => {
  let component: UserModal;
  let fixture: ComponentFixture<UserModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserModal],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), provideToastr()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
