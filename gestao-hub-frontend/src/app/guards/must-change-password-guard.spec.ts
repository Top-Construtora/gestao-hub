import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MustChangePasswordGuard } from './must-change-password-guard';

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    guard = TestBed.inject(MustChangePasswordGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
